-- AlterTable: settings — cấu hình kênh thanh toán thủ công (chuyển khoản, admin
-- xác nhận tay). Tất cả nullable/không bắt buộc để không phá dữ liệu sẵn có.
ALTER TABLE "settings"
  ADD COLUMN "manualPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "manualPaymentBankBin" TEXT,
  ADD COLUMN "manualPaymentBankName" TEXT,
  ADD COLUMN "manualPaymentAccountNumber" TEXT,
  ADD COLUMN "manualPaymentAccountHolder" TEXT,
  ADD COLUMN "manualPaymentInstructions" TEXT;
