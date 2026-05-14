import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Start a top-up flow for a coin package. Returns the redirect URL.
   *   POST /api/payments/coin-packages/:packageId
   *   body: { provider?: 'VNPAY', bankCode?: string }
   */
  @Post('coin-packages/:packageId')
  async createCoinPackagePayment(
    @Param('packageId') packageId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Body() body: { provider?: PaymentProvider; bankCode?: string } = {},
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const { payment, payUrl } = await this.payments.createCoinPackagePayment({
      userId: user.id,
      packageId,
      provider: body.provider || PaymentProvider.VNPAY,
      ipAddr,
      bankCode: body.bankCode,
    });

    return {
      success: true,
      data: { paymentId: payment.id, txnRef: payment.txnRef, payUrl },
    };
  }

  /**
   * VNPay return URL — public, redirected to from the gateway after the user pays.
   * We just verify the signature and bounce the user back to the frontend with status.
   */
  @Public()
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: Record<string, string>, @Res() res: Response) {
    const result = await this.payments.handleVnpayReturn(query);
    const frontend =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const params = new URLSearchParams({
      txnRef: result.txnRef || '',
      success: String(result.success),
      responseCode: result.responseCode || '',
    });
    return res.redirect(`${frontend}/wallet/payment-result?${params.toString()}`);
  }

  /**
   * VNPay IPN — public server-to-server callback. Idempotent.
   *   GET /api/payments/vnpay/ipn?<vnp params>
   * Returns plain JSON {RspCode, Message} as VNPay expects.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('vnpay/ipn')
  async vnpayIpn(@Query() query: Record<string, string>) {
    return this.payments.handleVnpayIpn(query);
  }

  @Get('me')
  async listMine(@CurrentUser() user: any) {
    const data = await this.payments.listMyPayments(user.id);
    return { success: true, data };
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.payments.getPayment(id, user.id);
    return { success: true, data };
  }
}
