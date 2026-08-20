import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TtsService, TtsJobData } from './tts.service';
import { TTS_QUEUE } from '../queue/queue.module';

/**
 * Worker BullMQ sinh audio AI. concurrency 1 — mỗi job chiếm trọn CPU của
 * TTS worker nhiều phút, chạy song song chỉ làm mọi job cùng chậm và dễ
 * timeout.
 */
@Processor(TTS_QUEUE, { concurrency: 1 })
export class TtsProcessor extends WorkerHost {
    private readonly logger = new Logger(TtsProcessor.name);

    constructor(private readonly ttsService: TtsService) {
        super();
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
