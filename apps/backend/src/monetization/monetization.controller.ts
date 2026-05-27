import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MonetizationService } from './monetization.service';

/** Tác giả tự xem progress mở khoá kiếm tiền. */
@Controller('author/monetization')
export class MonetizationController {
  constructor(private readonly service: MonetizationService) {}

  @Get('eligibility')
  myEligibility(@CurrentUser() user: { id: string }) {
    return this.service.getEligibility(user.id);
  }
}

/** Admin tra cứu eligibility của user khác. */
@Controller('admin/monetization')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMonetizationController {
  constructor(private readonly service: MonetizationService) {}

  @Get('eligibility/:userId')
  byUser(@Param('userId') userId: string) {
    return this.service.getEligibility(userId);
  }
}
