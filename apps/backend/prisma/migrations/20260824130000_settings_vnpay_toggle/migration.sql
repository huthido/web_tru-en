-- Admin ẩn/hiện cổng VNPay trong "Hình thức thanh toán" ở Cửa hàng
-- (mặc định hiện; tắt khi chưa cấu hình VNPay để chỉ còn chuyển khoản).
ALTER TABLE "settings" ADD COLUMN "vnpayPaymentEnabled" BOOLEAN NOT NULL DEFAULT true;
