/**
 * Generate Expo app icons + splash from the HUNGYEU brand assets.
 *
 *   icon.png           1024x1024  — màu nền hồng + heart trắng + chữ Yêu
 *   adaptive-icon.png  1024x1024  — foreground Android (heart trắng giữa, vùng an toàn 432px), nền trong suốt
 *   splash.png         1242x2436  — splash dọc, logo wordmark giữa, nền trắng
 *   favicon.png        48x48      — favicon vuông
 *
 * Run with: node scripts/gen-icons.js
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const WORDMARK_PNG = path.resolve(ROOT, '..', 'frontend', 'public', 'HUNGYEUDENLOGO.png');

const BRAND_PINK = '#e11d48'; // rose-600 — khớp favicon-heart.svg

// Heart silhouette dùng cho icon — same path data như favicon-heart.svg.
const heartPath =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3' +
  ' c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5' +
  ' c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

function iconSvg() {
  // 1024×1024 — nền hồng bo góc nhẹ + heart trắng nằm trên + chữ Yêu dưới.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fb7185"/>
      <stop offset="1" stop-color="#be123c"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(232 140) scale(23.33)" fill="#ffffff">
    <path d="${heartPath}"/>
  </g>
  <text x="512" y="870" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif"
        font-weight="900" font-size="260" fill="#ffffff" letter-spacing="4">
    Yêu
  </text>
</svg>`;
}

function adaptiveSvg() {
  // 1024×1024 transparent; heart trong vùng an toàn 432×432 ở giữa (Android trim 33%).
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(296 296) scale(18.33)" fill="#ffffff">
    <path d="${heartPath}"/>
  </g>
</svg>`;
}

function faviconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="${BRAND_PINK}">
  <path d="${heartPath}"/>
</svg>`;
}

async function main() {
  if (!fs.existsSync(WORDMARK_PNG)) {
    throw new Error(`Wordmark logo not found: ${WORDMARK_PNG}`);
  }

  // 1. icon.png — full color square
  await sharp(Buffer.from(iconSvg()))
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));

  // 2. adaptive-icon.png — transparent foreground, heart trắng
  //    Android sẽ ghép với backgroundColor (#ffffff) trong app.config.ts.
  //    => Đổi sang heart hồng để hiện trên nền trắng.
  const adaptiveColored = adaptiveSvg().replace('#ffffff', BRAND_PINK);
  await sharp(Buffer.from(adaptiveColored))
    .png()
    .toFile(path.join(ASSETS, 'adaptive-icon.png'));

  // 3. splash.png — chèn wordmark đen vào giữa canvas trắng 1242×2436.
  const wordmark = await sharp(WORDMARK_PNG)
    .resize({ width: 900, fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  await sharp({
    create: {
      width: 1242,
      height: 2436,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: wordmark, gravity: 'center' }])
    .png()
    .toFile(path.join(ASSETS, 'splash.png'));

  // 4. favicon.png
  await sharp(Buffer.from(faviconSvg()))
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'));

  console.log('Generated:');
  for (const f of ['icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png']) {
    const stat = fs.statSync(path.join(ASSETS, f));
    console.log(`  assets/${f}  (${stat.size} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
