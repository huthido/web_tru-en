/**
 * URL gốc của site dùng cho canonical, og:url, sitemap, robots.
 *
 * Trước đây mỗi nơi tự viết `process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'`.
 * Biến đó chưa bao giờ được set trên production nên toàn bộ canonical/og:url/sitemap
 * phát ra `http://localhost:3000` — tức là bảo Google "trang chính thức của nội dung
 * này nằm ở localhost", khiến không trang nào được index và AdSense đánh giá site
 * là "nội dung có giá trị thấp".
 *
 * Ở đây có một fallback cứng cho production: dù quên set env, site vẫn KHÔNG BAO GIỜ
 * phát ra URL localhost ra ngoài.
 */

/** Domain thật của production — dùng khi env thiếu hoặc trỏ localhost. */
const PRODUCTION_SITE_URL = 'https://yeuyeu.net';

const LOCAL_HOST_PATTERN = /(localhost|127\.0\.0\.1|0\.0\.0\.0)/i;

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getSiteUrl(): string {
  // NEXT_PUBLIC_APP_URL đã tồn tại sẵn trong docker-compose nên dùng làm nguồn dự phòng.
  const configured = normalize(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  );

  if (configured && !LOCAL_HOST_PATTERN.test(configured)) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_SITE_URL;
  }

  return configured || 'http://localhost:3000';
}

/** Ghép đường dẫn tương đối thành URL tuyệt đối (`/truyen/abc` → `https://…/truyen/abc`). */
export function absoluteUrl(path: string = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
