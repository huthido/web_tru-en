import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { VnpayProvider } from './providers/vnpay.provider';
import { PaymentProvider, PaymentStatus, TransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private vnpay: VnpayProvider,
  ) {}

  /**
   * Create a pending Payment row + VNPay payment URL for the user to redirect to.
   */
  async createCoinPackagePayment(opts: {
    userId: string;
    packageId: string;
    provider: PaymentProvider;
    ipAddr: string;
    bankCode?: string;
  }) {
    const pkg = await this.prisma.coinPackage.findUnique({
      where: { id: opts.packageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Coin package not found or inactive');
    }

    // Internal txnRef must be ≤100 chars (VNPay limit ~100). cuid + timestamp suffix.
    const txnRef = `${Date.now()}-${randomUUID().slice(0, 8)}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId: opts.userId,
        packageId: pkg.id,
        provider: opts.provider,
        amount: pkg.priceVND,
        coinAmount: pkg.coinAmount,
        status: PaymentStatus.PENDING,
        txnRef,
      },
    });

    let payUrl: string;
    if (opts.provider === PaymentProvider.VNPAY) {
      payUrl = this.vnpay.buildPaymentUrl({
        txnRef,
        amountVND: pkg.priceVND,
        orderInfo: `Nap ${pkg.coinAmount} coin (${pkg.name}) - user ${opts.userId.slice(0, 8)}`,
        ipAddr: opts.ipAddr,
        bankCode: opts.bankCode,
      });
    } else {
      throw new BadRequestException(`Provider ${opts.provider} not implemented yet`);
    }

    return { payment, payUrl };
  }

  /**
   * Handle VNPay IPN (server-to-server). Idempotent: safe to call multiple times.
   * Returns the response body VNPay expects.
   */
  async handleVnpayIpn(params: Record<string, string>) {
    const result = this.vnpay.verifyCallback(params);

    if (!result.valid) {
      this.logger.warn(`VNPay IPN invalid signature: ${JSON.stringify(params)}`);
      return { RspCode: '97', Message: 'Invalid signature' };
    }
    if (!result.txnRef) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { txnRef: result.txnRef },
    });
    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    // Idempotency — if already completed, just confirm.
    if (payment.status === PaymentStatus.COMPLETED) {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (result.amountVND !== payment.amount) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, providerData: params as any },
      });
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (!result.success) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerTxn: result.providerTxn,
          providerData: params as any,
        },
      });
      return { RspCode: '00', Message: 'Confirm Success' }; // VNPay wants 00 even for failure ack
    }

    // SUCCESS — credit wallet and mark COMPLETED in a single transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          providerTxn: result.providerTxn,
          providerData: params as any,
        },
      });

      // VNPay top-up is a real-money purchase → credits the purchased bucket
      // (spendable but not withdrawable). Same path will be used by future
      // Apple IAP / Google Play webhooks for Apple §3.1.1 compliance.
      const wallet = await this.wallet.creditPurchasedExternal(
        tx,
        payment.userId,
        payment.coinAmount,
      );

      await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          amount: payment.coinAmount,
          type: TransactionType.DEPOSIT,
          description: `VNPay top-up (txn ${result.providerTxn || payment.txnRef})`,
          referenceId: payment.id,
        },
      });
    });

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  /**
   * Handle the redirect-back URL — same verification as IPN but UI-facing.
   * Frontend should poll /payments/:id afterwards for the authoritative status
   * (since IPN may arrive before the redirect).
   */
  async handleVnpayReturn(params: Record<string, string>) {
    const result = this.vnpay.verifyCallback(params);
    return {
      valid: result.valid,
      success: result.success,
      txnRef: result.txnRef,
      responseCode: result.responseCode,
    };
  }

  async getPayment(id: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, userId },
      include: { package: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async listMyPayments(userId: string, limit = 20) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { package: { select: { name: true, coinAmount: true } } },
    });
  }
}
