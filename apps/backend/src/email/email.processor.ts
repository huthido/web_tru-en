import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService, EmailOptions } from './email.service';
import { EMAIL_QUEUE } from '../queue/queue.module';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailOptions>): Promise<void> {
    this.logger.log(`Processing email job ${job.id} → ${job.data.to}`);
    await this.emailService.deliverNow(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Email job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
    );
  }
}
