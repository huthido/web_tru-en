import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AdBookingStatus, AdSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdBookingDto } from './dto/create-ad-booking.dto';
import { ReviewAdBookingDto } from './dto/review-ad-booking.dto';

const MS_PER_DAY = 86_400_000;
/** Giới hạn 1 đơn tối đa 90 ngày — đơn dài hơn thì liên hệ trực tiếp. */
const MAX_BOOKING_DAYS = 90;

/** Parse 'YYYY-MM-DD' → mốc đầu ngày UTC. Throw nếu format sai. */
function parseDay(value: string, field: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!m) throw new BadRequestException(`${field} phải dạng YYYY-MM-DD.`);
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

/** Cuối ngày (23:59:59.999) để Ad chạy trọn ngày kết thúc. */
function endOfDay(day: Date): Date {
    return new Date(day.getTime() + MS_PER_DAY - 1);
}

/**
 * Chặn stored XSS: URL khách gửi sẽ thành href/src render công khai —
 * chỉ chấp nhận scheme http(s). Throw nếu không parse được hoặc scheme lạ
 * (javascript:, data:, …). Defense-in-depth cùng @IsUrl ở DTO.
 */
function assertHttpUrl(value: string | null | undefined, field: string): void {
    if (!value) return;
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new BadRequestException(`${field} không phải URL hợp lệ.`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException(`${field} chỉ chấp nhận http/https.`);
    }
}

/**
 * Đơn đặt quảng cáo self-service (Phase 1 — thanh toán chuyển khoản thủ công):
 * khách chọn slot + khoảng ngày → PENDING → admin xác nhận đã thanh toán →
 * APPROVED: tự tạo Ad SELF_SERVED + binding priority cao chạy đúng lịch.
 */
@Injectable()
export class AdBookingsService {
    /** Priority binding cho booking trả phí — cao hơn ads network admin tự bind. */
    private static readonly PAID_BOOKING_PRIORITY = 100;

    constructor(private prisma: PrismaService) { }

    /**
     * Danh sách slot đang mở bán (public) kèm các khoảng ngày đã có đơn
     * APPROVED còn hiệu lực — frontend dùng để hiển thị lịch trống.
     */
    async listPublicSlots() {
        const today = new Date(new Date().toISOString().slice(0, 10));
        const slots = await this.prisma.adSlot.findMany({
            where: { isPublicForBooking: true, enabled: true, pricePerDay: { gt: 0 } },
            orderBy: [{ pageKey: 'asc' }, { pricePerDay: 'desc' }],
            select: {
                id: true,
                key: true,
                pageKey: true,
                position: true,
                label: true,
                maxAds: true,
                pricePerDay: true,
                bookingNote: true,
                bookings: {
                    where: {
                        status: AdBookingStatus.APPROVED,
                        endDate: { gte: today },
                    },
                    select: { startDate: true, endDate: true },
                    orderBy: { startDate: 'asc' },
                },
            },
        });
        return slots.map(({ bookings, ...slot }) => ({
            ...slot,
            bookedRanges: bookings,
        }));
    }

    /**
     * Đếm số đơn APPROVED của slot giao với khoảng [start, end].
     * Conservative: 2 đơn giao nhau ở bất kỳ đâu trong khoảng đều tính —
     * đủ đúng cho Phase 1 (slot thường maxAds=1).
     */
    private async countOverlapping(
        slotId: string,
        start: Date,
        end: Date,
        excludeBookingId?: string,
    ) {
        return this.prisma.adBooking.count({
            where: {
                slotId,
                status: AdBookingStatus.APPROVED,
                startDate: { lte: end },
                endDate: { gte: start },
                ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
            },
        });
    }

