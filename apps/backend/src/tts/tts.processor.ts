import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TtsService, TtsJobData } from './tts.service';
import { TTS_QUEUE } from '../queue/queue.module';

/**
 * Số TTS worker = số URL trong TTS_WORKER_URL. Đọc thẳng process.env lúc
 * import vì decorator @Processor cần giá trị tĩnh — BullMQ khởi tạo vòng lặp
 * fetch với concurrency ban đầu, đổi setter sau khi chạy không có tác dụng.
 */
const TTS_WORKER_COUNT = Math.max(
    1,
    (process.env.TTS_WORKER_URL || '').split(',').filter((u) => u.trim()).length,
);

/**
 * Worker BullMQ sinh audio AI. Mỗi job chiếm trọn CPU của 1 TTS worker nhiều
 * phút nên concurrency = số TTS worker: 1 máy → 1 job một lúc; N máy → N
 * chương song song (TtsService.pickWorker chia job cho worker ít bận nhất).
 */
// Script ops (scripts/*.ts) tạo Nest context từ AppModule → processor này cũng
// khởi động và "cướp" job khỏi queue rồi chết theo script. Script đặt
// BULL_PROCESSORS_DISABLED=1 trước khi import AppModule để worker không autorun.
@Processor(TTS_QUEUE, {
    concurrency: TTS_WORKER_COUNT,
    autorun: process.env.BULL_PROCESSORS_DISABLED !== '1',
})
export class TtsProcessor extends WorkerHost {
    private readonly logger = new Logger(TtsProcessor.name);

    constructor(private readonly ttsService: TtsService) {
        super();
        this.logger.log(`TTS queue concurrency = ${TTS_WORKER_COUNT} (theo số TTS worker)`);
    }

    async process(job: Job<TtsJobData>): Promise<void> {
        this.logger.log(`Processing TTS job ${job.id} → chapter ${job.data.chapterId}`);
        await this.ttsService.generateNow(job.data.chapterId);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, err: Error) {
        this.logger.error(
            `TTS job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
        );
    }
}
