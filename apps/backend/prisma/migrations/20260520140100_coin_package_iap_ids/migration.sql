-- Map server coin packages to Apple App Store Connect / Google Play Console
-- product IDs so the mobile app can look up the right SKU. Nullable —
-- web-only packages (sold via VNPay) leave these unset; mobile-sold
-- packages must populate the matching column. UNIQUE prevents the same
-- store SKU from pointing at two server rows (which would silently break
-- receipt validation).

ALTER TABLE "coin_packages"
  ADD COLUMN "appleProductId"  TEXT,
  ADD COLUMN "googleProductId" TEXT;

CREATE UNIQUE INDEX "coin_packages_appleProductId_key"  ON "coin_packages" ("appleProductId");
CREATE UNIQUE INDEX "coin_packages_googleProductId_key" ON "coin_packages" ("googleProductId");
