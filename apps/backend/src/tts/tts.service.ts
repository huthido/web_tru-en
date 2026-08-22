import { Agent as UndiciAgent } from 'undici';
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
import { createHash } from 'crypto';
import { TtsAudioStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RedisService } from '../redis/redis.service';
import { TTS_QUEUE } from '../queue/queue.module';

export interface TtsJobData {
    chapterId: string;
}

/** Tiến độ audio AI toàn truyện — đếm chương ĐÃ XUẤT BẢN theo trạng thái. */
export interface StoryTtsStatus {
    total: number;
    ready: number;
    pending: number;
    processing: number;
    failed: number;
    /** Chưa ai yêu cầu sinh. */
    none: number;
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
    /**
     * Danh sách worker (TTS_WORKER_URL phân cách bằng dấu phẩy) — mỗi worker
     * là 1 máy CPU riêng, sinh tuần tự; nhiều worker = nhiều chương song song.
     */
    private readonly workerUrls: string[];
    /** Số request đang chạy trên từng worker — chọn worker ít bận nhất. */
    private readonly workerLoad = new Map<string, number>();
    private readonly workerApiKey: string;
    private readonly workerVoice: string;
    private readonly workerTimeoutMs: number;
    /**
     * Node fetch (undici) mặc định ngắt kết nối nếu server không trả header
     * trong 300s (headersTimeout) — worker TTS chỉ trả response sau khi sinh
     * xong cả chương (10–15 phút) nên mọi chương dài đều "fetch failed" đúng
     * 5 phút dù AbortSignal đặt 20 phút. Dispatcher riêng tắt 2 timeout này;
     * thời hạn thực do AbortSignal.timeout quyết định.
     */
    private readonly workerDispatcher = new UndiciAgent({
        headersTimeout: 0,
        bodyTimeout: 0,
    });
    private readonly queueEnabled: boolean;
    /** Tự sinh audio khi chương xuất bản (mặc định bật khi có worker). */
    private readonly autoGenerateEnabled: boolean;
    /** Chống double-run khi queue tắt (inline fallback). */
    private readonly inlineRunning = new Set<string>();
    /** Cache danh sách giọng preset từ worker (đổi khi đổi model → cache 1h). */
    private voicesCache: { label: string; id: string; group: string }[] | null = null;
    private voicesCacheAt = 0;
    /**
     * Cache audio nghe thử trong RAM process (tầng 1, trên Redis): câu mẫu
     * mặc định + 20 giọng preset là dùng chung cho MỌI user — không sinh lại.
     * Cap số entry vì mỗi bản ~100KB base64.
     */
    private readonly previewCache = new Map<string, string>();
    private static readonly PREVIEW_CACHE_MAX = 40;
    private static readonly PREVIEW_REDIS_TTL_SEC = 30 * 24 * 3600;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly cloudinaryService: CloudinaryService,
        @Optional() @InjectQueue(TTS_QUEUE) private readonly ttsQueue?: Queue,
        @Optional() private readonly redis?: RedisService,
    ) {
        this.workerUrls = (this.configService.get<string>('TTS_WORKER_URL') || '')
            .split(',')
            .map((u) => u.trim().replace(/\/$/, ''))
            .filter(Boolean);
        for (const u of this.workerUrls) this.workerLoad.set(u, 0);
        this.workerApiKey = this.configService.get<string>('TTS_WORKER_API_KEY') || '';
        this.workerVoice = this.configService.get<string>('TTS_WORKER_VOICE') || '';
        // Chương dài sinh nhiều phút trên CPU — mặc định chờ tối đa 20 phút.
        this.workerTimeoutMs = parseInt(
            this.configService.get<string>('TTS_WORKER_TIMEOUT_MS') || '',
            10,
        ) || 20 * 60_000;
        this.queueEnabled = !!this.configService.get<string>('REDIS_URL') && !!this.ttsQueue;
        this.autoGenerateEnabled =
            this.enabled && this.configService.get<string>('TTS_AUTO_GENERATE') !== '0';

        if (this.enabled) {
            this.logger.log(
                `VieNeu-TTS ${this.workerUrls.length} worker(s) configured: ${this.workerUrls.join(', ')}`,
            );
        }
    }

    get enabled(): boolean {
        return this.workerUrls.length > 0;
    }

    /** Số worker = số job BullMQ nên chạy song song (TtsProcessor đọc). */
    get workerCount(): number {
        return this.workerUrls.length;
    }

    /** Worker đầu tiên — dùng cho request nhẹ (danh sách giọng). */
    private get workerUrl(): string {
        return this.workerUrls[0] ?? '';
    }

    /** Chọn worker đang ít request nhất (round-robin theo tải). */
    private pickWorker(): string {
        let best = this.workerUrls[0];
        let bestLoad = Infinity;
        for (const u of this.workerUrls) {
            const load = this.workerLoad.get(u) ?? 0;
            if (load < bestLoad) {
                best = u;
                bestLoad = load;
            }
        }
        return best;
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

    /**
     * Sinh audio AI cho CẢ TRUYỆN — xếp hàng mọi chương đủ điều kiện (đã
     * xuất bản, miễn phí, chưa có audio tác giả, chưa/lỗi sinh). Chương đã
     * READY KHÔNG bị sinh lại hàng loạt (tránh đốt hàng giờ CPU — muốn đổi
     * giọng chương nào thì tạo lại từng chương). Chỉ tác giả truyện/admin.
     */
    async requestStoryGeneration(
        storyIdOrSlug: string,
        user: { id: string; role?: string },
    ): Promise<{ queued: number } & StoryTtsStatus> {
        if (!this.enabled) {
            throw new ServiceUnavailableException(
                'Tính năng giọng đọc AI chưa được bật trên máy chủ',
            );
        }
        const story = await this.findStoryForTts(storyIdOrSlug, user);
        if (story.accessType === 'VIP' && story.price > 0) {
            throw new BadRequestException('Truyện VIP trả phí không hỗ trợ giọng đọc AI');
        }

        const eligible = await this.prisma.chapter.findMany({
            where: {
                storyId: story.id,
                isPublished: true,
                audioUrl: null,
                OR: [{ ttsAudioStatus: null }, { ttsAudioStatus: TtsAudioStatus.FAILED }],
                // FREEMIUM: bỏ qua chương trả phí; FREE: price bị bỏ qua theo spec.
                ...(story.accessType === 'FREEMIUM' ? { price: 0 } : {}),
            },
            select: { id: true },
            orderBy: { order: 'asc' },
        });

        const queued = await this.claimAndEnqueue(eligible.map((c) => c.id));
        const status = await this.computeStoryStatus(story.id);
        return { queued, ...status };
    }

    /**
     * Claim atomic từng chương (null/FAILED → PENDING) rồi đẩy job — chương
     * đã được xếp hàng ở nơi khác giữa chừng sẽ bị bỏ qua. Trả số job đã tạo.
     */
    /**
     * Ops: xếp lại mọi chương FAILED (+ PROCESSING treo quá `staleMinutes`,
     * thường do worker chết giữa job) của chương miễn phí đã publish.
     * Dùng bởi scripts/tts-requeue-failed.ts. Trả về số chương đã xếp hàng.
     */
    async requeueFailed(
        opts: { limit?: number; staleMinutes?: number; dryRun?: boolean } = {},
    ): Promise<{ failed: number; stale: number; queued: number }> {
        const limit = opts.limit ?? 1000;
        const staleBefore = new Date(Date.now() - (opts.staleMinutes ?? 60) * 60_000);
        const freeStory = {
            OR: [
                { story: { accessType: 'FREE' as const } },
                { story: { accessType: 'VIP' as const, price: { lte: 0 } } },
                { price: 0, story: { accessType: 'FREEMIUM' as const } },
            ],
        };
        const stale = await this.prisma.chapter.findMany({
            where: {
                isPublished: true,
                audioUrl: null,
                ttsAudioStatus: TtsAudioStatus.PROCESSING,
                updatedAt: { lt: staleBefore },
                ...freeStory,
            },
            select: { id: true },
        });
        const failed = await this.prisma.chapter.findMany({
            where: {
                isPublished: true,
                audioUrl: null,
                ttsAudioStatus: TtsAudioStatus.FAILED,
                ...freeStory,
            },
            select: { id: true },
            orderBy: { updatedAt: 'asc' },
            take: limit,
        });
        if (opts.dryRun) return { failed: failed.length, stale: stale.length, queued: 0 };
        if (stale.length) {
            await this.prisma.chapter.updateMany({
                where: {
                    id: { in: stale.map((c) => c.id) },
                    ttsAudioStatus: TtsAudioStatus.PROCESSING,
                },
                data: { ttsAudioStatus: TtsAudioStatus.FAILED },
            });
        }
        const ids = [...stale.map((c) => c.id), ...failed.map((c) => c.id)].slice(0, limit);
        const queued = await this.claimAndEnqueue(ids);
        return { failed: failed.length, stale: stale.length, queued };
    }

    private async claimAndEnqueue(chapterIds: string[]): Promise<number> {
        let queued = 0;
        for (const id of chapterIds) {
            const claimed = await this.prisma.chapter.updateMany({
                where: {
                    id,
                    OR: [{ ttsAudioStatus: null }, { ttsAudioStatus: TtsAudioStatus.FAILED }],
                },
                data: { ttsAudioStatus: TtsAudioStatus.PENDING },
            });
            if (claimed.count === 0) continue;
            if (this.queueEnabled && this.ttsQueue) {
                await this.ttsQueue.add(
                    'generate',
                    { chapterId: id } satisfies TtsJobData,
                    { jobId: `tts-${id}-${Date.now()}` },
                );
            } else {
                this.runInline(id);
            }
            queued++;
        }
        return queued;
    }

    // ------------------------------------------------------------------
    // Tự động sinh khi chương được XUẤT BẢN — độc giả không phải đợi.
    // Hook từ ChaptersService (publish/update/cron hẹn giờ) và
    // ApprovalsService (duyệt truyện auto-publish chương). Fire-and-forget:
    // lỗi chỉ log, không chặn luồng publish. Tắt bằng TTS_AUTO_GENERATE=0.
    // ------------------------------------------------------------------

    autoGenerateForChapter(chapterId: string): void {
        if (!this.autoGenerateEnabled) return;
        this.autoGenerate({ id: chapterId }).catch((err) =>
            this.logger.warn(`Auto TTS for chapter ${chapterId} failed: ${err.message}`),
        );
    }

    autoGenerateForStory(storyId: string): void {
        if (!this.autoGenerateEnabled) return;
        this.autoGenerate({ storyId }).catch((err) =>
            this.logger.warn(`Auto TTS for story ${storyId} failed: ${err.message}`),
        );
    }

    private async autoGenerate(target: { id?: string; storyId?: string }): Promise<void> {
        const eligible = await this.prisma.chapter.findMany({
            where: {
                ...target,
                isPublished: true,
                audioUrl: null,
                // Auto chỉ sinh LẦN ĐẦU (status null). FAILED không tự retry —
                // tránh vòng lặp đốt CPU khi một chương lỗi hệ thống; tác giả
                // bấm thử lại thủ công ở trang quản lý chương.
                ttsAudioStatus: null,
                // Chỉ chương miễn phí (audio là URL public).
                OR: [
                    { story: { accessType: 'FREE' } },
                    { story: { accessType: 'VIP', price: { lte: 0 } } },
                    { price: 0, story: { accessType: 'FREEMIUM' } },
                ],
            },
            select: { id: true },
            orderBy: { order: 'asc' },
            take: 500, // trần an toàn khi import truyện cực dài
        });
        if (eligible.length === 0) return;
        const queued = await this.claimAndEnqueue(eligible.map((c) => c.id));
        if (queued > 0) {
            this.logger.log(`Auto-queued TTS for ${queued} freshly published chapter(s)`);
        }
    }

    /** Tiến độ audio AI của truyện (đếm theo trạng thái) — tác giả/admin. */
    async getStoryStatus(
        storyIdOrSlug: string,
        user: { id: string; role?: string },
    ): Promise<StoryTtsStatus> {
        const story = await this.findStoryForTts(storyIdOrSlug, user);
        return this.computeStoryStatus(story.id);
    }

    private async findStoryForTts(
        storyIdOrSlug: string,
        user: { id: string; role?: string },
    ) {
        const story = await this.prisma.story.findFirst({
            where: { OR: [{ id: storyIdOrSlug }, { slug: storyIdOrSlug }] },
            select: { id: true, authorId: true, accessType: true, price: true },
        });
        if (!story) throw new NotFoundException('Truyện không tồn tại');
        const isOwner = user.id === story.authorId || user.role === 'ADMIN';
        if (!isOwner) {
            throw new ForbiddenException('Chỉ tác giả truyện mới dùng được chức năng này');
        }
        return story;
    }

    // ------------------------------------------------------------------
    // Admin: theo dõi hàng chờ TTS
    // ------------------------------------------------------------------

    /** Thống kê toàn bộ chương theo trạng thái TTS. */
    async getAdminStats() {
        const groups = await this.prisma.chapter.groupBy({
            by: ['ttsAudioStatus'],
            _count: { _all: true },
        });
        const count = (s: TtsAudioStatus | null) =>
            groups.find((g) => g.ttsAudioStatus === s)?._count._all ?? 0;
        const total = groups.reduce((sum, g) => sum + g._count._all, 0);
        return {
            enabled: this.enabled,
            queueEnabled: this.queueEnabled,
            workerCount: this.workerUrls.length,
            total,
            ready: count(TtsAudioStatus.READY),
            pending: count(TtsAudioStatus.PENDING),
            processing: count(TtsAudioStatus.PROCESSING),
            failed: count(TtsAudioStatus.FAILED),
            none: count(null),
        };
    }

    /** Danh sách chương đang chờ / đang xử lý / lỗi — admin theo dõi hàng chờ. */
    async getAdminQueue(opts: {
        status?: string;
        page?: number;
        limit?: number;
        search?: string;
    }) {
        const page = Math.max(1, opts.page || 1);
        const limit = Math.min(100, Math.max(1, opts.limit || 30));
        const where: any = {};
        if (opts.status) {
            where.ttsAudioStatus = opts.status as TtsAudioStatus;
        } else {
            // Mặc định: chỉ hiện pending + processing + failed
            where.ttsAudioStatus = { in: [TtsAudioStatus.PENDING, TtsAudioStatus.PROCESSING, TtsAudioStatus.FAILED] };
        }
        if (opts.search) {
            where.OR = [
                { title: { contains: opts.search, mode: 'insensitive' } },
                { story: { title: { contains: opts.search, mode: 'insensitive' } } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.chapter.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    ttsAudioStatus: true,
                    ttsAudioUrl: true,
                    ttsVoiceName: true,
                    order: true,
                    isPublished: true,
                    createdAt: true,
                    story: {
                        select: { id: true, title: true, slug: true, authorId: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.chapter.count({ where }),
        ]);
        return { items, total, page, limit, pages: Math.ceil(total / limit) };
    }

    /** Admin: xoá audio TTS của chương (để tạo lại). */
    async adminResetChapterTts(chapterId: string) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            select: { id: true, ttsAudioStatus: true },
        });
        if (!chapter) throw new NotFoundException('Chương không tồn tại');
        await this.prisma.chapter.update({
            where: { id: chapterId },
            data: { ttsAudioStatus: null, ttsAudioUrl: null, ttsVoiceName: null },
        });
        return { ok: true };
    }

    private async computeStoryStatus(storyId: string): Promise<StoryTtsStatus> {
        const groups = await this.prisma.chapter.groupBy({
            by: ['ttsAudioStatus'],
            where: { storyId, isPublished: true },
            _count: { _all: true },
        });
        const count = (s: TtsAudioStatus | null) =>
            groups.find((g) => g.ttsAudioStatus === s)?._count._all ?? 0;
        const total = groups.reduce((sum, g) => sum + g._count._all, 0);
        return {
            total,
            ready: count(TtsAudioStatus.READY),
            pending: count(TtsAudioStatus.PENDING),
            processing: count(TtsAudioStatus.PROCESSING),
            failed: count(TtsAudioStatus.FAILED),
            none: count(null),
        };
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

        // Xác định tên giọng để hiển thị khi đang tạo.
        const voiceName = await this.resolveVoiceName(
            chapter.story.author.ttsVoiceUrl,
            chapter.story.author.ttsVoicePreset,
        );

        await this.prisma.chapter.update({
            where: { id: chapterId },
            data: { ttsAudioStatus: TtsAudioStatus.PROCESSING, ttsVoiceName: voiceName },
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
        const timeoutMs = opts.timeoutMs ?? this.workerTimeoutMs;
        const workerUrl = this.pickWorker();
        this.workerLoad.set(workerUrl, (this.workerLoad.get(workerUrl) ?? 0) + 1);
        try {
            return await this.callWorkerAt(workerUrl, text, voice, opts.refAudioUrl, timeoutMs);
        } finally {
            this.workerLoad.set(workerUrl, Math.max(0, (this.workerLoad.get(workerUrl) ?? 1) - 1));
        }
    }

    private async callWorkerAt(
        workerUrl: string,
        text: string,
        voice: string,
        refAudioUrl: string | null | undefined,
        timeoutMs: number,
    ): Promise<Buffer> {
        const res = await fetch(`${workerUrl}/synthesize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.workerApiKey ? { 'X-Api-Key': this.workerApiKey } : {}),
                // Worker bỏ dở giữa chừng khi quá hạn — tránh sinh tiếp audio
                // mà backend đã không còn chờ (lãng phí CPU, dồn hàng chờ).
                'X-Timeout-Ms': String(timeoutMs),
            },
            body: JSON.stringify({
                text,
                ...(voice ? { voice } : {}),
                ...(refAudioUrl ? { ref_audio_url: refAudioUrl } : {}),
            }),
            signal: AbortSignal.timeout(timeoutMs),
            dispatcher: this.workerDispatcher,
        } as RequestInit);
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`TTS worker ${workerUrl} HTTP ${res.status}: ${body.slice(0, 500)}`);
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

    /** Resolve tên giọng đọc từ voice settings của tác giả. */
    private async resolveVoiceName(
        voiceUrl: string | null | undefined,
        voicePreset: string | null | undefined,
    ): Promise<string> {
        if (voiceUrl) return 'Giọng clone của tác giả';
        if (voicePreset) {
            try {
                const list = await this.listVoices();
                const found = list.voices.find((v) => v.id === voicePreset);
                return found?.label || voicePreset;
            } catch {
                return voicePreset;
            }
        }
        return 'Giọng mặc định';
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

        // Cache theo (text, giọng, clip): câu mẫu mặc định + giọng preset là
        // chung cho mọi user; clip clone đổi URL khi upload mới → key mới.
        const cacheKey =
            'tts:preview:' +
            createHash('sha256')
                .update(JSON.stringify({
                    t: sample,
                    v: opts.voice || this.workerVoice || '',
                    r: opts.refAudioUrl || '',
                }))
                .digest('hex');

        const memHit = this.previewCache.get(cacheKey);
        if (memHit) return { audioBase64: memHit, mime: 'audio/mpeg' };

        const redisHit = await this.redis?.get(cacheKey);
        if (redisHit) {
            this.rememberPreview(cacheKey, redisHit);
            return { audioBase64: redisHit, mime: 'audio/mpeg' };
        }

        // Câu ngắn — 3 phút là quá đủ, tránh giữ request treo 20 phút.
        const audio = await this.callWorker(sample, { ...opts, timeoutMs: 3 * 60_000 });
        const audioBase64 = audio.toString('base64');
        this.rememberPreview(cacheKey, audioBase64);
        await this.redis?.set(cacheKey, audioBase64, TtsService.PREVIEW_REDIS_TTL_SEC);
        return { audioBase64, mime: 'audio/mpeg' };
    }

    private rememberPreview(key: string, audioBase64: string): void {
        // Cap đơn giản: đầy thì bỏ entry cũ nhất (Map giữ thứ tự insert).
        if (this.previewCache.size >= TtsService.PREVIEW_CACHE_MAX) {
            const oldest = this.previewCache.keys().next().value;
            if (oldest) this.previewCache.delete(oldest);
        }
        this.previewCache.set(key, audioBase64);
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
