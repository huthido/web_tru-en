import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import { TtsService, TtsJobData } from './tts.service';
import { TTS_QUEUE } from '../queue/queue.module';

/**
 * Worker BullMQ sinh audio AI. Mỗi job chiếm trọn CPU của 1 TTS worker nhiều
 * phút nên concurrency = số TTS worker (TTS_WORKER_URL có thể là nhiều URL):
 * 1 worker → 1 job một lúc; N máy → N chương song song.
 */
@Processor(TTS_QUEUE, { concurrency: 1 })
export class TtsProcessor extends WorkerHost implements OnApplicationBootstrap {
    private readonly logger = new Logger(TtsProcessor.name);

    constructor(private readonly ttsService: TtsService) {
        super();
    }

    onApplicationBootstrap() {
        const n = Math.max(1, this.ttsService.workerCount);
        if (this.worker && this.worker.concurrency !== n) {
            this.worker.concurrency = n;
            this.logger.log(`TTS queue concurrency = ${n} (theo số TTS worker)`);
        }
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
