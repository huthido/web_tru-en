import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChaptersService } from './chapters.service';

/**
 * Drip release: mỗi phút quét các chương đã đặt lịch (scheduledPublishAt) tới
 * hạn và tự xuất bản. Cho phép tác giả viết sẵn toàn bộ chương rồi để server
 * nhả ra theo lịch, không phụ thuộc client nào đang mở.
 *
 * Idempotent: chương đã publish không bị quét lại (lọc isPublished=false).
 * Multi-instance: nếu chạy nhiều backend, update có điều kiện isPublished=false
 * khiến chỉ một instance "thắng" mỗi chương — fanout có thể trùng nhẹ nhưng
 * notification service đã dedup theo recipient.
 */
@Injectable()
export class ChaptersCron {
    private readonly logger = new Logger(ChaptersCron.name);

    constructor(private readonly chaptersService: ChaptersService) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async publishScheduled() {
        try {
            const n = await this.chaptersService.publishDueScheduled();
            if (n > 0) this.logger.log(`Đã tự xuất bản ${n} chương theo lịch.`);
        } catch (e: any) {
            this.logger.error(`publishScheduled failed: ${e?.message ?? e}`);
        }
    }
}
