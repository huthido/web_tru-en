import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, androidpublisher_v3 } from 'googleapis';

export interface GooglePlayVerifyResult {
    valid: boolean;
    productId?: string;
    transactionId?: string;
    purchaseState?: number;
    raw?: unknown;
    error?: string;
}

@Injectable()
export class GooglePlayProvider {
    private readonly logger = new Logger(GooglePlayProvider.name);
    private readonly packageName: string;
    private readonly serviceAccountRaw: string;
    private cachedClient: androidpublisher_v3.Androidpublisher | null = null;

    constructor(private config: ConfigService) {
        this.packageName = this.config.get<string>('GOOGLE_PLAY_PACKAGE_NAME') || '';
        this.serviceAccountRaw = this.config.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') || '';
    }

    isConfigured(): boolean {
        return !!(this.packageName && this.serviceAccountRaw);
    }

    private getClient(): androidpublisher_v3.Androidpublisher {
        if (this.cachedClient) return this.cachedClient;
        let creds: { client_email: string; private_key: string };
        try {
            // Try inline JSON first, fall back to base64-decoded JSON.
            try {
                creds = JSON.parse(this.serviceAccountRaw);
            } catch {
                const decoded = Buffer.from(this.serviceAccountRaw, 'base64').toString('utf8');
                creds = JSON.parse(decoded);
            }
        } catch (e: any) {
            throw new Error(`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON parse error: ${e?.message}`);
        }
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: creds.client_email,
                private_key: creds.private_key.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });
        this.cachedClient = google.androidpublisher({ version: 'v3', auth });
        return this.cachedClient;
    }

    /**
     * Verify a one-shot consumable purchase via Android Publisher API and
     * acknowledge it (Google auto-refunds if not acknowledged within 72h).
     */
    async verifyPurchase(input: {
        productId: string;
        purchaseToken: string;
    }): Promise<GooglePlayVerifyResult> {
        if (!this.isConfigured()) {
            this.logger.warn('Google Play verifyPurchase called but provider is not configured');
            return {
                valid: false,
                error: 'Google Play integration is not configured. Set GOOGLE_PLAY_PACKAGE_NAME and GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.',
            };
        }

        try {
            const client = this.getClient();
            const lookup = await client.purchases.products.get({
                packageName: this.packageName,
                productId: input.productId,
                token: input.purchaseToken,
            });
            const data = lookup.data;

            if (data.purchaseState !== 0) {
                return {
                    valid: false,
                    productId: input.productId,
                    purchaseState: data.purchaseState ?? undefined,
                    raw: data,
                    error: `purchaseState=${data.purchaseState} (0=PURCHASED, 1=CANCELED, 2=PENDING)`,
                };
            }
            if (!data.orderId) {
                return { valid: false, error: 'Google response missing orderId', raw: data };
            }

            // Acknowledge if not already (best-effort — never throw on this).
            if (data.acknowledgementState === 0) {
                try {
                    await client.purchases.products.acknowledge({
                        packageName: this.packageName,
                        productId: input.productId,
                        token: input.purchaseToken,
                    });
                } catch (e: any) {
                    this.logger.warn(`Google acknowledge failed (non-fatal): ${e?.message}`);
                }
            }

            return {
                valid: true,
                productId: input.productId,
                transactionId: data.orderId,
                purchaseState: 0,
                raw: data,
            };
        } catch (e: any) {
            this.logger.error(`Google verify exception: ${e?.message ?? e}`);
            return { valid: false, error: `Google verify exception: ${e?.message ?? e}` };
        }
    }
}
