// Sinh bộ icon thương hiệu YÊU — tim trắng trên nền đen (logo đen trắng
// thống nhất theo docs/Fix vài điểm trên app web.pdf).
//
// Chạy từ repo root:  node scripts/generate-brand-icons.mjs
// Yêu cầu: sharp (đã có trong node_modules root).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const FRONTEND_PUBLIC = path.resolve('apps/frontend/public');
const MOBILE_ASSETS = path.resolve('apps/mobile/assets');

// Heart path (viewBox 24x24) — cùng path với favicon-heart.svg cũ.
const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
// Tâm hình học của heart path trong viewBox 24.
const HEART_CX = 12;
const HEART_CY = 12.2;

/**
 * SVG vuông: nền đen (bo góc tuỳ chọn) + tim trắng giữa.
 * @param size       cạnh canvas (px)
 * @param radius     bán kính bo góc nền (0 = vuông full-bleed)
 * @param heartRatio tỉ lệ chiều rộng tim / cạnh canvas
 * @param bg         màu nền ('none' = trong suốt, chỉ còn tim trắng)
 */
function brandSvg(size, { radius = 0, heartRatio = 0.62, bg = '#000000' } = {}) {
  const scale = (size * heartRatio) / 20; // heart rộng ~20 unit trong viewBox 24
  const rect =
    bg === 'none'
      ? ''
      : `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      rect +
      `<g transform="translate(${size / 2},${size / 2}) scale(${scale}) translate(${-HEART_CX},${-HEART_CY})">` +
      `<path d="${HEART_PATH}" fill="#ffffff"/>` +
      `</g></svg>`,
  );
}

async function png(svgBuffer, outFile) {
  await sharp(svgBuffer).png().toFile(outFile);
  console.log('✓', outFile);
}

await mkdir(FRONTEND_PUBLIC, { recursive: true });
await mkdir(MOBILE_ASSETS, { recursive: true });

// ---- Frontend / PWA -------------------------------------------------------
// "any" icons: nền đen bo góc nhẹ (~22%) như icon launcher hiện đại.
await png(brandSvg(192, { radius: 42 }), path.join(FRONTEND_PUBLIC, 'icon-192.png'));
await png(brandSvg(512, { radius: 112 }), path.join(FRONTEND_PUBLIC, 'icon-512.png'));
// maskable: full-bleed, tim thu nhỏ vào safe zone (~52%).
await png(brandSvg(192, { heartRatio: 0.52 }), path.join(FRONTEND_PUBLIC, 'icon-maskable-192.png'));
await png(brandSvg(512, { heartRatio: 0.52 }), path.join(FRONTEND_PUBLIC, 'icon-maskable-512.png'));
// apple-touch-icon: iOS tự bo góc → full-bleed.
await png(brandSvg(180), path.join(FRONTEND_PUBLIC, 'apple-touch-icon.png'));

// ---- Mobile (Expo) --------------------------------------------------------
// icon.png: App Store/launcher gốc — full-bleed vuông, iOS tự bo.
await png(brandSvg(1024), path.join(MOBILE_ASSETS, 'icon.png'));
// adaptive-icon: foreground tim trắng trên nền trong suốt, thu vào safe zone;
// nền đen set qua app.config.js (adaptiveIcon.backgroundColor).
await png(brandSvg(1024, { bg: 'none', heartRatio: 0.46 }), path.join(MOBILE_ASSETS, 'adaptive-icon.png'));
// splash: nền đen, tim trắng nhỏ giữa màn.
{
  const W = 1242;
  const H = 2436;
  const heart = brandSvg(560, { bg: 'none', heartRatio: 0.9 });
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000000"/></svg>`,
  );
  await sharp(svg)
    .composite([{ input: await sharp(heart).png().toBuffer(), gravity: 'center' }])
    .png()
    .toFile(path.join(MOBILE_ASSETS, 'splash.png'));
  console.log('✓', path.join(MOBILE_ASSETS, 'splash.png'));
}
// favicon (Expo web không dùng nhưng giữ đồng bộ).
await png(brandSvg(196, { radius: 44 }), path.join(MOBILE_ASSETS, 'favicon.png'));
// notification icon: Android yêu cầu trắng-trên-trong-suốt.
await png(brandSvg(96, { bg: 'none', heartRatio: 0.8 }), path.join(MOBILE_ASSETS, 'notification-icon.png'));

console.log('Done.');
