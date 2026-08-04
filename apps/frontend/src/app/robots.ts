import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site-url';

/**
 * Các nhánh KHÔNG cho crawler vào: trang quản trị, khu vực tác giả, ví/thanh toán,
 * trang cá nhân cần đăng nhập, luồng auth và trang xem quảng cáo.
 *
 * Trước đây danh sách này còn là `/admin`, `/author` — route đã Việt hoá từ lâu
 * (`/quan-tri`, `/tac-gia`) nên bot vẫn crawl được hàng chục trang dashboard, mà
 * với khách chưa đăng nhập chúng đều rỗng → Google đếm chúng là trang vô giá trị.
 */
const DISALLOW = [
  '/api/',
  '/_next/',
  '/quan-tri',
  '/tac-gia',
  '/auth/',
  '/dang-nhap',
  '/dang-ky',
  '/quen-mat-khau',
  '/dat-lai-mat-khau',
  '/tai-khoan',
  '/thu-vien',
  '/yeu-thich',
  '/dang-theo-doi',
  '/lich-su',
  '/thong-bao',
  '/vi-xu',
  '/chuyen-xu',
  '/ung-ho',
  '/xem-quang-cao',
  '/bao-tri',
  '/ngoai-tuyen',
  // Trang nạp xu bọc <ProtectedRoute>: khách chưa đăng nhập chỉ thấy màn chờ.
  '/cua-hang',
  // Form đặt quảng cáo, client-only — không có nội dung để index.
  '/quang-cao',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
