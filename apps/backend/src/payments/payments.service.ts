import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { VnpayProvider } from './providers/vnpay.provider';
import { AppleIapProvider } from './providers/apple-iap.provider';
import { GooglePlayProvider } from './providers/google-play.provider';
import { PaymentProvider, PaymentStatus, TransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private vnpay: VnpayProvider,
    private appleIap: AppleIapProvider,
    private googlePlay: GooglePlayProvider,
  ) {}

  /**
   * List coin packages on sale — used by the public shop page. Only active
   * packages, cheapest first. Behind the global JWT guard (must be logged in
   * to buy anyway).
   */
  async listActiveCoinPackages() {
    return this.prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: { priceVND: 'asc' },
    });
  }

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

  // ─── Apple IAP / Google Play redeem flow ──────────────────────────────
  // Mobile clients (iOS / Android) complete a purchase with the local store
  // SDK, then POST the resulting receipt to us. We verify with Apple/Google,
  // map productId → CoinPackage, credit the user's purchasedBalance. Apple
  // §3.1.1 / Google Play §4.3: coins from this path are NOT withdrawable —
  // WalletService.creditPurchasedExternal enforces that automatically.

  /**
   * Verify an Apple App Store purchase and credit the wallet. Idempotent
   * by Apple's transactionId — replays are no-ops.
   */
  async redeemAppleIap(opts: {
    userId: string;
    productId: string;
    transactionId: string;
    receipt: string;
  }) {
    if (!opts.productId || !opts.transactionId || !opts.receipt) {
      throw new BadRequestException('Thiếu productId, transactionId hoặc receipt');
    }

    // 1. Idempotency — replays of the same Apple transactionId must not credit twice.
    const existing = await this.prisma.payment.findFirst({
      where: { provider: PaymentProvider.APPLE_IAP, providerTxn: opts.transactionId },
    });
    if (existing) {
      this.logger.log(`Apple IAP replay for txn ${opts.transactionId} — returning existing payment ${existing.id}`);
      return { payment: existing, alreadyCredited: existing.status === PaymentStatus.COMPLETED };
    }

    // 2. Map productId → server CoinPackage. Mobile-sold packages must have
    //    appleProductId populated (admin sets it in the package config).
    const pkg = await this.prisma.coinPackage.findUnique({
      where: { appleProductId: opts.productId },
    });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException(`Không tìm thấy gói coin cho productId "${opts.productId}" (cấu hình appleProductId trên CoinPackage).`);
    }

    // 3. Verify with Apple. Provider returns valid=false until real impl is wired.
    const result = await this.appleIap.verifyPurchase({
      productId: opts.productId,
      transactionId: opts.transactionId,
      receipt: opts.receipt,
    });
    if (!result.valid) {
      // Persist a FAILED payment for audit even though no coins move.
      const failed = await this.prisma.payment.create({
        data: {
          userId: opts.userId,
          packageId: pkg.id,
          provider: PaymentProvider.APPLE_IAP,
          amount: pkg.priceVND, // server's reference price (Apple decides actual)
          coinAmount: pkg.coinAmount,
          status: PaymentStatus.FAILED,
          txnRef: `apple-${opts.transactionId}`,
          providerTxn: opts.transactionId,
          providerData: result as any,
        },
      });
      throw new BadRequestException(result.error || 'Apple IAP verification failed');
    }

    // 4. Credit atomic + record. Use Apple transactionId as providerTxn so
    //    the unique-lookup in step 1 catches future replays.
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId: opts.userId,
          packageId: pkg.id,
          provider: PaymentProvider.APPLE_IAP,
          amount: pkg.priceVND,
          coinAmount: pkg.coinAmount,
          status: PaymentStatus.COMPLETED,
          txnRef: `apple-${opts.transactionId}`,
          providerTxn: opts.transactionId,
          providerData: result.raw as any,
          paidAt: new Date(),
        },
      });

      const wallet = await this.wallet.creditPurchasedExternal(
        tx,
        opts.userId,
        pkg.coinAmount,
      );
      await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          amount: pkg.coinAmount,
          type: TransactionType.DEPOSIT,
          description: `Apple IAP (${pkg.name}, txn ${opts.transactionId})`,
          referenceId: created.id,
        },
      });
      return created;
    });

    return { payment, alreadyCredited: false };
  }

  /**
   * Verify a Google Play Billing purchase and credit the wallet. Idempotent
   * by Google's orderId — replays are no-ops.
   */
  async redeemGooglePlay(opts: {
    userId: string;
    productId: string;
    purchaseToken: string;
  }) {
    if (!opts.productId || !opts.purchaseToken) {
      throw new BadRequestException('Thiếu productId hoặc purchaseToken');
    }

    // 1. Verify with Google first to learn the orderId — Google's orderId is
    //    the authoritative idempotency key (purchaseToken can rotate on
    //    Subscriptions but is unique enough for consumables). Skeleton:
    //    valid=false until real impl is wired.
    const result = await this.googlePlay.verifyPurchase({
      productId: opts.productId,
      purchaseToken: opts.purchaseToken,
    });

    // 2. Map productId → server CoinPackage.
    const pkg = await this.prisma.coinPackage.findUnique({
      where: { googleProductId: opts.productId },
    });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException(`Không tìm thấy gói coin cho productId "${opts.productId}" (cấu hình googleProductId trên CoinPackage).`);
    }

    if (!result.valid) {
      await this.prisma.payment.create({
        data: {
          userId: opts.userId,
          packageId: pkg.id,
          provider: PaymentProvider.GOOGLE_PLAY,
          amount: pkg.priceVND,
          coinAmount: pkg.coinAmount,
          status: PaymentStatus.FAILED,
          txnRef: `google-${opts.purchaseToken.slice(0, 32)}`,
          providerTxn: result.transactionId || null,
          providerData: result as any,
        },
      });
      throw new BadRequestException(result.error || 'Google Play verification failed');
    }

    const orderId = result.transactionId!;

    // 3. Idempotency after we have orderId. Replays no-op.
    const existing = await this.prisma.payment.findFirst({
      where: { provider: PaymentProvider.GOOGLE_PLAY, providerTxn: orderId },
    });
    if (existing) {
      this.logger.log(`Google Play replay for order ${orderId} — returning existing payment ${existing.id}`);
      return { payment: existing, alreadyCredited: existing.status === PaymentStatus.COMPLETED };
    }

    // 4. Credit atomic + record.
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId: opts.userId,
          packageId: pkg.id,
          provider: PaymentProvider.GOOGLE_PLAY,
          amount: pkg.priceVND,
          coinAmount: pkg.coinAmount,
          status: PaymentStatus.COMPLETED,
          txnRef: `google-${orderId}`,
          providerTxn: orderId,
          providerData: result.raw as any,
          paidAt: new Date(),
        },
      });

      const wallet = await this.wallet.creditPurchasedExternal(
        tx,
        opts.userId,
        pkg.coinAmount,
      );
      await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          amount: pkg.coinAmount,
          type: TransactionType.DEPOSIT,
          description: `Google Play (${pkg.name}, order ${orderId})`,
          referenceId: created.id,
        },
      });
      return created;
    });

    return { payment, alreadyCredited: false };
  }

  /**
   * Handle Apple App Store Server Notifications V2 — refund / cancellation
   * webhooks. Skeleton: persist the signed JWS payload for audit; the real
   * impl should verify the JWS, decode notificationType (e.g. REFUND), look
   * up the matching Payment by transactionId, and decide whether to claw
   * back coins (best-effort — author may have already spent them, in which
   * case platform absorbs the loss).
   */
  async handleAppleWebhook(body: unknown) {
    this.logger.warn(
      `Apple webhook received (skeleton — JWS not verified, no coins clawed back): ${JSON.stringify(body).slice(0, 300)}`,
    );
    return { ok: true };
  }

  /**
   * Handle Google Real-time Developer Notifications — Pub/Sub push body with
   * a base64-encoded JSON message. Skeleton: log + ack. Real impl should
   * decode message.data, handle SUBSCRIPTION_REVOKED / PURCHASE_VOIDED, etc.
   */
  async handleGoogleWebhook(body: unknown) {
    this.logger.warn(
      `Google webhook received (skeleton — message not decoded, no coins clawed back): ${JSON.stringify(body).slice(0, 300)}`,
    );
    return { ok: true };
  }
}
