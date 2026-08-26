-- Banner footer hỗ trợ SLIDESHOW nhiều ảnh: footerBannerSlides = JSON mảng
-- [{image, link?}]. Ảnh đơn cũ (footerBannerImage/Link) giữ để tương thích.
ALTER TABLE "settings" ADD COLUMN "footerBannerSlides" JSONB NOT NULL DEFAULT '[]';
