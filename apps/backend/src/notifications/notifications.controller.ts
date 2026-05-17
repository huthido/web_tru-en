import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    Sse,
    MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    // Admin endpoints
    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@CurrentUser() user: any, @Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationsService.create(user.id, createNotificationDto);
    }

    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('type') type?: string,
        @Query('priority') priority?: string,
        @Query('isActive') isActive?: string,
    ) {
        return this.notificationsService.findAll({
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            type,
            priority,
            isActive: isActive ? isActive === 'true' : undefined,
        });
    }

    @Get('admin/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findOne(@Param('id') id: string) {
        return this.notificationsService.findOne(id);
    }

    @Patch('admin/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
        return this.notificationsService.update(id, updateNotificationDto);
    }

    @Delete('admin/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.notificationsService.remove(id);
    }

    // User endpoints
    @Get('my')
    getMyNotifications(
        @CurrentUser() user: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('isRead') isRead?: string,
    ) {
        return this.notificationsService.getUserNotifications(user.id, {
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            isRead: isRead ? isRead === 'true' : undefined,
        });
    }

    @Get('unread-count')
    getUnreadCount(@CurrentUser() user: any) {
        return this.notificationsService.getUnreadCount(user.id);
    }

    // Realtime stream (SSE). Auth via the class-level JwtAuthGuard (cookie).
    @Sse('stream')
    stream(@CurrentUser() user: any): Observable<MessageEvent> {
        return this.notificationsService.streamFor(user.id);
    }

    @Post(':recipientId/read')
    markAsRead(@CurrentUser() user: any, @Param('recipientId') recipientId: string) {
        return this.notificationsService.markAsRead(user.id, recipientId);
    }

    @Post('mark-all-read')
    markAllAsRead(@CurrentUser() user: any) {
        return this.notificationsService.markAllAsRead(user.id);
    }
}