    async create(userId: string, dto: CreateAdBookingDto) {
        assertHttpUrl(dto.imageUrl, 'imageUrl');
        assertHttpUrl(dto.linkUrl, 'linkUrl');

        const slot = await this.prisma.adSlot.findUnique({
            where: { id: dto.slotId },
        });
        if (!slot || !slot.isPublicForBooking || !slot.enabled || slot.pricePerDay <= 0) {
            throw new BadRequestException('Vị trí này hiện không mở bán.');
        }

        const start = parseDay(dto.startDate, 'startDate');
        const endDay = parseDay(dto.endDate, 'endDate');
        const today = parseDay(new Date().toISOString(), 'today');
        if (start < today) {
            throw new BadRequestException('Ngày bắt đầu không được ở quá khứ.');
        }
        if (endDay < start) {
            throw new BadRequestException('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
        }
        const days = Math.round((endDay.getTime() - start.getTime()) / MS_PER_DAY) + 1;
        if (days > MAX_BOOKING_DAYS) {
            throw new BadRequestException(
                `Mỗi đơn tối đa ${MAX_BOOKING_DAYS} ngày. Chiến dịch dài hơn vui lòng liên hệ trực tiếp.`,
            );
        }
        const end = endOfDay(endDay);

        const overlapping = await this.countOverlapping(slot.id, start, end);
        if (overlapping >= slot.maxAds) {
            throw new BadRequestException(
                'Khoảng ngày này đã có khách đặt. Vui lòng chọn ngày khác.',
            );
        }

        return this.prisma.adBooking.create({
            data: {
                userId,
                slotId: slot.id,
                startDate: start,
                endDate: end,
                days,
                pricePerDay: slot.pricePerDay,
                totalPrice: days * slot.pricePerDay,
                title: dto.title,
                imageUrl: dto.imageUrl,
                linkUrl: dto.linkUrl,
                contactName: dto.contactName,
                contactPhone: dto.contactPhone,
                contactEmail: dto.contactEmail,
                companyName: dto.companyName,
                note: dto.note,
            },
            include: { slot: { select: { key: true, label: true, pageKey: true } } },
        });
    }

    async findMy(userId: string) {
        return this.prisma.adBooking.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                slot: { select: { key: true, label: true, pageKey: true, position: true } },
                ad: { select: { id: true, viewCount: true, clickCount: true, impressions: true } },
            },
        });
    }

    /** Khách tự hủy đơn khi còn PENDING. */
    async cancel(userId: string, id: string) {
        const booking = await this.prisma.adBooking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Đơn không tồn tại.');
        if (booking.userId !== userId) {
            throw new ForbiddenException('Không có quyền với đơn này.');
        }
        if (booking.status !== AdBookingStatus.PENDING) {
            throw new BadRequestException('Chỉ hủy được đơn đang chờ duyệt.');
        }
        return this.prisma.adBooking.update({
            where: { id },
            data: { status: AdBookingStatus.CANCELLED },
        });
    }

    // === Admin ===

    async findAll(status?: AdBookingStatus) {
        return this.prisma.adBooking.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                slot: { select: { key: true, label: true, pageKey: true, maxAds: true } },
                user: { select: { id: true, username: true, email: true, displayName: true } },
                ad: { select: { id: true, isActive: true } },
            },
        });
    }

    /**
     * Admin duyệt đơn. APPROVED = đã nhận thanh toán → tạo Ad SELF_SERVED +
     * binding priority cao, tự chạy theo startDate/endDate của đơn (logic
     * phân phối findActiveAdsBySlot sẵn có, không cần cron).
     */
    async review(id: string, adminId: string, dto: ReviewAdBookingDto) {
        const booking = await this.prisma.adBooking.findUnique({
            where: { id },
            include: { slot: true },
        });
        if (!booking) throw new NotFoundException('Đơn không tồn tại.');
        if (booking.status !== AdBookingStatus.PENDING) {
            throw new BadRequestException('Chỉ duyệt được đơn đang chờ (PENDING).');
        }

        if (dto.status === 'REJECTED') {
            return this.prisma.adBooking.update({
                where: { id },
                data: {
                    status: AdBookingStatus.REJECTED,
                    adminNote: dto.adminNote,
                    reviewedById: adminId,
                    reviewedAt: new Date(),
                },
            });
        }

        // APPROVED — cần creative đầy đủ để tạo Ad.
        if (!booking.imageUrl || !booking.linkUrl) {
            throw new BadRequestException(
                'Đơn chưa có đủ creative (ảnh banner + link đích). Yêu cầu khách bổ sung trước khi duyệt.',
            );
        }
        // Re-check trước khi copy vào Ad public (phòng bản ghi tạo trước khi có validate).
        assertHttpUrl(booking.imageUrl, 'imageUrl');
        assertHttpUrl(booking.linkUrl, 'linkUrl');
        const overlapping = await this.countOverlapping(
            booking.slotId,
            booking.startDate,
            booking.endDate,
            booking.id,
        );
        if (overlapping >= booking.slot.maxAds) {
            throw new BadRequestException(
                'Slot đã kín lịch trong khoảng ngày này (đơn khác đã được duyệt trước).',
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const ad = await tx.ad.create({
                data: {
                    title: booking.title ?? `Booking ${booking.contactName}`,
                    imageUrl: booking.imageUrl!,
                    linkUrl: booking.linkUrl,
                    type: booking.slot.adType ?? 'BANNER',
                    position: booking.slot.position,
                    sourceType: AdSourceType.SELF_SERVED,
                    isActive: true,
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    priority: AdBookingsService.PAID_BOOKING_PRIORITY,
                    createdById: adminId,
                },
            });
            await tx.adSlotBinding.create({
                data: {
                    adId: ad.id,
                    slotId: booking.slotId,
                    priority: AdBookingsService.PAID_BOOKING_PRIORITY,
                },
            });
            return tx.adBooking.update({
                where: { id },
                data: {
                    status: AdBookingStatus.APPROVED,
                    adminNote: dto.adminNote,
                    adId: ad.id,
                    reviewedById: adminId,
                    reviewedAt: new Date(),
                },
                include: { ad: true },
            });
        });
    }
}
