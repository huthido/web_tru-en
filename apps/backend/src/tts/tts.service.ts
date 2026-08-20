import {
    BadRequestException,
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
     * User yêu cầu sinh audio AI cho chương. Idempotent: đang chờ/đang chạy/
     * đã xong thì trả trạng thái hiện tại thay vì tạo job mới.
     */
    async requestGeneration(chapterId: string): Promise<TtsStatusResult> {
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
                story: { select: { accessType: true, price: true } },
            },
        });
        if (!chapter || !chapter.isPublished) {
            throw new NotFoundException('Chương không tồn tại');
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

        // Atomic claim: chỉ chuyển sang PENDING khi đang null hoặc FAILED —
        // 2 user bấm cùng lúc thì chỉ 1 job được tạo.
        const claimed = await this.prisma.chapter.updateMany({
            where: {
                id: chapterId,
                OR: [{ ttsAudioStatus: null }, { ttsAudioStatus: TtsAudioStatus.FAILED }],
            },
            data: { ttsAudioStatus: TtsAudioStatus.PENDING },
        });

        if (claimed.count > 0) {
            if (this.queueEnabled && this.ttsQueue) {
                await this.ttsQueue.add(
                    'generate',
                    { chapterId } satisfies TtsJobData,
                    { jobId: `tts-${chapterId}` }, // dedupe theo chương
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
            select: { id: true, title: true, content: true, ttsAudioStatus: true, ttsAudioUrl: true },
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
            const audio = await this.callWorker(text);
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

    /** POST text sang VieNeu-TTS worker, nhận về buffer MP3. */
    private async callWorker(text: string): Promise<Buffer> {
        const res = await fetch(`${this.workerUrl}/synthesize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.workerApiKey ? { 'X-Api-Key': this.workerApiKey } : {}),
            },
            body: JSON.stringify({
                text,
                ...(this.workerVoice ? { voice: this.workerVoice } : {}),
            }),
            signal: AbortSignal.timeout(this.workerTimeoutMs),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`TTS worker HTTP ${res.status}: ${body.slice(0, 500)}`);
        }
        return Buffer.from(await res.arrayBuffer());
    }
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
