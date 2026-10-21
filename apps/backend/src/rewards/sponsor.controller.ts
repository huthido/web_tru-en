import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { SponsorRewardType, UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, Max, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { SponsorService } from './sponsor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class ProgramDto {
    @IsString() @MinLength(3) @MaxLength(150) title!: string;
    @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
    @IsString() @MinLength(2) @MaxLength(100) sponsorName!: string;
    @IsOptional() @IsString() @MaxLength(500) sponsorLogo?: string | null;
    @IsEnum(SponsorRewardType) rewardType!: SponsorRewardType;
    @IsString() @MinLength(2) @MaxLength(300) rewardNote!: string;
    @IsOptional() @IsString() storyId?: string | null;
    @Type(() => Number) @IsInt() @Min(1) @Max(100000) slots!: number;
    @Type(() => Number) @IsInt() @Min(0) @Max(366) requiredCheckinDays!: number;
    @Type(() => Number) @IsInt() @Min(0) @Max(366) requiredMissionDays!: number;
    @IsDateString() startsAt!: string;
    @IsDateString() endsAt!: string;
}

class ProposeDto extends ProgramDto {
    @IsString() @MinLength(5) @MaxLength(300) contactInfo!: string;
}

class RejectDto {
    @IsString() @MaxLength(300) reason!: string;
}

class ClaimDto {
    @IsOptional() @IsString() @MaxLength(500) contact?: string | null;
}

class ActiveDto {
    @IsBoolean() isActive!: boolean;
}

/** Quỹ thưởng tài trợ: người dùng xem/nhận, admin quản lý. */
@Controller('sponsors')
@UseGuards(JwtAuthGuard)
export class SponsorController {
    constructor(private readonly sponsors: SponsorService) { }

    @Get()
    list(@CurrentUser() user: any) {
        return this.sponsors.listForUser(user.id);
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post(':id/claim')
    claim(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ClaimDto) {
        return this.sponsors.claim(user.id, id, dto.contact);
    }

    // ─── Nhà tài trợ (người dùng gửi đề xuất) ───
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('propose')
    propose(@CurrentUser() user: any, @Body() dto: ProposeDto) {
        return this.sponsors.propose(user.id, dto);
    }

    @Get('mine')
    mine(@CurrentUser() user: any) {
        return this.sponsors.mine(user.id);
    }

    @Get('mine/:id/claims')
    ownerClaims(@CurrentUser() user: any, @Param('id') id: string) {
        return this.sponsors.ownerClaims(user.id, id);
    }

    @Patch('mine/claims/:id/fulfill')
    ownerFulfill(@CurrentUser() user: any, @Param('id') id: string) {
        return this.sponsors.ownerFulfill(user.id, id);
    }

    // ─── Admin ───
    @Get('admin/programs')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminList() {
        return this.sponsors.adminList();
    }

    @Post('admin/programs')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminCreate(@CurrentUser() user: any, @Body() dto: ProgramDto) {
        return this.sponsors.adminCreate(user.id, dto);
    }

    @Put('admin/programs/:id')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminUpdate(@Param('id') id: string, @Body() dto: ProgramDto) {
        return this.sponsors.adminUpdate(id, dto);
    }

    @Patch('admin/programs/:id/active')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminActive(@Param('id') id: string, @Body() dto: ActiveDto) {
        return this.sponsors.adminSetActive(id, dto.isActive);
    }

    @Patch('admin/programs/:id/approve')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminApprove(@Param('id') id: string) {
        return this.sponsors.adminApprove(id);
    }

    @Patch('admin/programs/:id/reject')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminReject(@Param('id') id: string, @Body() dto: RejectDto) {
        return this.sponsors.adminReject(id, dto.reason);
    }

    @Get('admin/programs/:id/claims')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminClaims(@Param('id') id: string) {
        return this.sponsors.adminClaims(id);
    }

    @Patch('admin/claims/:id/fulfill')
    @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
    adminFulfill(@Param('id') id: string) {
        return this.sponsors.adminFulfill(id);
    }
}
