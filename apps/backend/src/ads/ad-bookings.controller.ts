import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdBookingStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { imageMulterFilter } from '../common/image/multer-filter';
import { ImageNormalizePipe } from '../common/pipes/image-normalize.pipe';
import { AdBookingsService } from './ad-bookings.service';
import { CreateAdBookingDto } from './dto/create-ad-booking.dto';
import { ReviewAdBookingDto } from './dto/review-ad-booking.dto';

@Controller('ad-bookings')
export class AdBookingsController {
    constructor(
        private bookings: AdBookingsService,
        private cloudinary: CloudinaryService,
    ) { }

    /** Public — bảng giá: slot đang mở bán + lịch đã kín. */
    @Public()
    @Get('public/slots')
    listPublicSlots() {
        return this.bookings.listPublicSlots();
    }

    /** Khách (đã đăng nhập) gửi đơn đặt quảng cáo. */
    @Post()
    create(@CurrentUser() user: any, @Body() dto: CreateAdBookingDto) {
        return this.bookings.create(user.id, dto);
    }

    /** Đơn của tôi. */
    @Get('my')
    findMy(@CurrentUser() user: any) {
        return this.bookings.findMy(user.id);
    }

    /** Khách hủy đơn còn PENDING. */
    @Patch(':id/cancel')
    cancel(@CurrentUser() user: any, @Param('id') id: string) {
        return this.bookings.cancel(user.id, id);
    }

    /** Khách upload ảnh banner cho đơn (trước hoặc trong lúc đặt). */
    @Post('upload-image')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: imageMulterFilter,
        }),
    )
    async uploadImage(
        @UploadedFile(
            new ImageNormalizePipe({
                maxSizeBytes: 10 * 1024 * 1024,
                maxWidth: 1600,
                quality: 82,
                policy: 'force-webp',
            }),
        )
        file: Express.Multer.File,
    ) {
        const imageUrl = await this.cloudinary.uploadImage(file, 'ads/bookings');
        return { imageUrl };
    }

    // === Admin ===

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll(@Query('status') status?: AdBookingStatus) {
        return this.bookings.findAll(status);
    }

    /** Admin duyệt (đã nhận thanh toán) hoặc từ chối đơn. */
    @Patch(':id/review')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    review(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: ReviewAdBookingDto,
    ) {
        return this.bookings.review(id, user.id, dto);
    }
}
