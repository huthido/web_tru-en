#!/usr/bin/env node
/**
 * Kiểm tra .env production: liệt kê biến nào còn placeholder / thiếu / chưa
 * đổi từ giá trị mặc định trong .env.example.
 *
 * Usage:
 *   node scripts/check-prod-env.js [path/to/.env] [path/to/other.env] [--warn]
 *
 * - Nhận nhiều file env, file sau OVERRIDE file trước (giống cách backend
 *   nạp `apps/backend/.env` rồi fallback root `.env`).
 * - Mặc định đọc `.env` ở thư mục gốc.
 * - `--warn`: in báo cáo nhưng luôn exit 0 (dùng cho `predev` để không
 *   chặn `pnpm dev` khi local thiếu biến prod-only).
 *
 * Exit code (không có `--warn`):
 *   0 — tất cả biến BLOCKER đã set (deploy được)
 *   1 — thiếu biến BLOCKER
 *   2 — đủ BLOCKER nhưng thiếu biến WARN (bán xu/OAuth chưa chạy)
 *
 * Script này KHÔNG gửi env đi đâu — chỉ scan local.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const WARN_ONLY = args.includes('--warn');
const ENV_PATHS = args.filter((a) => !a.startsWith('--')).map((p) => path.resolve(p));
if (ENV_PATHS.length === 0) ENV_PATHS.push(path.resolve('.env'));

// ─────────────────────────────────────────────────────────────────────
// Catalog of env vars by severity. Sửa danh sách này khi thêm biến mới.
// ─────────────────────────────────────────────────────────────────────

/** Trạng thái coi là "chưa điền" — placeholder từ .env.example. */
const PLACEHOLDER_PATTERNS = [
    /^$/,
    /change-me/i,
    /replace-with/i,
    /changeMePlease/i,
    /example\.com/i,
    /your-/i,
    /<.*>/, // <something>
];

/**
 * BLOCKER — thiếu là backend chết hoặc tính năng cốt lõi sập.
 * WARN    — thiếu là user-facing feature bị disable (login/IAP/email).
 * INFO    — optional, fallback có sẵn.
 */
