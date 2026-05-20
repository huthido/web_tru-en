import { apiClient } from './client';

/**
 * Mobile-only payment endpoints (web uses VNPay flow instead).
 * After the user completes an Apple IAP or Google Play Billing purchase
 * with the native SDK (`expo-in-app-purchases` or a community lib), POST
 * the resulting receipt / purchase token here.
 *
 * Server-side: PaymentsService.redeemAppleIap / redeemGooglePlay verifies
 * with Apple/Google, maps productId → CoinPackage, credits purchasedBalance.
 * Idempotent — replaying the same transactionId / orderId is a no-op.
 *
 * See: apps/backend/src/payments/providers/{apple-iap,google-play}.provider.ts
 */
export const PaymentsApi = {
    async redeemAppleIap(input: {
        productId: string;
        transactionId: string;
        receipt: string;
    }) {
        const res = await apiClient.post('/payments/apple/redeem', input);
        return res.data.data ?? res.data;
    },

    async redeemGooglePlay(input: {
        productId: string;
        purchaseToken: string;
    }) {
        const res = await apiClient.post('/payments/google/redeem', input);
        return res.data.data ?? res.data;
    },
};
