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
import { Prisma, TtsAudioStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RedisService } from '../redis/redis.service';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import { TTS_QUEUE } from '../queue/queue.module';

/** Một mức giá gói giọng đọc AI: `months` tháng (30 ngày/tháng) giá `coins` xu. */
export interface TtsSubscriptionPlan {
    months: number;
    coins: number;
}

/** Trạng thái gói tháng giọng đọc AI của một tác giả. */
export interface TtsSubscriptionInfo {
    /** Bảng giá admin đặt, sắp theo số tháng tăng dần; rỗng = miễn phí. */
    plans: TtsSubscriptionPlan[];
    /** Số ngày của 1 "tháng" gói (30). */
    daysPerMonth: number;
    /** User này có bắt buộc phải có gói mới tạo audio không (có bảng giá, không phải admin). */
    required: boolean;
    /** Còn hạn. */
    active: boolean;
    expiresAt: string | null;
}

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
    /**
     * Thời điểm worker báo lỗi KẾT NỐI gần nhất (không tính timeout — worker
     * chậm vẫn là worker sống). Trong `workerCooldownMs` sau đó nó bị loại
     * khỏi vòng chọn: pool có thể gồm máy không phải lúc nào cũng bật (laptop
     * ngủ, máy nhà mất điện), mà không có cờ này thì mỗi worker chết vẫn hút
     * 1/N số job rồi bắt từng job chờ /health tới 15 phút mới chịu fail.
     */
    private readonly workerFailedAt = new Map<string, number>();
    private readonly workerApiKey: string;
    private readonly workerVoice: string;
    private readonly workerTimeoutMs: number;
    /**
     * Ký tự tối đa cho MỘT request /synthesize. Chương dài hơn được cắt theo
     * câu thành nhiều phần: phần nào xong là giữ được, và worker recycle giữa
     * hai phần không làm mất gì.
     *
     * Kích thước phần phải vừa với worker CHẬM NHẤT, không phải worker trung
     * bình: mỗi phần chỉ có `TTS_WORKER_TIMEOUT_MS` (20 phút) để xong. Bản
     * 12k ký tự đầu tiên tính theo 23s/chunk, nhưng sau khi tắt ONNX arena
     * vps103 chạy ~55s/chunk → 12k ký tự = 32 chunk = 29 phút, quá hạn: đo
     * 22/08/2026 thấy nó bị huỷ ở chunk 25-30/32 bốn lần liên tiếp, mỗi lần
     * đốt 20 phút CPU mà không ra chương nào (3 chương/3h, trong khi yeuvps
     * 18 và ottovps 13). 6k ký tự = 15 chunk ≈ 14 phút ngay cả trên vps103.
     */
    private readonly workerPartChars: number;
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
    /**
     * Van tắt cứng bằng env `TTS_AUTO_GENERATE=0`. Bật/tắt thật sự nằm ở
     * Settings.ttsAutoGenerateOnPublish (admin chỉnh trong Cài đặt, mặc định TẮT).
     */
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
        private readonly settingsService: SettingsService,
        private readonly walletService: WalletService,
        @Optional() @InjectQueue(TTS_QUEUE) private readonly ttsQueue?: Queue,
        @Optional() private readonly redis?: RedisService,
    ) {
        this.workerUrls = (this.configService.get<string>('TTS_WORKER_URL') || '')
            .split(',')
            .map((u) => u.trim().replace(/\/$/, ''))
            .filter(Boolean)
            // Một mục sai định dạng làm hỏng cả slot: fetch ném TypeError ngay,
            // mà lỗi đó KHÔNG phải "worker vắng mặt" nên job fail luôn thay vì
            // chuyển sang máy khác. Đã dính 22/08/2026 khi dán nhầm cả
            // "TTS_WORKER_URL = " vào ô giá trị trên Coolify.
            .filter((u) => {
                if (/^https?:\/\/[^\s]+$/.test(u)) return true;
                this.logger.error(
                    `TTS_WORKER_URL: bỏ qua mục không hợp lệ "${u}" — mỗi mục phải là một URL http(s), phân cách bằng dấu phẩy`,
                );
                return false;
            });
        for (const u of this.workerUrls) this.workerLoad.set(u, 0);
        this.workerApiKey = this.configService.get<string>('TTS_WORKER_API_KEY') || '';
        this.workerVoice = this.configService.get<string>('TTS_WORKER_VOICE') || '';
        // Chương dài sinh nhiều phút trên CPU — mặc định chờ tối đa 20 phút.
        this.workerTimeoutMs = parseInt(
            this.configService.get<string>('TTS_WORKER_TIMEOUT_MS') || '',
            10,
        ) || 20 * 60_000;
        this.workerPartChars =
            parseInt(this.configService.get<string>('TTS_PART_CHARS') || '', 10) || 6_000;
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

    /**
     * Chọn worker ít request nhất TRONG SỐ worker chưa lỗi gần đây. Tất cả đều
     * đang cooldown (ví dụ vừa deploy, cả stack tắt) thì quay lại chọn trong
     * toàn bộ danh sách để job không đứng im.
     */
    private pickWorker(): string {
        const now = Date.now();
        const healthy = this.workerUrls.filter(
            (u) => now - (this.workerFailedAt.get(u) ?? 0) > this.workerCooldownMs,
        );
        const pool = healthy.length ? healthy : this.workerUrls;
        let best = pool[0];
        let bestLoad = Infinity;
        for (const u of pool) {
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
        // Gói tháng: tác giả chưa có/hết hạn gói (khi admin đặt phí) → chặn
        // TRƯỚC khi claim để trạng thái chương không đổi.
        await this.assertSubscribed(user);
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

        // Gói tháng: kiểm tra trước khi claim — không đủ điều kiện thì không
        // chương nào đổi trạng thái.
        await this.assertSubscribed(user);
        const claimedIds = await this.claimIn(this.prisma, eligible.map((c) => c.id));
        const queued = await this.enqueue(claimedIds);
        const status = await this.computeStoryStatus(story.id);
        return { queued, ...status };
    }

    // ------------------------------------------------------------------
    // GÓI THÁNG giọng đọc AI cho tác giả (Settings.ttsSubscriptionPlans =
    // [{months, coins}], 1 tháng = 30 ngày). Admin miễn; bảng giá rỗng →
    // mọi tác giả dùng tự do. Luồng tự động/ops (auto publish, requeue,
    // admin reset) không đi qua đây.
    // ------------------------------------------------------------------

    /**
     * Bảng giá admin đặt — lọc mức không hợp lệ, gộp trùng số tháng (giữ
     * mức rẻ hơn), sắp theo số tháng tăng dần. Rỗng = miễn phí.
     */
    private async getSubscriptionPlans(): Promise<TtsSubscriptionPlan[]> {
        const settings = await this.settingsService.getSettings();
        const raw = (settings as { ttsSubscriptionPlans?: unknown }).ttsSubscriptionPlans;
        if (!Array.isArray(raw)) return [];
        const byMonths = new Map<number, number>();
        for (const item of raw) {
            const months = Number((item as any)?.months);
            const coins = Number((item as any)?.coins);
            if (!Number.isInteger(months) || months < 1 || months > 36) continue;
            if (!Number.isInteger(coins) || coins < 0) continue;
            const prev = byMonths.get(months);
            if (prev === undefined || coins < prev) byMonths.set(months, coins);
        }
        return [...byMonths.entries()]
            .map(([months, coins]) => ({ months, coins }))
            .sort((a, b) => a.months - b.months);
    }

    /**
     * Trạng thái gói của user: `required` = user này có PHẢI có gói mới được
     * tạo audio không (có bảng giá và không phải admin); `active` = còn hạn.
     */
    async getSubscription(user: { id: string; role?: string }): Promise<TtsSubscriptionInfo> {
        const [plans, u] = await Promise.all([
            this.getSubscriptionPlans(),
            this.prisma.user.findUnique({
                where: { id: user.id },
                select: { ttsSubscriptionExpiresAt: true },
            }),
        ]);
        const expiresAt = u?.ttsSubscriptionExpiresAt ?? null;
        const active = !!expiresAt && expiresAt.getTime() > Date.now();
        return {
            plans,
            daysPerMonth: WalletService.TTS_SUBSCRIPTION_DAYS_PER_MONTH,
            required: plans.length > 0 && user.role !== 'ADMIN',
            active,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
        };
    }

    /**
     * Mua / gia hạn gói `months` tháng theo bảng giá (gia hạn cộng dồn vào
     * hạn còn lại). Admin không bị trừ xu (mua số tháng bất kỳ 1–36).
     */
    async subscribe(
        user: { id: string; role?: string },
        months: number,
    ): Promise<TtsSubscriptionInfo & { charged: number }> {
        if (!this.enabled) {
            throw new ServiceUnavailableException(
                'Tính năng giọng đọc AI chưa được bật trên máy chủ',
            );
        }
        if (!Number.isInteger(months) || months < 1) {
            throw new BadRequestException('Vui lòng chọn gói giọng đọc AI');
        }
        let cost = 0;
        if (user.role !== 'ADMIN') {
            const plans = await this.getSubscriptionPlans();
            if (plans.length === 0) {
                throw new BadRequestException('Giọng đọc AI hiện miễn phí, không cần mua gói');
            }
            const plan = plans.find((p) => p.months === months);
            if (!plan) {
                throw new BadRequestException('Gói giọng đọc AI không tồn tại — tải lại trang để xem bảng giá mới');
            }
            cost = plan.coins;
        }
        const r = await this.walletService.chargeTtsSubscription(user.id, cost, months);
        const info = await this.getSubscription(user);
        return { ...info, charged: r.charged };
    }

    /** Chặn tác giả chưa có gói (khi admin có bảng giá). Admin luôn qua. */
    private async assertSubscribed(user?: { id: string; role?: string }): Promise<void> {
        if (!user || user.role === 'ADMIN') return;
        const sub = await this.getSubscription(user);
        if (sub.required && !sub.active) {
            const cheapest = sub.plans[0];
            const hint = cheapest ? ` (từ ${cheapest.coins} xu/${cheapest.months} tháng)` : '';
            throw new ForbiddenException(
                sub.expiresAt
                    ? `Gói giọng đọc AI của bạn đã hết hạn — gia hạn${hint} để tiếp tục tạo audio`
                    : `Cần đăng ký gói giọng đọc AI${hint} để tự tạo audio cho chương`,
            );
        }
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
        const claimed = await this.claimIn(this.prisma, chapterIds);
        return this.enqueue(claimed);
    }

    /** Claim atomic null/FAILED → PENDING từng chương; trả danh sách id claim được. */
    private async claimIn(
        db: Prisma.TransactionClient | PrismaService,
        chapterIds: string[],
    ): Promise<string[]> {
        const claimed: string[] = [];
        for (const id of chapterIds) {
            const r = await db.chapter.updateMany({
                where: {
                    id,
                    OR: [{ ttsAudioStatus: null }, { ttsAudioStatus: TtsAudioStatus.FAILED }],
                },
                data: { ttsAudioStatus: TtsAudioStatus.PENDING },
            });
            if (r.count > 0) claimed.push(id);
        }
        return claimed;
    }

    /** Đẩy job cho các chương ĐÃ claim (gọi sau khi transaction claim commit). */
    private async enqueue(chapterIds: string[]): Promise<number> {
        for (const id of chapterIds) {
            if (this.queueEnabled && this.ttsQueue) {
                await this.ttsQueue.add(
                    'generate',
                    { chapterId: id } satisfies TtsJobData,
                    { jobId: `tts-${id}-${Date.now()}` },
                );
            } else {
                this.runInline(id);
            }
        }
        return chapterIds.length;
    }

    // ------------------------------------------------------------------
    // Tự động sinh khi chương được XUẤT BẢN — độc giả không phải đợi.
    // Hook từ ChaptersService (publish/update/cron hẹn giờ) và
    // ApprovalsService (duyệt truyện auto-publish chương). Fire-and-forget:
    // lỗi chỉ log, không chặn luồng publish. Chỉ chạy khi admin bật
    // Settings.ttsAutoGenerateOnPublish (mặc định TẮT); env TTS_AUTO_GENERATE=0
    // là van tắt cứng. Luồng này KHÔNG trừ xu tác giả.
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
        if (!(await this.isAutoGenerateOnPublishEnabled())) return;
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

    /** Admin bật "tự tạo giọng AI khi xuất bản" trong Cài đặt chưa? */
    private async isAutoGenerateOnPublishEnabled(): Promise<boolean> {
        const settings = await this.settingsService.getSettings();
        return (settings as { ttsAutoGenerateOnPublish?: boolean }).ttsAutoGenerateOnPublish === true;
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

    /** Điều kiện chương đủ điều kiện sinh audio AI (đã đăng, miễn phí, không có audio tác giả). */
    private eligibleChapterWhere() {
        return {
            isPublished: true,
            audioUrl: null,
            OR: [
                { story: { accessType: 'FREE' as const } },
                { story: { accessType: 'VIP' as const, price: { lte: 0 } } },
                { price: 0, story: { accessType: 'FREEMIUM' as const } },
            ],
        };
    }

    /** Admin: xoá audio TTS của chương rồi xếp hàng tạo lại ngay (nếu đủ điều kiện). */
    async adminResetChapterTts(chapterId: string) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            select: { id: true },
        });
        if (!chapter) throw new NotFoundException('Chương không tồn tại');
        await this.prisma.chapter.update({
            where: { id: chapterId },
            data: { ttsAudioStatus: null, ttsAudioUrl: null, ttsVoiceName: null },
        });
        const eligible = await this.prisma.chapter.findFirst({
            where: { id: chapterId, ...this.eligibleChapterWhere() },
            select: { id: true },
        });
        const queued = eligible ? await this.claimAndEnqueue([chapterId]) : 0;
        return { ok: true, queued };
    }

    /**
     * Admin: xoá & tạo lại HÀNG LOẠT theo đúng bộ lọc của danh sách hàng chờ
     * (status + search). Không truyền status = PENDING/PROCESSING/FAILED như
     * mặc định của danh sách; muốn làm lại chương READY phải chọn rõ status.
     */
    async adminResetBulk(opts: { status?: string; search?: string; limit?: number }) {
        const limit = Math.min(5000, Math.max(1, opts.limit ?? 5000));
        const where: any = {};
        if (opts.status) {
            where.ttsAudioStatus = opts.status as TtsAudioStatus;
        } else {
            where.ttsAudioStatus = {
                in: [TtsAudioStatus.PENDING, TtsAudioStatus.PROCESSING, TtsAudioStatus.FAILED],
            };
        }
        if (opts.search) {
            where.OR = [
                { title: { contains: opts.search, mode: 'insensitive' } },
                { story: { title: { contains: opts.search, mode: 'insensitive' } } },
            ];
        }
        const matched = await this.prisma.chapter.findMany({
            where,
            select: { id: true },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
        if (matched.length === 0) return { matched: 0, reset: 0, queued: 0 };
        const ids = matched.map((c) => c.id);

        // Chỉ xoá audio/ trạng thái của các chương đã khớp; job BullMQ cũ (nếu
        // còn) gặp chương null sẽ sinh lại bình thường, không sinh trùng vì
        // claim là atomic.
        const reset = await this.prisma.chapter.updateMany({
            where: { id: { in: ids } },
            data: { ttsAudioStatus: null, ttsAudioUrl: null, ttsVoiceName: null },
        });
        const eligible = await this.prisma.chapter.findMany({
            where: { id: { in: ids }, ...this.eligibleChapterWhere() },
            select: { id: true },
        });
        const queued = await this.claimAndEnqueue(eligible.map((c) => c.id));
        this.logger.log(
            `Admin reset-bulk: matched ${ids.length}, reset ${reset.count}, queued ${queued} (status=${opts.status || 'default'}, search=${opts.search || ''})`,
        );
        return { matched: ids.length, reset: reset.count, queued };
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
        const parts = splitForWorker(text, this.workerPartChars);
        if (parts.length === 1) {
            return this.callWorkerPart(parts[0], voice, opts.refAudioUrl, timeoutMs, '');
        }
        this.logger.log(
            `Text ${text.length} ký tự → chia ${parts.length} phần (tối đa ${this.workerPartChars} ký tự/phần)`,
        );
        const buffers: Buffer[] = [];
        for (let i = 0; i < parts.length; i++) {
            const label = ` (phần ${i + 1}/${parts.length})`;
            const started = Date.now();
            buffers.push(
                await this.callWorkerPart(parts[i], voice, opts.refAudioUrl, timeoutMs, label),
            );
            this.logger.log(
                `TTS${label}: ${parts[i].length} ký tự xong trong ${Math.round((Date.now() - started) / 1000)}s`,
            );
        }
        return concatMp3(buffers);
    }

    /**
     * Một request /synthesize: chọn worker ít bận nhất, chờ nếu worker vắng mặt.
     * Mỗi phần chọn worker lại từ đầu — worker vừa vào draining thì phần sau tự
     * chuyển sang máy còn khoẻ.
     */
    private async callWorkerPart(
        text: string,
        voice: string,
        refAudioUrl: string | null | undefined,
        timeoutMs: number,
        label: string,
    ): Promise<Buffer> {
        // Worker đang deploy lại / tự recycle (503 draining) / bị OOM-kill /
        // máy phụ đang ngủ → lỗi kết nối tức thì. Ném ngay thì BullMQ đốt hết 4
        // lượt retry trong vài phút (mỗi lần deploy từng làm ~650 job FAILED).
        // Còn worker khoẻ khác thì chuyển sang NGAY; hết sạch mới chờ /health.
        const maxAttempts = Math.max(3, this.workerUrls.length + 1);
        for (let attempt = 1; ; attempt++) {
            const workerUrl = this.pickWorker();
            this.workerLoad.set(workerUrl, (this.workerLoad.get(workerUrl) ?? 0) + 1);
            try {
                const audio = await this.callWorkerAt(
                    workerUrl, text, voice, refAudioUrl, timeoutMs,
                );
                this.workerFailedAt.delete(workerUrl);
                return audio;
            } catch (err) {
                if (attempt >= maxAttempts || !this.isWorkerUnavailable(err)) throw err;
                this.workerFailedAt.set(workerUrl, Date.now());
                const canSwitch = this.hasHealthyWorker();
                this.logger.warn(
                    `TTS worker ${workerUrl}${label} không sẵn sàng (${(err as Error).message}) — ` +
                    `${canSwitch ? 'chuyển sang worker khác' : 'chờ worker lên lại'} (lần ${attempt})`,
                );
                if (!canSwitch && !(await this.waitForWorker(workerUrl, this.workerWaitMs))) {
                    throw err;
                }
            } finally {
                this.workerLoad.set(workerUrl, Math.max(0, (this.workerLoad.get(workerUrl) ?? 1) - 1));
            }
        }
    }

    /** Bỏ qua worker vừa lỗi kết nối trong bấy lâu (mặc định 5 phút). */
    private readonly workerCooldownMs =
        parseInt(process.env.TTS_WORKER_COOLDOWN_MS || '', 10) || 5 * 60_000;

    /** Còn worker nào chưa lỗi gần đây không? */
    private hasHealthyWorker(): boolean {
        const now = Date.now();
        return this.workerUrls.some(
            (u) => now - (this.workerFailedAt.get(u) ?? 0) > this.workerCooldownMs,
        );
    }

    /** Tối đa chờ worker lên lại trong 1 job (mặc định 15 phút — đủ cho 1 lần deploy). */
    private readonly workerWaitMs =
        parseInt(process.env.TTS_WORKER_WAIT_MS || '', 10) || 15 * 60_000;

    /** Lỗi do worker vắng mặt (không phải lỗi nội dung/timeout sinh audio). */
    private isWorkerUnavailable(err: unknown): boolean {
        const e = err as Error & { cause?: { code?: string }; name?: string };
        if (!e) return false;
        if (e.name === 'TimeoutError' || e.name === 'AbortError') return false;
        if (/HTTP 50[23]\b/.test(e.message || '')) return true; // 503 draining / 502 proxy
        if (e.message === 'fetch failed') return true;
        const code = e.cause?.code || '';
        return ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'].includes(code);
    }

    /**
     * Poll GET /health mỗi 10s tới khi worker báo model_loaded và KHÔNG còn
     * draining. Worker sắp recycle vẫn trả health 200 — gửi job vào lúc đó chỉ
     * ăn 503 rồi đốt hết lượt retry, nên phải chờ nó thoát và lên lại.
     */
    private async waitForWorker(workerUrl: string, maxMs: number): Promise<boolean> {
        const deadline = Date.now() + maxMs;
        while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 10_000));
            try {
                const res = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(5_000) });
                if (res.ok) {
                    const data = (await res.json().catch(() => ({}))) as {
                        model_loaded?: boolean;
                        draining?: boolean;
                    };
                    if (data.model_loaded !== false && data.draining !== true) {
                        this.logger.log(`TTS worker ${workerUrl} đã sẵn sàng trở lại`);
                        this.workerFailedAt.delete(workerUrl);
                        return true;
                    }
                }
            } catch {
                /* chưa lên */
            }
        }
        this.logger.error(`TTS worker ${workerUrl} vẫn không sẵn sàng sau ${Math.round(maxMs / 60000)} phút`);
        return false;
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

