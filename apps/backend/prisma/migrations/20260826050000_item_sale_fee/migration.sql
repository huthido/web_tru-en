-- Phí nền tảng % khi người mua VẬT PHẨM của truyện (tách riêng với phí chương/ủng hộ).
ALTER TABLE "settings" ADD COLUMN "itemSaleFeePercent" INTEGER NOT NULL DEFAULT 2;