const CATALOG = [
    // ── Database / cache (bắt buộc) ──────────────────────────────────
    { name: 'DATABASE_URL', level: 'BLOCKER', note: 'Postgres prod (qua PgBouncer nếu có)' },
    { name: 'DIRECT_URL', level: 'BLOCKER', note: 'Postgres trực tiếp cho prisma migrate' },
    { name: 'REDIS_URL', level: 'BLOCKER', note: 'Redis prod (queue + SSE pub/sub)' },
    { name: 'POSTGRES_PASSWORD', level: 'BLOCKER', note: 'phải khớp password trong DATABASE_URL' },

    // ── Bảo mật (bắt buộc) ───────────────────────────────────────────
    { name: 'JWT_SECRET', level: 'BLOCKER', note: '>=32 ký tự ngẫu nhiên — openssl rand -hex 32' },
    { name: 'JWT_REFRESH_SECRET', level: 'BLOCKER', note: 'KHÁC JWT_SECRET — openssl rand -hex 32' },

    // ── Domain / CORS (bắt buộc) ─────────────────────────────────────
    { name: 'CORS_ORIGIN', level: 'BLOCKER', note: 'domain frontend prod, có thể CSV nhiều domain' },
    { name: 'FRONTEND_URL', level: 'BLOCKER', note: 'URL frontend cho email reset password / OAuth redirect' },
    { name: 'NEXT_PUBLIC_API_URL', level: 'BLOCKER', note: 'URL backend cho frontend SSR + client' },
    { name: 'NEXT_PUBLIC_APP_URL', level: 'BLOCKER', note: 'URL frontend cho canonical / OG tags' },

    // ── Meilisearch (warn — search fallback Postgres LIKE nếu rỗng) ──
    { name: 'MEILI_MASTER_KEY', level: 'INFO', note: '>=32 ký tự; rỗng = fallback Postgres LIKE' },

    // ── OAuth (warn — login Google/FB không work nếu thiếu) ──────────
    { name: 'GOOGLE_CLIENT_ID', level: 'WARN', note: 'Google Cloud Console → OAuth consent screen' },
    { name: 'GOOGLE_CLIENT_SECRET', level: 'WARN', note: '' },
    { name: 'GOOGLE_CALLBACK_URL', level: 'WARN', note: 'phải khớp Authorized redirect URI' },
    { name: 'FACEBOOK_APP_ID', level: 'WARN', note: 'Meta for Developers' },
    { name: 'FACEBOOK_APP_SECRET', level: 'WARN', note: '' },
    { name: 'FACEBOOK_CALLBACK_URL', level: 'WARN', note: '' },

    // ── Sign in with Apple — BẮT BUỘC trên iOS nếu có Google/FB ──────
    { name: 'APPLE_OAUTH_CLIENT_ID', level: 'WARN', note: 'Services ID (vd com.hungyeu.webtruyen.signin); BẮT BUỘC trên iOS — Apple §4.8' },
    { name: 'APPLE_OAUTH_TEAM_ID', level: 'WARN', note: 'Apple Team ID 10 ký tự' },
    { name: 'APPLE_OAUTH_KEY_ID', level: 'WARN', note: '' },
    { name: 'APPLE_OAUTH_PRIVATE_KEY', level: 'WARN', note: 'nội dung file .p8 PEM' },

    // ── Apple IAP (warn — nạp xu iOS không work) ─────────────────────
    { name: 'APPLE_IAP_BUNDLE_ID', level: 'WARN', note: 'com.hungyeu.webtruyen' },
    { name: 'APPLE_IAP_KEY_ID', level: 'WARN', note: 'App Store Connect → In-App Purchase Keys' },
    { name: 'APPLE_IAP_ISSUER_ID', level: 'WARN', note: 'UUID issuer' },
    { name: 'APPLE_IAP_PRIVATE_KEY', level: 'WARN', note: '.p8 file nội dung PEM' },

    // ── Google Play Billing (warn — nạp xu Android không work) ───────
    { name: 'GOOGLE_PLAY_PACKAGE_NAME', level: 'WARN', note: 'com.hungyeu.webtruyen' },
    { name: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', level: 'WARN', note: 'JSON service account (Editor role)' },

    // ── Email SMTP (info — forgot password chỉ log link ra console) ──
    { name: 'EMAIL_HOST', level: 'INFO', note: 'rỗng = không gửi mail thật' },
    { name: 'EMAIL_USER', level: 'INFO', note: '' },
    { name: 'EMAIL_PASSWORD', level: 'INFO', note: 'Gmail dùng App Password' },
    { name: 'EMAIL_FROM', level: 'INFO', note: '' },

    // ── Storage (info — fallback /uploads local volatile) ────────────
    { name: 'S3_ENDPOINT', level: 'INFO', note: 'Garage S3; nếu rỗng + Cloudinary rỗng → ảnh lưu /uploads (mất khi redeploy)' },
    { name: 'S3_ACCESS_KEY', level: 'INFO', note: '' },
    { name: 'S3_SECRET_KEY', level: 'INFO', note: '' },
    { name: 'S3_PUBLIC_BASE_URL', level: 'INFO', note: '' },
    { name: 'CLOUDINARY_CLOUD_NAME', level: 'INFO', note: 'tier 2 nếu không dùng Garage' },
    { name: 'CLOUDINARY_API_KEY', level: 'INFO', note: '' },
    { name: 'CLOUDINARY_API_SECRET', level: 'INFO', note: '' },

    // ── VNPay (info — chỉ cần nếu vẫn giữ nạp xu qua web) ────────────
    { name: 'VNPAY_TMN_CODE', level: 'INFO', note: 'Bỏ qua nếu mobile-only launch' },
    { name: 'VNPAY_HASH_SECRET', level: 'INFO', note: '' },
];

// ─────────────────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
    return env;
}

