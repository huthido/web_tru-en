import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PaymentStatus } from '@prisma/client';

/**
 * Admin duyệt các yêu cầu nạp xu qua chuyển khoản thủ công. Mirror pattern của
 * AdminWithdrawalController: liệt kê + xử lý APPROVE/REJECT.
 */
@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * GET /api/admin/payments/manual?status=PENDING&search=NAP...
   * status: lọc theo trạng thái (mặc định tất cả). search: đối soát theo mã
   * tham chiếu / tên / email người nạp.
   */
  @Get('manual')
  async listManual(@Query('status') status?: string, @Query('search') search?: string) {
    const valid =
      status && (Object.values(PaymentStatus) as string[]).includes(status)
        ? (status as PaymentStatus)
        : undefined;
    const data = await this.payments.listManualPayments(valid, search);
    return { success: true, data };
  }

  /**
   * PATCH /api/admin/payments/manual/:id
   * body: { action: 'CONFIRM' | 'REJECT', note?: string }
   * CONFIRM = kích hoạt bằng tay (cộng xu). REJECT = hủy yêu cầu.
   */
  @Patch('manual/:id')
  async process(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { action: 'CONFIRM' | 'REJECT'; note?: string },
  ) {
    if (body.action !== 'CONFIRM' && body.action !== 'REJECT') {
      throw new BadRequestException('action phải là CONFIRM hoặc REJECT');
    }
    const data =
      body.action === 'CONFIRM'
        ? await this.payments.confirmManualPayment(req.user.id, id)
        : await this.payments.rejectManualPayment(req.user.id, id, body.note);
    return { success: true, data };
  }
}
