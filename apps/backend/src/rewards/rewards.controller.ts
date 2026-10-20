import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CodeDto {
    @IsString()
    @MaxLength(64)
    code!: string;
}

class CreateGiftCodeDto {
    @IsOptional()
    @IsString()
    @MaxLength(64)
    code?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10000)
    reward!: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    maxUses?: number | null;

    @IsOptional()
    @IsDateString()
    expiresAt?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    note?: string | null;
}

class ToggleDto {
    @IsBoolean()
    isActive!: boolean;
}

/** Điểm danh, nhiệm vụ ngày, mời bạn, giftcode — thưởng bằng xu thưởng. */
@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
    constructor(private readonly rewards: RewardsService) { }

    @Get('status')
    status(@CurrentUser() user: any) {
        return this.rewards.getStatus(user.id);
    }

    @Post('check-in')
    checkIn(@CurrentUser() user: any) {
        return this.rewards.checkIn(user.id);
    }

    @Post('missions/:key/claim')
    claim(@CurrentUser() user: any, @Param('key') key: string) {
        return this.rewards.claimMission(user.id, key);
    }

    @Post('referral/code')
    async referralCode(@CurrentUser() user: any) {
        return { code: await this.rewards.ensureReferralCode(user.id) };
    }

    @Post('referral/attach')
    attach(@CurrentUser() user: any, @Body() dto: CodeDto) {
        return this.rewards.attachReferrer(user.id, dto.code);
    }

    @Post('gift-code/redeem')
    redeem(@CurrentUser() user: any, @Body() dto: CodeDto) {
        return this.rewards.redeemGiftCode(user.id, dto.code);
    }

    // ─── Admin: quản lý giftcode ───
    @Get('admin/gift-codes')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    listGiftCodes() {
        return this.rewards.listGiftCodes();
    }

    @Post('admin/gift-codes')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    createGiftCode(@CurrentUser() user: any, @Body() dto: CreateGiftCodeDto) {
        return this.rewards.createGiftCode(user.id, dto);
    }

    @Patch('admin/gift-codes/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    toggleGiftCode(@Param('id') id: string, @Body() dto: ToggleDto) {
        return this.rewards.setGiftCodeActive(id, dto.isActive);
    }
}