function isPlaceholder(value) {
    if (value === undefined || value === null) return true;
    const v = String(value).trim();
    return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

function colorize(text, color) {
    if (process.env.NO_COLOR || !process.stdout.isTTY) return text;
    const codes = { red: 31, yellow: 33, green: 32, cyan: 36, gray: 90, bold: 1 };
    return `\x1b[${codes[color] || 0}m${text}\x1b[0m`;
}

function main() {
    const labels = ENV_PATHS.map((p) => path.relative(process.cwd(), p) || p).join(' + ');
    console.log(colorize(`\nKiểm tra ${labels}${WARN_ONLY ? ' (warn-only)' : ''}\n`, 'bold'));

    // Merge env files in order — later files OVERRIDE earlier (giống dotenv).
    const env = {};
    const missingFiles = [];
    for (const p of ENV_PATHS) {
        const parsed = parseEnvFile(p);
        if (parsed === null) {
            missingFiles.push(p);
            continue;
        }
        Object.assign(env, parsed);
    }

    if (missingFiles.length === ENV_PATHS.length) {
        // Tất cả file đều không tồn tại.
        console.error(colorize(`✗ Không tìm thấy file env nào:`, 'red'));
        for (const p of missingFiles) console.error(`   ${p}`);
        console.error(`\n  Tạo bằng: cp .env.example .env`);
        process.exit(WARN_ONLY ? 0 : 1);
    }
    if (missingFiles.length > 0) {
        console.log(colorize(`(bỏ qua ${missingFiles.length} file không tồn tại: ${missingFiles.map((p) => path.relative(process.cwd(), p)).join(', ')})\n`, 'gray'));
    }

    const buckets = { BLOCKER: [], WARN: [], INFO: [] };
    for (const item of CATALOG) {
        const value = env[item.name];
        const missing = isPlaceholder(value);
        if (missing) buckets[item.level].push(item);
    }

    const symbol = { BLOCKER: '✗', WARN: '!', INFO: '·' };
    const color = { BLOCKER: 'red', WARN: 'yellow', INFO: 'gray' };
    const header = {
        BLOCKER: 'BLOCKER — deploy sẽ chết / tính năng cốt lõi không chạy',
        WARN: 'WARN — login OAuth, IAP, Sign in with Apple sẽ không work',
        INFO: 'INFO — fallback có sẵn, có thể bổ sung sau',
    };

    let exitCode = 0;
    for (const level of ['BLOCKER', 'WARN', 'INFO']) {
        const items = buckets[level];
        if (items.length === 0) continue;
        console.log(colorize(`${header[level]} (${items.length})`, color[level]));
        for (const item of items) {
            const sym = colorize(symbol[level], color[level]);
            const name = colorize(item.name.padEnd(36), 'cyan');
            const note = item.note ? colorize(`— ${item.note}`, 'gray') : '';
            console.log(`  ${sym} ${name}${note}`);
        }
        console.log('');
        if (level === 'BLOCKER') exitCode = 1;
        else if (level === 'WARN' && exitCode === 0) exitCode = 2;
    }

    const totalChecked = CATALOG.length;
    const totalMissing = buckets.BLOCKER.length + buckets.WARN.length + buckets.INFO.length;
    const ok = totalChecked - totalMissing;

    console.log(colorize(`Tổng kết: ${ok}/${totalChecked} biến đã set`, 'bold'));
    if (exitCode === 0) {
        console.log(colorize('✓ Tất cả BLOCKER + WARN đã set — sẵn sàng deploy.', 'green'));
    } else if (exitCode === 2) {
        console.log(colorize('✓ Deploy được, nhưng login/IAP có thể không hoạt động.', 'yellow'));
    } else {
        console.log(colorize('✗ Thiếu biến BLOCKER — backend sẽ crash hoặc tính năng cốt lõi sập.', 'red'));
    }
    if (WARN_ONLY && exitCode !== 0) {
        console.log(colorize('(warn-only — không chặn pnpm dev)', 'gray'));
    }
    console.log('');

    process.exit(WARN_ONLY ? 0 : exitCode);
}

main();
