-- Extend PaymentProvider enum with Apple IAP + Google Play Billing.
-- These route through WalletService.creditPurchasedExternal, same as VNPay,
-- but represent App Store / Play Store purchases (Apple §3.1.1 compliance).
-- Kept in a separate migration from the column-add so the enum ALTER does
-- not collide with table-level DDL inside one transaction.

ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'APPLE_IAP';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_PLAY';
