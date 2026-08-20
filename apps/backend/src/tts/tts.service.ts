import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    Optional,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TtsAudioStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TTS_QUEUE } from '../queue/queue.module';

export interface TtsJobData {
    chapterId: string;
}

export interface TtsStatusResult {
    /** Tính năng có bật trên server không (TTS_WORKER_URL đã set). */
    enabled: boolean;
    status: TtsAudioStatus | null;
    url: string | null;
}

/**
 * Sinh audio AI cho chương truyện qua VieNeu-TTS worker (services/tts-worker).
 *
 * Luồng: user bấm "Tạo giọng đọc AI" → requestGeneration() đặt PENDING + đẩy
 * job BullMQ → TtsProcessor gọi generateNow(): POST text sang worker Python,
 * nhận MP3, upload lên storage (Garage ưu tiên) rồi lưu ttsAudioUrl. Audio chỉ
 * sinh MỘT lần mỗi chương (cache vĩnh viễn); FAILED thì cho yêu cầu lại.
 *
 * Chỉ áp dụng cho chương MIỄN PHÍ đã xuất bản — URL audio là public, sinh cho
 * chương trả phí sẽ thành đường vòng qua paywall.
 */
@Injectable()
export class TtsService {
    private readonly logger = new Logger(TtsService.name);
    private readonly workerUrl: string;
    private readonly workerApiKey: string;
    private readonly workerVoice: string;
    private readonly workerTimeoutMs: number;
    private readonly queueEnabled: boolean;
    /** Chống double-run khi queue tắt (inline fallback). */
    private readonly inlineRunning = new Set<string>();
    /** Cache danh sách giọng preset từ worker (đổi khi đổi model → cache 1h). */
    private voicesCache: { label: string; id: string; group: string }[] | null = null;
    private voicesCacheAt = 0;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly cloudinaryService: CloudinaryService,
        @Optional() @InjectQueue(TTS_QUEUE) private readonly ttsQueue?: Queue,
    ) {
        this.workerUrl = (this.configService.get<string>('TTS_WORKER_URL') || '').replace(/\/$/, '');
        this.workerApiKey = this.configService.get<string>('TTS_WORKER_API_KEY') || '';
        this.workerVoice = this.configService.get<string>('TTS_WORKER_VOICE') || '';
        // Chương dài sinh nhiều phút trên CPU — mặc định chờ tối đa 20 phút.
        this.workerTimeoutMs = parseInt(
            this.configService.get<string>('TTS_WORKER_TIMEOUT_MS') || '',
            10,
        ) || 20 * 60_000;
        this.queueEnabled = !!this.configService.get<string>('REDIS_URL') && !!this.ttsQueue;

        if (this.enabled) {
            this.logger.log(`VieNeu-TTS worker configured at ${this.workerUrl}`);
        }
    }

    get enabled(): boolean {
        return !!this.workerUrl;
    }

    /** Trạng thái audio AI của chương — public, frontend poll trong lúc chờ. */
    async getStatus(chapterId: string): Promise<TtsStatusResult> {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            select: { ttsAudioUrl: true, ttsAudioStatus: true, isPublished: true },
        });
        if (!chapter || !chapter.isPublished) {
            throw new NotFoundException('Chương không tồn tại');
        }
        return {
            enabled: this.enabled,
            status: chapter.ttsAudioStatus,
            url: chapter.ttsAudioUrl,
        };
    }

    /**
     * Yêu cầu sinh audio AI cho chương — CHỈ tác giả truyện hoặc admin
     * (audio dùng chung cho mọi độc giả nên quyền tạo/tạo lại thuộc về chủ
     * truyện; mỗi job cũng chiếm CPU worker nhiều phút). Idempotent: đang
     * chờ/đang chạy thì trả trạng thái hiện tại; đã READY thì sinh LẠI
     * (dùng khi tác giả vừa đổi giọng).
     */
    async requestGeneration(
        chapterId: string,
        user?: { id: string; role?: string },
    ): Promise<TtsStatusResult> {
        if (!this.enabled) {
            throw new ServiceUnavailableException(
                'Tính năng giọng đọc AI chưa được bật trên máy chủ',
            );
        }

        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            select: {
                id: true,
                isPublished: true,
                price: true,
                audioUrl: true,
                ttsAudioUrl: true,
                ttsAudioStatus: true,
                story: { select: { accessType: true, price: true, authorId: true } },
            },
        });
        if (!chapter || !chapter.isPublished) {
            throw new NotFoundException('Chương không tồn tại');
        }
        const isOwner =
            !!user && (user.id === chapter.story.authorId || user.role === 'ADMIN');
        if (!isOwner) {
            throw new ForbiddenException(
                'Chỉ tác giả truyện mới tạo được giọng đọc AI cho chương',
            );
        }
        if (chapter.audioUrl) {
            throw new BadRequestException('Chương đã có audio do tác giả tải lên');
        }
        // Chương/truyện trả phí: audio AI là URL public → không sinh.
        const isPaid =
            (chapter.story.accessType === 'VIP' && chapter.story.price > 0) ||
            (chapter.story.accessType === 'FREEMIUM' && chapter.price > 0);
        if (isPaid) {
            throw new BadRequestException('Chương trả phí không hỗ trợ giọng đọc AI');
        }

        // Atomic claim: 2 request cùng lúc thì chỉ 1 job được tạo. READY cũng
        // claim được (sinh lại bằng giọng mới — caller đã là tác giả/admin);
        // PENDING/PROCESSING thì không ai chen được.
        const claimableStatuses: (TtsAudioStatus | null)[] = [
            null,
            TtsAudioStatus.FAILED,
            TtsAudioStatus.READY,
        ];
        const claimed = await this.prisma.chapter.updateMany({
            where: {
                id: chapterId,
                OR: claimableStatuses.map((s) => ({ ttsAudioStatus: s })),
            },
            data: { ttsAudioStatus: TtsAudioStatus.PENDING },
        });

        if (claimed.count > 0) {
            if (this.queueEnabled && this.ttsQueue) {
                // jobId phải unique (kèm timestamp): BullMQ bỏ qua job trùng id
                // với job completed còn lưu → chặn mất job sinh LẠI. Dedupe
                // thật sự đã nằm ở atomic claim phía trên.
                await this.ttsQueue.add(
                    'generate',
                    { chapterId } satisfies TtsJobData,
                    { jobId: `tts-${chapterId}-${Date.now()}` },
                );
            } else {
                // Không có Redis (dev tối giản) → chạy nền ngay trong process.
                this.runInline(chapterId);
            }
        }

        return this.getStatus(chapterId);
    }

    private runInline(chapterId: string) {
        if (this.inlineRunning.has(chapterId)) return;
        this.inlineRunning.add(chapterId);
        this.generateNow(chapterId)
            .catch((err) =>
                this.logger.error(`Inline TTS generation failed for ${chapterId}: ${err.message}`),
            )
            .finally(() => this.inlineRunning.delete(chapterId));
    }

    /**
     * Thực thi job: gọi worker → upload MP3 → lưu URL. Được TtsProcessor gọi;
     * ném lỗi để BullMQ retry (trạng thái đã set FAILED trước khi ném).
     */
    async generateNow(chapterId: string): Promise<void> {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            select: {
                id: true,
                title: true,
                content: true,
                ttsAudioStatus: true,
                ttsAudioUrl: true,
                // Giọng của tác giả: clip clone + preset đã chọn.
                story: {
                    select: {
                        author: { select: { ttsVoiceUrl: true, ttsVoicePreset: true } },
                    },
                },
            },
        });
        if (!chapter) return; // chương bị xoá sau khi xếp hàng — bỏ qua
        if (chapter.ttsAudioStatus === TtsAudioStatus.READY && chapter.ttsAudioUrl) return;

        await this.prisma.chapter.update({
            where: { id: chapterId },
            data: { ttsAudioStatus: TtsAudioStatus.PROCESSING },
        });

        try {
            const text = htmlToPlainText(chapter.content);
            if (!text) {
                throw new Error('Nội dung chương rỗng sau khi bóc HTML');
            }

            this.logger.log(
                `Generating TTS for chapter ${chapterId} (${text.length} chars)...`,
            );
            const started = Date.now();
            // Giọng: clone của tác giả > preset tác giả chọn > mặc định server.
            const audio = await this.callWorker(text, {
                refAudioUrl: chapter.story.author.ttsVoiceUrl,
                voice: chapter.story.author.ttsVoicePreset,
            });
            this.logger.log(
                `TTS worker returned ${(audio.length / 1024 / 1024).toFixed(1)}MB ` +
                `in ${Math.round((Date.now() - started) / 1000)}s for chapter ${chapterId}`,
            );

            const file = {
                buffer: audio,
                originalname: `tts-${chapterId}.mp3`,
                mimetype: 'audio/mpeg',
                size: audio.length,
            } as Express.Multer.File;
            const url = await this.cloudinaryService.uploadAudio(file, 'chapter-tts');

            await this.prisma.chapter.update({
                where: { id: chapterId },
                data: { ttsAudioUrl: url, ttsAudioStatus: TtsAudioStatus.READY },
            });
        } catch (err) {
            await this.prisma.chapter
                .update({
                    where: { id: chapterId },
                    data: { ttsAudioStatus: TtsAudioStatus.FAILED },
                })
                .catch(() => { });
            throw err;
        }
    }

    /**
     * POST text sang VieNeu-TTS worker, nhận về buffer MP3.
     * refAudioUrl (clone) thắng voice (preset); không có cả hai thì dùng
     * TTS_WORKER_VOICE / giọng mặc định model.
     */
    private async callWorker(
        text: string,
        opts: { refAudioUrl?: string | null; voice?: string | null; timeoutMs?: number } = {},
    ): Promise<Buffer> {
        const voice = opts.voice || this.workerVoice;
        const res = await fetch(`${this.workerUrl}/synthesize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.workerApiKey ? { 'X-Api-Key': this.workerApiKey } : {}),
            },
            body: JSON.stringify({
                text,
                ...(voice ? { voice } : {}),
                ...(opts.refAudioUrl ? { ref_audio_url: opts.refAudioUrl } : {}),
            }),
            signal: AbortSignal.timeout(opts.timeoutMs ?? this.workerTimeoutMs),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`TTS worker HTTP ${res.status}: ${body.slice(0, 500)}`);
        }
        return Buffer.from(await res.arrayBuffer());
    }

    // ------------------------------------------------------------------
    // Mẫu giọng tác giả (voice cloning)
    // ------------------------------------------------------------------

    /** Cài đặt giọng hiện tại của user (clip clone + preset đã chọn). */
    async getVoice(userId: string): Promise<{
        url: string | null;
        preset: string | null;
        enabled: boolean;
    }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { ttsVoiceUrl: true, ttsVoicePreset: true },
        });
        return {
            url: user?.ttsVoiceUrl ?? null,
            preset: user?.ttsVoicePreset ?? null,
            enabled: this.enabled,
        };
    }

    /**
     * Danh sách giọng preset của model (từ worker GET /voices), cache 1h —
     * danh sách chỉ đổi khi đổi model. Worker chưa sẵn sàng thì trả rỗng.
     * Đã sort + gắn `group` theo phong cách: giọng hợp đọc truyện lên đầu,
     * giọng tin tức (khô, không hợp văn truyện) xuống cuối.
     */
    async listVoices(): Promise<{ voices: { label: string; id: string; group: string }[] }> {
        if (!this.enabled) return { voices: [] };
        const now = Date.now();
        if (this.voicesCache && now - this.voicesCacheAt < 60 * 60_000) {
            return { voices: this.voicesCache };
        }
        try {
            const res = await fetch(`${this.workerUrl}/voices`, {
                headers: this.workerApiKey ? { 'X-Api-Key': this.workerApiKey } : {},
                signal: AbortSignal.timeout(15_000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { voices?: { label: string; id: string }[] };
            this.voicesCache = groupAndSortVoices(data.voices || []);
            this.voicesCacheAt = now;
        } catch (err: any) {
            this.logger.warn(`Cannot fetch voice list from worker: ${err.message}`);
            // Không cache lỗi — lần gọi sau thử lại (worker có thể đang nạp model).
            return { voices: this.voicesCache || [] };
        }
        return { voices: this.voicesCache };
    }

    /**
     * Tác giả chọn giọng preset (null = quay về giọng mặc định server).
     * Validate với danh sách từ worker khi có; danh sách rỗng (worker đang
     * khởi động / SDK không hỗ trợ list) thì chấp nhận chuỗi thô.
     */
    async setPreset(userId: string, preset: string | null): Promise<{ preset: string | null }> {
        const value = (preset || '').trim().slice(0, 100) || null;
        if (value) {
            const { voices } = await this.listVoices();
            if (voices.length > 0 && !voices.some((v) => v.id === value)) {
                throw new BadRequestException('Giọng đọc không hợp lệ');
            }
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { ttsVoicePreset: value },
        });
        return { preset: value };
    }

    /**
     * Tác giả tải mẫu giọng (clip 3–10s). Upload lên Garage folder
     * `author-voices` rồi lưu URL vào User.ttsVoiceUrl. Audio AI sinh SAU
     * thời điểm này mới dùng giọng mới; chương đã READY muốn đổi giọng thì
     * tác giả bấm "Tạo lại" ở trang đọc (requestGeneration cho owner).
     */
    async setVoice(userId: string, file: Express.Multer.File): Promise<{ url: string }> {
        const url = await this.cloudinaryService.uploadAudio(file, 'author-voices', userId);
        await this.prisma.user.update({
            where: { id: userId },
            data: { ttsVoiceUrl: url },
        });
        return { url };
    }

    /** Gỡ mẫu giọng — audio AI sinh sau đó quay về giọng mặc định. */
    async deleteVoice(userId: string): Promise<{ url: null }> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { ttsVoiceUrl: null },
        });
        return { url: null };
    }

    /**
     * Nghe thử một giọng với câu ngắn — gọi worker đồng bộ (chỉ vài giây) và
     * trả base64 để tránh đụng response envelope global.
     * - voice truyền vào → nghe thử giọng preset đó (chưa cần lưu).
     * - không truyền → giọng đã cài của user: clone (clip) > preset đã lưu.
     */
    async previewVoice(
        userId: string,
        text?: string,
        voice?: string,
    ): Promise<{ audioBase64: string; mime: string }> {
        if (!this.enabled) {
            throw new ServiceUnavailableException(
                'Tính năng giọng đọc AI chưa được bật trên máy chủ',
            );
        }
        const sample = (text || '').trim().slice(0, 300) ||
            'Xin chào, đây là giọng đọc của tôi. [cười] Chúc bạn nghe truyện vui vẻ.';

        let opts: { refAudioUrl?: string | null; voice?: string | null };
        if (voice) {
            opts = { voice: voice.trim().slice(0, 100) };
        } else {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { ttsVoiceUrl: true, ttsVoicePreset: true },
            });
            if (!user?.ttsVoiceUrl && !user?.ttsVoicePreset) {
                throw new BadRequestException('Bạn chưa tải mẫu giọng hoặc chọn giọng nào');
            }
            opts = { refAudioUrl: user.ttsVoiceUrl, voice: user.ttsVoicePreset };
        }
        // Câu ngắn — 3 phút là quá đủ, tránh giữ request treo 20 phút.
        const audio = await this.callWorker(sample, { ...opts, timeoutMs: 3 * 60_000 });
        return { audioBase64: audio.toString('base64'), mime: 'audio/mpeg' };
    }
}

/**
 * Phân nhóm giọng theo phong cách trong label worker trả về
 * ("Quỳnh Anh — Nữ · Bắc · Phong cách đọc truyện") và sort ổn định:
 * Đọc truyện → Kể chuyện → Tự nhiên → Khác → Tin tức (cuối — không hợp truyện).
 */
export function groupAndSortVoices(
    voices: { label: string; id: string }[],
): { label: string; id: string; group: string }[] {
    const classify = (label: string): { group: string; rank: number } => {
        const l = label.toLowerCase();
        if (l.includes('đọc truyện')) return { group: 'Đọc truyện', rank: 0 };
        if (l.includes('kể chuyện')) return { group: 'Kể chuyện', rank: 1 };
        if (l.includes('tự nhiên')) return { group: 'Tự nhiên', rank: 2 };
        if (l.includes('tin tức')) return { group: 'Tin tức', rank: 4 };
        return { group: 'Khác', rank: 3 };
    };
    return voices
        .map((v, i) => ({ v, i, ...classify(v.label) }))
        .sort((a, b) => a.rank - b.rank || a.i - b.i)
        .map(({ v, group }) => ({ ...v, group }));
}

/** Bóc HTML chương thành text thuần cho TTS (bản server của toPlainText client). */
export function htmlToPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
