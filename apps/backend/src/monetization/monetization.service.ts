import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UgcReportStatus, UgcReportTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ELIGIBILITY_REQUIRED_ERROR,
  MONETIZATION_THRESHOLDS,
  MonetizationEligibility,
} from './monetization.constants';

/**
 * Điều kiện bật tính năng nâng cao — theo docs/Điều Kiện Bật Kiếm Tiền.docx:
 *   1. Tổng lượt xem ≥ 10.000
 *   2. Followers ≥ 100 (đếm AuthorFollow.authorId)
 *   3. Tài khoản không vi phạm: isActive=true, !deletedAt, không có
 *      RESOLVED UgcReport targetType=USER trong N ngày gần đây.
 *   4. Nội dung không vi phạm: không có RESOLVED UgcReport targetType=
 *      STORY|CHAPTER trên bất kỳ truyện/chương nào của tác giả trong N ngày.
 *
 * Khi đủ 4 điều kiện, tác giả mở khoá:
 *   - Nhận xu từ quảng cáo (chia doanh thu ads — phase B2).
 *   - Tạo paid chapter (`Chapter.price > 0`) cho truyện FREEMIUM.
 *   - Tạo truyện VIP (`Story.accessType = VIP` + `Story.price > 0`).
 *   - Verified badge ✓ (live-compute = `eligible`).
 *
 * Donate / mua chương / mua truyện đã được tạo trước đó: MỞ TỰ DO cho mọi
 * tác giả — không gate. Coin về wallet + rút bình thường.
 */
@Injectable()
export class MonetizationService {
  constructor(private prisma: PrismaService) {}

  async getEligibility(userId: string): Promise<MonetizationEligibility> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, deletedAt: true },
    });
    if (!user) throw new NotFoundException('User không tồn tại');

    const [totalViews, followers, hasUserViolation, hasContentViolation] =
      await Promise.all([
        this._countTotalViews(userId),
        this._countAuthorFollowers(userId),
        this._hasRecentResolvedReport(userId, 'USER'),
        this._hasRecentResolvedReport(userId, 'CONTENT'),
      ]);

    const accountOk = user.isActive && !user.deletedAt && !hasUserViolation;
    const contentOk = !hasContentViolation;
    const viewsOk = totalViews >= MONETIZATION_THRESHOLDS.MIN_TOTAL_VIEWS;
    const followersOk = followers >= MONETIZATION_THRESHOLDS.MIN_FOLLOWERS;

    const reasons: MonetizationEligibility['reasons'] = {};
    if (!accountOk) {
      if (!user.isActive) reasons.accountOk = 'Tài khoản đã bị khoá';
      else if (user.deletedAt) reasons.accountOk = 'Tài khoản đã bị xoá';
      else if (hasUserViolation)
        reasons.accountOk = `Có báo cáo vi phạm chưa hết hạn ${MONETIZATION_THRESHOLDS.VIOLATION_WINDOW_DAYS} ngày`;
    }
    if (!contentOk) {
      reasons.contentOk = `Có nội dung bị xử lý vi phạm trong ${MONETIZATION_THRESHOLDS.VIOLATION_WINDOW_DAYS} ngày qua`;
    }

    return {
      eligible: viewsOk && followersOk && accountOk && contentOk,
      criteria: {
        totalViews: viewsOk,
        followers: followersOk,
        accountOk,
        contentOk,
      },
      progress: {
        totalViews: {
          current: totalViews,
          required: MONETIZATION_THRESHOLDS.MIN_TOTAL_VIEWS,
        },
        followers: {
          current: followers,
          required: MONETIZATION_THRESHOLDS.MIN_FOLLOWERS,
        },
      },
      reasons: Object.keys(reasons).length ? reasons : undefined,
    };
  }

  async isEligible(userId: string): Promise<boolean> {
    const r = await this.getEligibility(userId);
    return r.eligible;
  }

  /**
   * Throw ForbiddenException với code ELIGIBILITY_REQUIRED nếu user chưa đủ
   * điều kiện. Dùng ở các luồng "tạo paid content" (set VIP / chapter price)
   * và "bật ad revenue" — KHÔNG dùng ở donate / mua chương / mua truyện
   * (các luồng đó mở tự do cho mọi tác giả).
   */
  async assertEligibleForAdvancedFeatures(authorId: string): Promise<void> {
    const ok = await this.isEligible(authorId);
    if (!ok) {
      throw new ForbiddenException({
        code: ELIGIBILITY_REQUIRED_ERROR,
        message:
          'Cần mở khoá tính năng nâng cao (10.000 view + 100 follower + tài khoản/nội dung không vi phạm)',
      });
    }
  }

  private async _countTotalViews(userId: string): Promise<number> {
    const agg = await this.prisma.story.aggregate({
      where: { authorId: userId },
      _sum: { viewCount: true },
    });
    return agg._sum.viewCount ?? 0;
  }

  private async _countAuthorFollowers(userId: string): Promise<number> {
    return this.prisma.authorFollow.count({ where: { authorId: userId } });
  }

  /**
   * scope='USER'    → kiểm tra UgcReport targetType=USER, targetId=userId
   * scope='CONTENT' → kiểm tra UgcReport targetType=STORY|CHAPTER, target
   *                   thuộc về tác giả (story.authorId hoặc chapter.story.authorId)
   */
  private async _hasRecentResolvedReport(
    userId: string,
    scope: 'USER' | 'CONTENT',
  ): Promise<boolean> {
    const since = new Date(
      Date.now() -
        MONETIZATION_THRESHOLDS.VIOLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    if (scope === 'USER') {
      const n = await this.prisma.ugcReport.count({
        where: {
          status: UgcReportStatus.RESOLVED,
          targetType: UgcReportTargetType.USER,
          targetId: userId,
          resolvedAt: { gte: since },
        },
      });
      return n > 0;
    }

    // CONTENT: lấy danh sách story.id của tác giả + chapter.id thuộc story đó.
    const stories = await this.prisma.story.findMany({
      where: { authorId: userId },
      select: { id: true },
    });
    if (stories.length === 0) return false;
    const storyIds = stories.map((s) => s.id);

    const chapters = await this.prisma.chapter.findMany({
      where: { storyId: { in: storyIds } },
      select: { id: true },
    });
    const chapterIds = chapters.map((c) => c.id);

    const n = await this.prisma.ugcReport.count({
      where: {
        status: UgcReportStatus.RESOLVED,
        resolvedAt: { gte: since },
        OR: [
          {
            targetType: UgcReportTargetType.STORY,
            targetId: { in: storyIds },
          },
          ...(chapterIds.length
            ? [
                {
                  targetType: UgcReportTargetType.CHAPTER,
                  targetId: { in: chapterIds },
                },
              ]
            : []),
        ],
      },
    });
    return n > 0;
  }
}
