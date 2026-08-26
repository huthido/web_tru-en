-- Footer giờ chỉ hiển thị ở trang cá nhân (/u/[username]). Admin có thể thay
-- hẳn footer bằng MỘT ảnh banner: bật footerBannerEnabled + đặt footerBannerImage
-- (footerBannerLink tuỳ chọn = link bấm vào banner).
ALTER TABLE "settings" ADD COLUMN "footerBannerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "settings" ADD COLUMN "footerBannerImage" TEXT;
ALTER TABLE "settings" ADD COLUMN "footerBannerLink" TEXT;
