import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Verification result for a Google Play Billing purchase. Same shape pattern
 * as AppleIapVerifyResult so the service layer treats both providers
 * identically.
 */
export interface GooglePlayVerifyResult {
    valid: boolean;
    /** SKU on Google Play Console. Maps to CoinPackage.googleProductId. */
    productId?: string;
    /** orderId from Google Play. UNIQUE per purchase. Used for idempotency. */
    transactionId?: string;
    /** purchaseState 0=PURCHASED, 1=CANCELED, 2=PENDING. We only credit on 0. */
    purchaseState?: number;
    /** Raw response from androidpublisher.purchases.products.get for audit. */
    raw?: unknown;
    /** Human-readable reason when valid=false. */
    error?: string;
}

@Injectable()
export class GooglePlayProvider {
    private readonly logger = new Logger(GooglePlayProvider.name);
    private readonly packageName: string;
    private readonly serviceAccountJson: string;

    constructor(private config: ConfigService) {
        this.packageName = this.config.get<string>('GOOGLE_PLAY_PACKAGE_NAME') || '';
        // Service account JSON inline (base64 or stringified). Alternatively
        // GOOGLE_APPLICATION_CREDENTIALS could be a path; the real impl
        // should support both.
        this.serviceAccountJson = this.config.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') || '';
    }

    isConfigured(): boolean {
        return !!(this.packageName && this.serviceAccountJson);
    }

    /**
     * Verify a one-shot purchase by calling Google's Android Publisher API
     *   GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{purchaseToken}
     * with an OAuth2 bearer from the service account
     * (scope: https://www.googleapis.com/auth/androidpublisher).
     *
     * The response includes `purchaseState`, `consumptionState`, `orderId`,
     * `purchaseTimeMillis`, `acknowledgementState`. We must also POST to the
     *   :acknowledge endpoint within 3 days or Google auto-refunds.
     *
     * Wire it once a service account + Play Console linkage exists. The
     * downstream service is already idempotent on orderId.
     */
    async verifyPurchase(input: {
        productId: string;
        purchaseToken: string;
    }): Promise<GooglePlayVerifyResult> {
        if (!this.isConfigured()) {
            this.logger.warn('Google Play verifyPurchase called but provider is not configured');
            return {
                valid: false,
                error: 'Google Play integration is not configured on this server. Set GOOGLE_PLAY_PACKAGE_NAME and GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.',
            };
        }

        // TODO(real-impl):
        //   1. Use googleapis or a JWT signer to mint a bearer for
        //      scope https://www.googleapis.com/auth/androidpublisher.
        //   2. GET .../purchases/products/{productId}/tokens/{purchaseToken}.
        //   3. Verify purchaseState === 0 (PURCHASED).
        //   4. POST .../acknowledge with empty body — required within 72h.
        //   5. Return { valid: true, productId, transactionId: orderId, raw }.
        this.logger.warn(
            `Google Play verify stub returning invalid (productId=${input.productId} token=${input.purchaseToken.slice(0, 8)}…) — real impl pending`,
        );
        return {
            valid: false,
            productId: input.productId,
            error: 'Google Play verification not yet implemented (skeleton). Replace GooglePlayProvider.verifyPurchase to enable.',
        };
    }
}
