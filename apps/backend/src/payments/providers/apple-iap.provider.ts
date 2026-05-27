import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'node:crypto';

// SHA-256 fingerprints of Apple's known root CAs used for
// App Store Server Notifications (v2 / StoreKit 2).
// Source: https://www.apple.com/certificateauthority/
// Format: colon-separated uppercase hex as returned by Node.js X509Certificate.fingerprint256.
// Verify with: openssl x509 -in AppleRootCA-G3.cer -inform DER -fingerprint -sha256
//   Apple Root CA - G3: 63:34:3A:BF:...
//   Apple Root CA:      B0:B1:73:0E:...
const APPLE_ROOT_CA_FINGERPRINTS = new Set([
    // Apple Root CA - G3
    '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:2D:3F:2B:4E:27:B6:72:2E:4B:3D:1C:EB:9D:6B:C7:F3:D8:5C:36:13:0A',
    // Apple Root CA
    'B0:B1:73:0E:CB:C7:FF:45:05:14:2C:49:F1:29:5E:6E:DA:6B:CA:ED:B5:99:B0:44:7C:3D:0C:5E:D2:CC:49:56',
]);

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

    /** Convert a base64-encoded DER certificate to PEM format. */
    private derToPem(derB64: string): string {
        const lines = derB64.match(/.{1,64}/g)?.join('\n') ?? derB64;
        return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----`;
    }

    /**
     * Verify a JWS signed by Apple using the embedded x5c certificate chain,
     * then decode and return the payload. Used for webhook signedPayload where
     * the message originates from the network and must be cryptographically
     * authenticated before we act on it.
     */
    private verifyAndDecodeJws(jws: string): any {
        const b64 = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');

        const parts = jws.split('.');
        if (parts.length !== 3) throw new Error('Malformed JWS');
        const [headerB64, , ] = parts;

        // Decode header to get x5c chain
        const headerJson = Buffer.from(b64(headerB64), 'base64').toString('utf8');
        const header = JSON.parse(headerJson);
        const x5c: string[] | undefined = header.x5c;
        if (!x5c || x5c.length < 2) {
            throw new Error('JWS header missing x5c chain (need at least leaf + intermediate)');
        }

        // Build X509Certificate objects from DER (base64-encoded in x5c)
        const certs = x5c.map((derB64) => new crypto.X509Certificate(this.derToPem(derB64)));

        // Verify every cert is currently valid (prevents replay with expired chains)
        const now = new Date();
        for (let i = 0; i < certs.length; i++) {
            if (now < new Date(certs[i].validFrom) || now > new Date(certs[i].validTo)) {
                throw new Error(`x5c cert at index ${i} is expired or not yet valid`);
            }
        }

        // Verify the chain: each cert must be signed by the next one
        for (let i = 0; i < certs.length - 1; i++) {
            if (!certs[i].verify(certs[i + 1].publicKey)) {
                throw new Error(`x5c chain verification failed at index ${i}`);
            }
        }

        // Root must be self-signed (prevents intermediate-only chains)
        const root = certs[certs.length - 1];
        if (!root.verify(root.publicKey)) {
            throw new Error('x5c root cert is not self-signed');
        }

        // Pin root to known Apple root CA SHA-256 fingerprints (cryptographically bound to public key)
        const rootFp = root.fingerprint256;
        if (!APPLE_ROOT_CA_FINGERPRINTS.has(rootFp)) {
            throw new Error(`x5c root cert fingerprint not in Apple root CA allowlist: ${rootFp}`);
        }

        // Extract the leaf cert's public key and use it to verify the JWS signature
        const leafPublicKeyPem = certs[0].publicKey.export({ format: 'pem', type: 'spki' }) as string;
        return jwt.verify(jws, leafPublicKeyPem, { algorithms: ['ES256'] });
    }

    /** Decode the OUTER signedPayload of an App Store Server Notification V2. */
    decodeNotificationPayload(signedPayload: string): any {
        return this.verifyAndDecodeJws(signedPayload);
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
