import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Verification result the service layer consumes. Designed to be backed by
 * either the legacy verifyReceipt endpoint OR App Store Server API V2
 * (JWS-signed JWS_TRANSACTION). The shape is provider-agnostic on purpose
 * so the service does not need to change when the live impl is swapped in.
 */
export interface AppleIapVerifyResult {
    valid: boolean;
    /** Apple's product id (= SKU on App Store Connect). Maps to CoinPackage.appleProductId. */
    productId?: string;
    /** Apple's per-purchase transaction id. UNIQUE per consumable. Used for idempotency. */
    transactionId?: string;
    /** Apple's original transaction id (= subscription origin). Same as transactionId for one-shot. */
    originalTransactionId?: string;
    /** "Sandbox" | "Production". */
    environment?: 'Sandbox' | 'Production' | string;
    /** Raw payload kept on the Payment row for audit / refund reconciliation. */
    raw?: unknown;
    /** Human-readable reason when valid=false. */
    error?: string;
}

@Injectable()
export class AppleIapProvider {
    private readonly logger = new Logger(AppleIapProvider.name);
    private readonly bundleId: string;
    private readonly sharedSecret: string;
    private readonly useSandbox: boolean;

    constructor(private config: ConfigService) {
        this.bundleId = this.config.get<string>('APPLE_IAP_BUNDLE_ID') || '';
        this.sharedSecret = this.config.get<string>('APPLE_IAP_SHARED_SECRET') || '';
        this.useSandbox = this.config.get<string>('APPLE_IAP_SANDBOX') === 'true';
    }

    isConfigured(): boolean {
        return !!(this.bundleId && this.sharedSecret);
    }

    /**
     * Verify a JWS-signed transaction (App Store Server API V2) or a base64
     * receipt (legacy verifyReceipt). For the skeleton this returns a
     * not-configured error — fill in the live HTTPS call to
     *   POST https://buy.itunes.apple.com/verifyReceipt
     * (production) / sandbox.itunes.apple.com (sandbox) with
     *   { "receipt-data": <base64>, "password": sharedSecret }
     * OR — preferred — verify the JWS via Apple's published JWKS at
     *   https://appleid.apple.com/auth/keys
     * and check the bundle id + product id + environment fields on the
     * decoded JWS_TRANSACTION payload.
     *
     * Wire it once Apple Developer credentials are available — every
     * downstream caller (PaymentsService.redeemAppleIap) already assumes
     * this shape and will start working as soon as `valid: true` returns.
     */
    async verifyPurchase(input: {
        productId: string;
        transactionId: string;
        receipt: string; // JWS or base64 receipt
    }): Promise<AppleIapVerifyResult> {
        if (!this.isConfigured()) {
            this.logger.warn('Apple IAP verifyPurchase called but provider is not configured');
            return {
                valid: false,
                error: 'Apple IAP integration is not configured on this server. Set APPLE_IAP_BUNDLE_ID and APPLE_IAP_SHARED_SECRET.',
            };
        }

        // TODO(real-impl): call App Store Server API V2 — verify JWS via Apple
        //   JWKS, check `bid` (bundle id) === this.bundleId, check
        //   `inAppOwnershipType` === 'PURCHASED', check `productId` against
        //   the claimed value, check `transactionId` is fresh (not in our DB).
        //   Return the decoded payload on the `raw` field for audit.
        this.logger.warn(
            `Apple IAP verify stub returning invalid (productId=${input.productId} txn=${input.transactionId}) — real impl pending`,
        );
        return {
            valid: false,
            productId: input.productId,
            transactionId: input.transactionId,
            error: 'Apple IAP verification not yet implemented (skeleton). Replace AppleIapProvider.verifyPurchase to enable.',
        };
    }
}