/**
 * Cắt text chương thành các phần <= maxLen ký tự theo ranh giới câu.
 *
 * Không bao giờ cắt giữa câu: chỗ nối giữa hai phần là hai file MP3 khác nhau
 * nên nghe rõ, rơi vào giữa câu sẽ thành hụt hơi.
 */
export function splitForWorker(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];
    const sentences = text.match(/[^.!?…\n]*[.!?…]*\n*/g)?.filter((p) => p.trim()) ?? [text];
    const parts: string[] = [];
    let current = '';
    for (const sentence of sentences) {
        if (current && current.length + sentence.length > maxLen) {
            parts.push(current.trim());
            current = '';
        }
        // Câu đơn dài hơn cả maxLen (đoạn không có dấu chấm) → đành cắt cứng.
        let rest = sentence;
        while (rest.length > maxLen) {
            parts.push(rest.slice(0, maxLen).trim());
            rest = rest.slice(maxLen);
        }
        current += rest;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

/** Độ dài (byte) frame MPEG Layer III tại offset i, 0 nếu không phải frame. */
function mp3FrameLength(buf: Buffer, i: number): number {
    if (i + 4 > buf.length) return 0;
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return 0;
    const version = (buf[i + 1] >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
    const layer = (buf[i + 1] >> 1) & 0x03; // 1=Layer III
    if (version === 1 || layer !== 1) return 0;
    const bitrateIdx = (buf[i + 2] >> 4) & 0x0f;
    const rateIdx = (buf[i + 2] >> 2) & 0x03;
    if (bitrateIdx === 0 || bitrateIdx === 15 || rateIdx === 3) return 0;
    const padding = (buf[i + 2] >> 1) & 0x01;
    const mpeg1 = version === 3;
    const bitrates = mpeg1
        ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const rates = mpeg1
        ? [44100, 48000, 32000]
        : version === 2
            ? [22050, 24000, 16000]
            : [11025, 12000, 8000];
    const samples = mpeg1 ? 1152 : 576;
    return Math.floor(((samples / 8) * (bitrates[bitrateIdx] * 1000)) / rates[rateIdx]) + padding;
}

/** Bỏ ID3v2/ID3v1 và frame Xing/Info, chỉ giữ lại các frame audio. */
function stripMp3Tags(buf: Buffer): Buffer {
    let start = 0;
    while (
        buf.length >= start + 10 &&
        buf[start] === 0x49 && buf[start + 1] === 0x44 && buf[start + 2] === 0x33 // "ID3"
    ) {
        const size =
            ((buf[start + 6] & 0x7f) << 21) | ((buf[start + 7] & 0x7f) << 14) |
            ((buf[start + 8] & 0x7f) << 7) | (buf[start + 9] & 0x7f);
        start += 10 + size + ((buf[start + 5] & 0x10) ? 10 : 0); // cờ 0x10 = có footer
    }
    const frameLen = mp3FrameLength(buf, start);
    if (frameLen > 0) {
        // Tag Xing/Info nằm ngay sau side info (offset 13/21/36 tuỳ version).
        const head = buf.subarray(start, start + Math.min(frameLen, 40)).toString('latin1');
        if (head.includes('Xing') || head.includes('Info')) start += frameLen;
    }
    let end = buf.length;
    if (end >= 128 && buf.subarray(end - 128, end - 125).toString('latin1') === 'TAG') end -= 128;
    return buf.subarray(start, end);
}

/**
 * Nối các MP3 phần thành một file. Container backend không có ffmpeg nên nối ở
 * mức byte — các phần đều do worker encode cùng tham số (CBR 64k mono).
 *
 * Bỏ Xing/Info của CẢ phần đầu là cố ý: tag đó chỉ đếm số frame của riêng phần
 * 1, giữ lại thì trình phát báo sai thời lượng cả chương. Không có tag, MP3 CBR
 * được tính thời lượng theo kích thước file nên ra đúng.
 */
export function concatMp3(parts: Buffer[]): Buffer {
    if (parts.length === 1) return parts[0];
    return Buffer.concat(parts.map(stripMp3Tags));
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
