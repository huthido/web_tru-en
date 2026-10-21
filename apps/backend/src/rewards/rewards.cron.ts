import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { previousDay, vnDay } from '../common/vn-day';

/**
 * Dọn `user_daily_activities`: bảng chỉ phục vụ đếm nhiệm vụ của HÔM NAY
 * nhưng mỗi chương đọc xong ghi 1 dòng → giữ 3 ngày gần nhất, xoá phần cũ.
 */
@Injectable()
export class RewardsCron {
    private readonly logger = new Logger(RewardsCron.name);

    constructor(private prisma: PrismaService) { }

    @Cron('30 3 * * *')
    async cleanupDailyActivities() {
        const keepFrom = previousDay(previousDay(vnDay())); // hôm nay + 2 ngày trước
        try {
            const res = await this.prisma.userDailyActivity.deleteMany({ where: { day: { lt: keepFrom } } });
            if (res.count > 0) this.logger.log(`Đã xoá ${res.count} hoạt động ngày cũ (< ${keepFrom})`);
        } catch (e: any) {
            this.logger.warn(`Dọn user_daily_activities lỗi: ${e?.message ?? e}`);
        }
    }
}
