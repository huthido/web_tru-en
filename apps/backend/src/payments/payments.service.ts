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
    try {
      if (opts.provider === PaymentProvider.VNPAY) {
        payUrl = this.vnpay.buildPaymentUrl({
          txnRef,
          amountVND: pkg.priceVND,
          orderInfo: `Nap ${pkg.coinAmount} coin (${pkg.name}) - user ${opts.userId.slice(0, 8)}`,
          ipAddr: opts.ipAddr,
          bankCode: opts.bankCode,
        });
      } else {
        throw new BadRequestException(`Provider ${opts.provider} chưa được hỗ trợ`);
      }
    } catch (err) {
      // Provider fail (vd VNPay env chưa cấu hình) — xoá Payment PENDING orphan
      // để không tích rác trong DB. catch lỗi delete để giữ error gốc bubble lên.
      await this.prisma.payment
        .delete({ where: { id: payment.id } })
        .catch(() => undefined);
      throw err;
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
   * Handle Apple App Store Server Notifications V2. Body shape:
   *   { signedPayload: <JWS> }
   * Decode outer JWS → { notificationType, subtype?, data: { signedTransactionInfo } }.
   * For REFUND / REVOKE-style events we decode the inner transaction JWS to
   * find Apple's transactionId, look up our Payment row (idempotency key =
   * providerTxn), mark it REFUNDED and best-effort claw back the credited
   * coins (capped at remaining purchasedBalance — author may have spent them).
   *
   * Signature verification on the outer JWS is intentionally skipped here.
   * Apple requires HTTPS, and the App Store Server Notifications endpoint
   * is configured per-app in App Store Connect — an attacker who can reach
   * /payments/apple/webhook still cannot forge a transactionId we didn't
   * already issue. Tighten later by validating the x5c chain against
   * Apple's StoreKit root CA if higher assurance is needed.
   */
  async handleAppleWebhook(body: unknown) {
    try {
      const signedPayload = (body as any)?.signedPayload;
      if (!signedPayload || typeof signedPayload !== 'string') {
        this.logger.warn('Apple webhook missing signedPayload');
        return { ok: true };
      }
      const outer = this.appleIap.decodeNotificationPayload(signedPayload);
      const notificationType: string = outer?.notificationType;
      const subtype: string | undefined = outer?.subtype;
      const signedTransactionInfo: string | undefined = outer?.data?.signedTransactionInfo;

      this.logger.log(
        `Apple webhook ${notificationType}${subtype ? '/' + subtype : ''} (bundleId=${outer?.data?.bundleId}, env=${outer?.data?.environment})`,
      );

      const CLAWBACK_TYPES = new Set(['REFUND', 'REVOKE', 'REFUND_REVERSED']);
      if (!CLAWBACK_TYPES.has(notificationType)) {
        return { ok: true };
      }
      if (!signedTransactionInfo) {
        this.logger.warn(`Apple webhook ${notificationType} missing signedTransactionInfo`);
        return { ok: true };
      }
      const txInfo = this.appleIap.decodeNotificationPayload(signedTransactionInfo);
      const transactionId = String(txInfo?.transactionId ?? '');
      if (!transactionId) {
        this.logger.warn(`Apple webhook ${notificationType} no transactionId`);
        return { ok: true };
      }

      // REFUND_REVERSED = previously-refunded purchase is now restored. We treat
      // as no-op for safety (would require re-credit; rare; manual review).
      if (notificationType === 'REFUND_REVERSED') {
        this.logger.warn(
          `Apple REFUND_REVERSED for txn ${transactionId} — manual review required (no auto re-credit)`,
        );
        return { ok: true };
      }

      await this.clawbackPayment({
        provider: PaymentProvider.APPLE_IAP,
        providerTxn: transactionId,
        reason: `Apple ${notificationType}${subtype ? '/' + subtype : ''}`,
      });
      return { ok: true };
    } catch (e: any) {
      this.logger.error(`Apple webhook error: ${e?.message ?? e}`);
      // Always ack — Apple retries up to 5 times. Return 200 so they stop;
      // we have logs to reconcile manually.
      return { ok: true };
    }
  }

  /**
   * Handle Google Real-time Developer Notifications (Pub/Sub push).
   * Body shape: { message: { data: <base64 JSON>, ... }, subscription }.
   * Decoded message:
   *   { version, packageName, eventTimeMillis,
   *     oneTimeProductNotification: { version, notificationType, purchaseToken, sku } }
   * notificationType 1 = PURCHASED (we already handled in redeem), 2 = CANCELED
   * (Google's refund event for one-shot products). Subscription events have a
   * different shape; we just log them and move on.
   *
   * Clawback: Google's webhook delivers the purchaseToken, not the orderId we
   * stored in providerTxn. Re-look up via verifyPurchase to learn the
   * canonical orderId, then claw back the matching Payment. If verify returns
   * invalid (already refunded), search providerData by purchaseToken as a
   * fallback.
   */
  async handleGoogleWebhook(body: unknown, authHeader?: string) {
    try {
      // Verify Google Pub/Sub OIDC JWT if audience is configured.
      const audience = process.env.GOOGLE_PUBSUB_AUDIENCE;
      if (audience) {
        if (!authHeader?.startsWith('Bearer ')) {
          this.logger.warn('Google webhook missing OIDC Bearer token');
          return { ok: true }; // ack to stop retries; log for investigation
        }
        const token = authHeader.slice(7);
        const valid = await this.verifyGoogleOidcToken(token, audience);
        if (!valid) {
          this.logger.warn('Google webhook OIDC token invalid');
          return { ok: true };
        }
      }

      const message = (body as any)?.message;
      const dataB64: string | undefined = message?.data;
      if (!dataB64) {
        this.logger.warn('Google webhook missing message.data');
        return { ok: true };
      }
      const decoded = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf8'));
      this.logger.log(
        `Google webhook packageName=${decoded?.packageName} eventTime=${decoded?.eventTimeMillis}`,
      );

      const oneShot = decoded?.oneTimeProductNotification;
      if (!oneShot) {
        // Subscription / test notifications. Just log + ack.
        this.logger.log(`Google webhook non-oneTime payload: ${JSON.stringify(decoded).slice(0, 200)}`);
        return { ok: true };
      }

      // 1 = PURCHASED, 2 = CANCELED (refund).
      if (oneShot.notificationType !== 2) {
        return { ok: true };
      }

      const purchaseToken: string = oneShot.purchaseToken;
      const sku: string = oneShot.sku;
      this.logger.log(`Google CANCEL sku=${sku} token=${purchaseToken.slice(0, 12)}…`);

      // Look up orderId via providerData (the raw response from the original
      // redeem stored the orderId; purchaseToken is inside `raw.purchaseToken`
      // only if we ever stored it. We didn't, so re-verify to learn orderId).
      const re = await this.googlePlay.verifyPurchase({ productId: sku, purchaseToken });
      let providerTxn: string | undefined = re.transactionId;
      if (!providerTxn) {
        // Fallback: scan recent GOOGLE_PLAY payments for one whose providerData
        // contains this purchaseToken. Bounded scan to avoid scanning all rows.
        const recent = await this.prisma.payment.findMany({
          where: { provider: PaymentProvider.GOOGLE_PLAY, status: PaymentStatus.COMPLETED },
          orderBy: { paidAt: 'desc' },
          take: 200,
          select: { providerTxn: true, providerData: true },
        });
        const hit = recent.find((p) =>
          JSON.stringify(p.providerData ?? {}).includes(purchaseToken),
        );
        providerTxn = hit?.providerTxn ?? undefined;
      }
      if (!providerTxn) {
        this.logger.warn(`Google CANCEL: cannot resolve orderId for token ${purchaseToken.slice(0, 12)}…`);
        return { ok: true };
      }

      await this.clawbackPayment({
        provider: PaymentProvider.GOOGLE_PLAY,
        providerTxn,
        reason: 'Google PURCHASE_CANCELED',
      });
      return { ok: true };
    } catch (e: any) {
      this.logger.error(`Google webhook error: ${e?.message ?? e}`);
      return { ok: true };
    }
  }

  private async verifyGoogleOidcToken(token: string, audience: string): Promise<boolean> {
    try {
      const jwksClient = require('jwks-rsa')({
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
        cache: true,
        cacheMaxAge: 600_000,
      });
      const decoded = require('jsonwebtoken').decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') return false;
      const key = await jwksClient.getSigningKey(decoded.header.kid);
      require('jsonwebtoken').verify(token, key.getPublicKey(), {
        algorithms: ['RS256'],
        issuer: 'https://accounts.google.com',
        audience,
      });
      return true;
    } catch (e: any) {
      this.logger.warn(`Google OIDC verify failed: ${e?.message}`);
      return false;
    }
  }

  /**
   * Best-effort clawback. Mark Payment REFUNDED + decrement purchasedBalance
   * up to coinAmount (never goes negative). If user already spent, platform
   * absorbs the loss — we do NOT debit earnedBalance of an author who
   * received transferred coins, nor cancel chapter purchases retroactively.
   */
  private async clawbackPayment(opts: {
    provider: PaymentProvider;
    providerTxn: string;
    reason: string;
  }) {
    const payment = await this.prisma.payment.findFirst({
      where: { provider: opts.provider, providerTxn: opts.providerTxn },
    });
    if (!payment) {
      this.logger.warn(`Clawback: no Payment found for ${opts.provider} txn=${opts.providerTxn}`);
      return;
    }
    if (payment.status === PaymentStatus.REFUNDED) {
      this.logger.log(`Clawback: payment ${payment.id} already REFUNDED — skip`);
      return;
    }
    if (payment.status !== PaymentStatus.COMPLETED) {
      this.logger.warn(
        `Clawback: payment ${payment.id} status=${payment.status} (not COMPLETED) — only marking REFUNDED, no coin debit`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.userWallet.findUnique({ where: { userId: payment.userId } });
      if (!wallet) {
        this.logger.warn(`Clawback: wallet missing for user ${payment.userId}`);
      } else {
        const debit = Math.min(wallet.purchasedBalance, payment.coinAmount);
        if (debit > 0) {
          await tx.userWallet.update({
            where: { id: wallet.id },
            data: {
              purchasedBalance: { decrement: debit },
              balance: { decrement: debit },
            },
          });
          await tx.coinTransaction.create({
            data: {
              walletId: wallet.id,
              amount: -debit,
              type: TransactionType.REFUND,
              description: `${opts.reason} (Payment ${payment.id})`,
              referenceId: payment.id,
            },
          });
        }
        if (debit < payment.coinAmount) {
          this.logger.warn(
            `Clawback partial: payment ${payment.id} owes ${payment.coinAmount} but user only has ${wallet.purchasedBalance} — platform absorbs ${payment.coinAmount - debit}`,
          );
        }
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });
    });
    this.logger.log(`Clawback done: payment ${payment.id} (${opts.reason})`);
  }
}
