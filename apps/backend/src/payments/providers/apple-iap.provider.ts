import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

/**
 * Verification result the service layer consumes. Backed by App Store Server
 * API V2 — server-to-server lookup of a transactionId returns a JWS-signed
 * payload that we decode for the canonical productId / bundleId / ownership
 * fields.
 */
export interface AppleIapVerifyResult {
    valid: boolean;
    productId?: string;
    transactionId?: string;
    originalTransactionId?: string;
    environment?: 'Sandbox' | 'Production' | string;
    raw?: unknown;
    error?: string;
}

@Injectable()
export class AppleIapProvider {
    private readonly logger = new Logger(AppleIapProvider.name);
    private readonly bundleId: string;
    private readonly keyId: string;
    private readonly issuerId: string;
    private readonly privateKey: string;
    private readonly useSandbox: boolean;

    private cachedToken: { token: string; expiresAt: number } | null = null;

    constructor(private config: ConfigService) {
        this.bundleId = this.config.get<string>('APPLE_IAP_BUNDLE_ID') || '';
        this.keyId = this.config.get<string>('APPLE_IAP_KEY_ID') || '';
        this.issuerId = this.config.get<string>('APPLE_IAP_ISSUER_ID') || '';
        this.privateKey = (this.config.get<string>('APPLE_IAP_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
        this.useSandbox = this.config.get<string>('APPLE_IAP_SANDBOX') === 'true';
    }

    isConfigured(): boolean {
        return !!(this.bundleId && this.keyId && this.issuerId && this.privateKey);
    }

    private get apiBase(): string {
        return this.useSandbox
            ? 'https://api.storekit-sandbox.itunes.apple.com'
            : 'https://api.storekit.itunes.apple.com';
    }

    /** Mint App Store Server API JWT bearer (ES256, ≤1h, cached). */
    private signBearer(): string {
        const now = Date.now();
        if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
            return this.cachedToken.token;
        }
        const iat = Math.floor(now / 1000);
        const exp = iat + 30 * 60;
        const token = jwt.sign(
            { iss: this.issuerId, iat, exp, aud: 'appstoreconnect-v1', bid: this.bundleId },
            this.privateKey,
            { algorithm: 'ES256', header: { alg: 'ES256', kid: this.keyId, typ: 'JWT' } as any },
        );
        this.cachedToken = { token, expiresAt: exp * 1000 };
        return token;
    }

    /**
     * Decode a JWS payload WITHOUT signature verification. Safe here because
     * we obtained the JWS via authenticated HTTPS call to Apple's own API —
     * TLS guarantees the response's integrity. For mobile-supplied receipts
     * (StoreKit 2 client-side flow) the signature MUST be verified against
     * Apple's x5c chain; that path is not currently used.
     */
    private decodeJwsPayload(jws: string): any {
        const parts = jws.split('.');
        if (parts.length !== 3) throw new Error('Malformed JWS');
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
        return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    }

    /** Decode the OUTER signedPayload of an App Store Server Notification V2. */
    decodeNotificationPayload(signedPayload: string): any {
        return this.decodeJwsPayload(signedPayload);
    }

    /**
     * Verify a one-shot consumable purchase by looking up the transactionId on
     * App Store Server API V2. Returns the canonical product fields decoded
     * from Apple's JWS response.
     */
    async verifyPurchase(input: {
        productId: string;
        transactionId: string;
        receipt: string;
    }): Promise<AppleIapVerifyResult> {
        if (!this.isConfigured()) {
            this.logger.warn('Apple IAP verifyPurchase called but provider is not configured');
            return {
                valid: false,
                error: 'Apple IAP integration is not configured on this server. Set APPLE_IAP_BUNDLE_ID, APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY (and APPLE_IAP_SANDBOX=true in dev).',
            };
        }

        try {
            const bearer = this.signBearer();
            const url = `${this.apiBase}/inApps/v1/transactions/${encodeURIComponent(input.transactionId)}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: { Authorization: `Bearer ${bearer}` },
            });
            if (!res.ok) {
                const body = await res.text();
                this.logger.warn(`Apple lookup HTTP ${res.status}: ${body.slice(0, 200)}`);
                return { valid: false, error: `Apple lookup HTTP ${res.status}` };
            }
            const data = (await res.json()) as { signedTransactionInfo?: string };
            if (!data.signedTransactionInfo) {
                return { valid: false, error: 'Apple response missing signedTransactionInfo' };
            }
            const payload = this.decodeJwsPayload(data.signedTransactionInfo);

            if (payload.bundleId !== this.bundleId) {
                return { valid: false, error: `Bundle id mismatch (expected ${this.bundleId}, got ${payload.bundleId})` };
            }
            if (payload.productId !== input.productId) {
                return { valid: false, error: `Product id mismatch (expected ${input.productId}, got ${payload.productId})` };
            }
            if (payload.inAppOwnershipType && payload.inAppOwnershipType !== 'PURCHASED') {
                return { valid: false, error: `Ownership: ${payload.inAppOwnershipType}` };
            }
            return {
                valid: true,
                productId: payload.productId,
                transactionId: String(payload.transactionId),
                originalTransactionId: String(payload.originalTransactionId ?? payload.transactionId),
                environment: payload.environment,
                raw: payload,
            };
        } catch (e: any) {
            this.logger.error(`Apple verify exception: ${e?.message ?? e}`);
            return { valid: false, error: `Apple verify exception: ${e?.message ?? e}` };
        }
    }
}
