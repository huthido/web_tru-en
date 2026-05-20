# 🚀 Hướng dẫn Deploy `web-truyen-tien-hung`

Monorepo pnpm gồm:
- **NestJS backend** (port 3009)
- **Next.js 14 frontend** (port 3000)
- **PostgreSQL 16** (database chính)
- **PgBouncer 1.23** (connection pooler — multiplexes backend connections to Postgres khi scale replica)
- **Redis 7** (queue BullMQ cho email/notification)
- **Meilisearch v1.10** (full-text search, có fallback Postgres LIKE)
- **Garage v1.0.1** (S3-compatible object storage, có fallback Cloudinary/local)

Tài liệu này hướng dẫn deploy bằng Docker Compose tại local và lên **Coolify** (self-hosted PaaS).

> 💡 **Tất cả service phụ (Redis / Meili / Garage / VNPay) đều có fallback graceful.** Có thể bật từng cái khi sẵn sàng, không bắt buộc bật cùng lúc.

---

## 📋 Mục lục

1. [Tổng quan artifact](#1-tổng-quan-artifact)
2. [Chuẩn bị](#2-chuẩn-bị)
3. [Chạy thử local bằng Docker Compose](#3-chạy-thử-local-bằng-docker-compose)
4. [Deploy lên Coolify — Cách A: Compose App](#4-deploy-lên-coolify--cách-a-compose-app)
5. [Deploy lên Coolify — Cách B: Tách application](#5-deploy-lên-coolify--cách-b-tách-application)
6. [Bảng biến môi trường](#6-bảng-biến-môi-trường)
7. [Setup lần đầu các service phụ](#7-setup-lần-đầu-các-service-phụ)
8. [Cấu hình DNS &amp; HTTPS](#8-cấu-hình-dns--https)
9. [Kiểm tra sau deploy (smoke test)](#9-kiểm-tra-sau-deploy-smoke-test)
10. [Update / Redeploy](#10-update--redeploy)
11. [Backup &amp; Restore](#11-backup--restore)
12. [Rollback](#12-rollback)
13. [Troubleshooting thường gặp](#13-troubleshooting-thường-gặp)
14. [Checklist trước khi go-live](#14-checklist-trước-khi-go-live)

---

## 1. Tổng quan artifact

| File / Thư mục | Vai trò |
|---|---|
| `apps/backend/Dockerfile` | Build image NestJS (multi-stage: deps → prisma + nest build → runtime non-root) |
| `apps/frontend/Dockerfile` | Build image Next.js standalone (NEXT_PUBLIC_* inject lúc build) |
| `docker-compose.yaml` | Full-stack 6 service: postgres + redis + meilisearch + garage + backend + frontend |
| `garage.toml` | Config Garage single-node (replace `rpc_secret` + `admin_token` trước khi deploy) |
| `.dockerignore` | Loại `.env`, node_modules, log, test rác khỏi build context |
| `.env.example` | Template biến môi trường root cho compose |
| `apps/backend/env.example` | Template backend env |
| `apps/frontend/env.example` | Template frontend env |
| `apps/backend/prisma/migrations/` | Migration SQL — backend tự chạy `prisma migrate deploy` lúc khởi động |

> ⚠️ **Build context = root repo** cho cả hai Dockerfile (vì pnpm workspace cần `packages/shared`). Khi cấu hình Coolify per-app, để **Base directory = `/`**.

---

## 2. Chuẩn bị

### Cần có
- Docker Engine ≥ 24 + Docker Compose v2 (tại máy build / tại VPS Coolify)
- VPS đủ tài nguyên: tối thiểu **2 vCPU + 4 GB RAM** (Meili + Garage + Redis cộng dồn tốn RAM). Lý tưởng 4 vCPU + 8 GB.
- Tài khoản Coolify đang chạy
- Repo đã push lên Git (GitHub / GitLab / Gitea / self-hosted)
- 2 subdomain: `yourdomain.com` (frontend) + `api.yourdomain.com` (backend); DNS A-record trỏ về IP server Coolify
- (Tuỳ chọn) `cdn.yourdomain.com` để serve Garage public files
- Tài khoản VNPay sandbox/prod nếu muốn bật thanh toán (đăng ký tại https://sandbox.vnpayment.vn/)

### Chọn nguồn database (quyết định trước khi deploy)

Repo hiện có 2 lựa chọn — **chọn đúng 1** rồi set `DATABASE_URL` tương ứng:

| Lựa chọn | `DATABASE_URL` | Ghi chú |
|---|---|---|
| **Postgres trong compose** (khuyến nghị, self-contained) | `postgresql://user:pass@postgres:5432/web_truyen_db?schema=public` | Hostname = tên service `postgres`. Volume `postgres_data` persistent. |
| **Postgres managed từ xa** (Neon/Railway/… ) | Connection string nhà cung cấp, có `?sslmode=require` | Bỏ service `postgres` khỏi compose hoặc để mặc kệ (không dùng). Nếu provider có pooler, dùng **direct/session connection** cho lần migrate đầu. |

> 🔁 **Migration tự áp**: backend Dockerfile chạy `npx prisma migrate deploy` lúc khởi động (`apps/backend/Dockerfile`). Mọi migration trong `apps/backend/prisma/migrations/` **tự áp khi container start**, miễn `DATABASE_URL` kết nối được — **không cần chạy thủ công** khi deploy qua Coolify/Docker. Đặc biệt các migration kinh tế gần đây (đều additive, an toàn dữ liệu):
> - `20260517000000_chapter_purchase_revenue_split` — fee/net cho ChapterPurchase
> - `20260517010000_story_access_types` — FREE/FREEMIUM/VIP
> - `20260517020000_withdrawal_requests` — bảng rút tiền
> - `20260517030000_coin_transfer_wallet_lock` — transfer + ví khóa
> - `20260517040000_notification_creator_nullable`
> - `20260520000000_wallet_split_balances` — **tách `purchasedBalance` / `earnedBalance`** (Apple §3.1.1 compliance). Backfill: balance cũ → purchasedBalance (xem `memory/wallet_iap_compliance.md`).
> - `20260520120000_separate_chapter_sale_fee` — tách `chapterSaleFeePercent`
> - `20260520140000_iap_provider_enum` + `20260520140100_coin_package_iap_ids` — chuẩn bị Apple IAP / Google Play

> 📱 **Mobile app KHÔNG deploy qua Coolify**: `apps/mobile/` là Expo project standalone (cài/build qua `expo start` + EAS Build từ máy dev). Coolify chỉ deploy `backend` + `frontend` từ `docker-compose.yaml`. Mobile đã loại khỏi `pnpm-workspace.yaml` + `.dockerignore` nên không ảnh hưởng kích thước Docker context / image.

> ⚠️ **`NEXT_PUBLIC_API_URL` bắt buộc là build arg**: từ bản này, build frontend production **thiếu** biến này sẽ **fail build có thông báo rõ** (thay vì âm thầm proxy `/api/*` về URL chết). Đảm bảo Coolify truyền `NEXT_PUBLIC_API_URL` cho service `frontend` lúc build.

### Sinh secrets

```bash
# Mỗi lệnh sinh 1 secret ≥32 ký tự
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → JWT_REFRESH_SECRET
openssl rand -hex 32   # → MEILI_MASTER_KEY
openssl rand -hex 32   # → Garage rpc_secret (paste vào garage.toml)
openssl rand -hex 32   # → Garage admin_token (paste vào garage.toml)
openssl rand -hex 24   # → POSTGRES_PASSWORD
openssl rand -hex 24   # → REDIS_PASSWORD (nếu muốn auth)
```

### ⚠️ Bảo mật
- **Quay password** tất cả tài khoản DB cũ nếu trước đây từng dùng trong các script test (`test-db*.js` đã bị xoá khỏi repo nhưng đã chạy local). Nếu từng dùng Supabase: rotate/disable project Supabase cũ vì dự án đã gỡ hoàn toàn Supabase.
- **Không commit `.env`** — `.dockerignore` đã loại nhưng vẫn phải cẩn thận với `git add -A`.
- **Không commit `garage.toml` đã điền secret thật** — để file template trong repo, secret thật chỉ ở môi trường deploy.

---

## 3. Chạy thử local bằng Docker Compose

Trước khi đẩy lên Coolify, build và chạy local để chắc chắn cả pipeline hoạt động:

```bash
# 1. Copy template env và điền giá trị
cp .env.example .env
# Mở .env, điền tối thiểu:
#   POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, MEILI_MASTER_KEY
#   NEXT_PUBLIC_API_URL=http://localhost:3009
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
#   CORS_ORIGIN=http://localhost:3000
#   FRONTEND_URL=http://localhost:3000
#   REDIS_URL=redis://redis:6379
#   MEILI_HOST=http://meilisearch:7700

# 2. Sửa garage.toml — paste rpc_secret + admin_token vừa sinh
#    (3 chỗ "REPLACE_WITH_OPENSSL_RAND_HEX_32")

# 3. Build & khởi động
docker compose build
docker compose up -d

# 4. Kiểm tra health
docker compose ps
# Tất cả service phải ở trạng thái "healthy" sau ~60 giây

# 5. Theo dõi log
docker compose logs -f backend
docker compose logs -f frontend

# 6. Bootstrap Garage lần đầu (xem section 7)
# 7. Smoke test
curl http://localhost:3009/api/health
curl -I http://localhost:3000
curl http://localhost:7700/health    # Meilisearch
```

Nếu OK, dừng container và đẩy code lên Git:

```bash
docker compose down
git add -A
git commit -m "chore: production-ready compose stack"
git push origin master
```

---

## 4. Deploy lên Coolify — Cách A: Compose App

**Phù hợp khi:** muốn deploy toàn stack (6 service) trong 1 resource Coolify, simpler.

### Bước 1 — Tạo resource

1. Coolify Dashboard → **+ New Resource** → **Docker Compose**.
2. Source: chọn Git provider, repo `web-truyen-tien-hung`, branch `master`.
3. Compose file: `docker-compose.yaml` (mặc định).
4. Đặt tên resource: ví dụ `web-truyen-prod`.

### Bước 2 — Environment Variables

Vào tab **Environment Variables**, click **Add** từng biến. Tham khảo [bảng biến môi trường](#6-bảng-biến-môi-trường). Tối thiểu phải có:

```ini
# Postgres
POSTGRES_USER=user
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=web_truyen_db
DATABASE_URL=postgresql://user:<strong-password>@postgres:5432/web_truyen_db?schema=public

# Auth
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars khác JWT_SECRET>

# CORS / Frontend
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Queue
REDIS_URL=redis://redis:6379

# Full-text search
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=<32+ chars>
MEILI_ENV=production

# Storage (chọn 1 nguồn)
# Sau khi bootstrap Garage (section 7), điền các biến S3_*
S3_ENDPOINT=http://garage:3900
S3_REGION=garage
S3_ACCESS_KEY=<từ Garage key new>
S3_SECRET_KEY=<từ Garage key new>
S3_BUCKET=web-truyen
S3_PUBLIC_BASE_URL=https://cdn.yourdomain.com

# Payment (tuỳ chọn — có thể bật sau)
VNPAY_TMN_CODE=<sandbox hoặc prod TMN code>
VNPAY_HASH_SECRET=<sandbox hoặc prod hash secret>
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://api.yourdomain.com/api/payments/vnpay/return
VNPAY_IPN_URL=https://api.yourdomain.com/api/payments/vnpay/ipn
```

> ⚠️ `NEXT_PUBLIC_*` phải khai báo **trước khi build**, vì Next.js inline vào client bundle. Đổi giá trị → bắt buộc **Redeploy** (rebuild image).

### Bước 3 — Domain

Tab **Domains**:
- Service `frontend` → `yourdomain.com`, port `3000`, Force HTTPS ✓
- Service `backend` → `api.yourdomain.com`, port `3009`, Force HTTPS ✓
- (Tuỳ chọn) Service `garage` → `cdn.yourdomain.com`, port `3902` — serve static files public
- (Tuỳ chọn) Service `meilisearch` → `meili-admin.yourdomain.com`, port `7700` — chỉ dùng để vào admin UI, nên giới hạn IP

SSL: Coolify dùng Traefik + Let's Encrypt tự động.

### Bước 4 — Persistent storage

Tab **Storage** kiểm tra **6 volume** đã được flag persistent:
- `postgres_data` (DB chính)
- `redis_data` (queue + cache)
- `meili_data` (search index)
- `garage_meta` + `garage_data` (object storage metadata + binary)
- `backend_uploads` (fallback local nếu Garage không sẵn sàng)

### Bước 5 — Deploy lần đầu

Click **Deploy**. Lần đầu mất ~10-15 phút.

Sau khi deploy thành công:
- Vào **Terminal** của container `garage` → chạy bootstrap (xem [Section 7](#7-setup-lần-đầu-các-service-phụ))
- Điền `S3_ACCESS_KEY` + `S3_SECRET_KEY` vào Environment → **Redeploy backend**
- Vào **Terminal** của container `backend` → chạy reindex Meilisearch:
  ```bash
  curl -X POST http://localhost:3009/api/admin/search/reindex \
       -H "Cookie: access_token=<admin token>"
  ```

---

## 5. Deploy lên Coolify — Cách B: Tách application

**Phù hợp khi:** cần scale frontend/backend độc lập, hoặc dùng managed services bên ngoài.

Có thể chia thành:

| Resource | Loại | Note |
|---|---|---|
| **Postgres** | Coolify template hoặc managed (Neon/Railway) | Ghi lại `DATABASE_URL` |
| **Redis** | Coolify template Redis | Ghi lại internal hostname |
| **Meilisearch** | Custom Docker (image `getmeili/meilisearch:v1.10`) | Volume `/meili_data`, env `MEILI_MASTER_KEY` |
| **Garage** | Custom Docker (image `dxflrs/garage:v1.0.1`) | Volume `/var/lib/garage/data` + `/meta`, mount `garage.toml` |
| **Backend app** | Dockerfile `apps/backend/Dockerfile` | Base directory `/`, port 3009, healthcheck `/api/health` |
| **Frontend app** | Dockerfile `apps/frontend/Dockerfile` | Base directory `/`, port 3000, build args NEXT_PUBLIC_* |

Mỗi app dùng cùng **internal network** để gọi nhau qua hostname service.

> 🟢 **Lưu ý quan trọng cho Cách B**: `DATABASE_URL`, `REDIS_URL`, `MEILI_HOST`, `S3_ENDPOINT` phải trỏ về **internal hostname** trong Coolify (không phải localhost / public domain) để traffic không đi qua Internet.

---

## 6. Bảng biến môi trường

### 6.1 Core (bắt buộc)

| Biến | Service | Mô tả |
|---|---|---|
| `POSTGRES_USER` | postgres | User DB |
| `POSTGRES_PASSWORD` | postgres | Password DB (≥16 ký tự) |
| `POSTGRES_DB` | postgres | Tên DB |
| `DATABASE_URL` | backend | Prisma Client connection. **Compose mặc định trỏ qua PgBouncer**: `postgresql://user:pass@pgbouncer:5432/db?schema=public&pgbouncer=true&connection_limit=20`. Nếu không muốn dùng PgBouncer thì trỏ thẳng `postgres:5432`. |
| `DIRECT_URL` | backend | Prisma Migrate connection (DDL không chạy qua transaction pooler). Compose mặc định: `postgresql://user:pass@postgres:5432/db?schema=public`. Nếu không dùng PgBouncer thì để trống — Prisma sẽ fallback DATABASE_URL. |
| `JWT_SECRET` | backend | Ký access token, ≥32 ký tự |
| `JWT_REFRESH_SECRET` | backend | Ký refresh token, khác `JWT_SECRET` |
| `CORS_ORIGIN` | backend | Comma-separated origins. `https://yourdomain.com,https://www.yourdomain.com` |
| `FRONTEND_URL` | backend | Domain frontend (dùng cho OAuth redirect) |
| `NEXT_PUBLIC_API_URL` | frontend (build + runtime) | URL public backend |
| `NEXT_PUBLIC_APP_URL` | frontend (build + runtime) | URL public frontend |

### 6.2 Queue & cache (Redis)

| Biến | Mô tả |
|---|---|
| `REDIS_URL` | `redis://redis:6379`. **Không set** → email gửi đồng bộ (fallback) |
| `REDIS_PORT` | Host port map, default `6379` |

### 6.3 Full-text search (Meilisearch)

| Biến | Mô tả |
|---|---|
| `MEILI_HOST` | Internal: `http://meilisearch:7700`. **Không set** → search dùng Postgres LIKE |
| `MEILI_MASTER_KEY` | ≥32 ký tự, dùng cho cả Meili master + backend API key |
| `MEILI_ENV` | `production` (mặc định) hoặc `development` |
| `MEILI_PORT` | Host port, default `7700` |

### 6.4 Storage (chọn 1 hoặc fallback chain)

**Priority order:** Garage → Cloudinary → local `/uploads`

| Biến | Provider | Mô tả |
|---|---|---|
| `S3_ENDPOINT` | Garage | `http://garage:3900` trong compose |
| `S3_REGION` | Garage | `garage` |
| `S3_ACCESS_KEY` | Garage | Sinh từ `garage key new` (section 7) |
| `S3_SECRET_KEY` | Garage | Sinh từ `garage key new` |
| `S3_BUCKET` | Garage | `web-truyen` |
| `S3_PUBLIC_BASE_URL` | Garage | URL public để client tải file. Ví dụ `https://cdn.yourdomain.com` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Optional, fallback cuối |
| `CLOUDINARY_API_KEY` | Cloudinary | |
| `CLOUDINARY_API_SECRET` | Cloudinary | |

### 6.5 Payment (VNPay)

| Biến | Mô tả |
|---|---|
| `VNPAY_TMN_CODE` | Mã website VNPay cấp |
| `VNPAY_HASH_SECRET` | Secret key VNPay cấp (≥32 ký tự) |
| `VNPAY_PAY_URL` | Sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` · Prod: `https://pay.vnpay.vn/vpcpay.html` |
| `VNPAY_RETURN_URL` | `https://api.yourdomain.com/api/payments/vnpay/return` (phải đăng ký trên VNPay portal) |
| `VNPAY_IPN_URL` | `https://api.yourdomain.com/api/payments/vnpay/ipn` (đăng ký trên VNPay portal) |

### 6.5b Payment (Apple IAP + Google Play — chỉ cần khi launch mobile app)

Khung backend đã sẵn (commit `e8ac597`); `verifyPurchase()` đang stub trả invalid cho tới khi điền. Không set env này → endpoint `/payments/{apple,google}/redeem` trả lỗi `not configured` — KHÔNG ảnh hưởng web/VNPay.

| Biến | Mô tả |
|---|---|
| `APPLE_IAP_BUNDLE_ID` | Bundle id app iOS (vd `com.hungyeu.webtruyen`). Khớp `apps/mobile/app.json`. |
| `APPLE_IAP_SHARED_SECRET` | Shared secret từ App Store Connect (Apps → In-App Purchases → App-Specific Shared Secret). |
| `APPLE_IAP_SANDBOX` | `true` khi test với sandbox account; bỏ trống ở prod. |
| `GOOGLE_PLAY_PACKAGE_NAME` | Package name Android (vd `com.hungyeu.webtruyen`). Khớp `apps/mobile/app.json`. |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Service account JSON (inline) — scope `androidpublisher`. Tạo ở Google Cloud Console → IAM → Service Accounts → JSON key. Link service account vào Play Console với role "Finance". |

### 6.6 OAuth & Email (tuỳ chọn)

| Biến | Mô tả |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | OAuth Facebook |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | SMTP gửi email |

### 6.7 Host port (tuỳ chỉnh nếu cần)

| Biến | Default |
|---|---|
| `BACKEND_PORT` | `3009` |
| `FRONTEND_PORT` | `3000` |
| `POSTGRES_PORT` | `5432` |
| `REDIS_PORT` | `6379` |
| `MEILI_PORT` | `7700` |
| `GARAGE_S3_PORT` | `3900` |
| `GARAGE_WEB_PORT` | `3902` |
| `GARAGE_ADMIN_PORT` | `3903` |

---

## 7. Setup lần đầu các service phụ

### 7.1 Bootstrap Garage (S3-compatible storage)

Garage cần khởi tạo cluster lần đầu trước khi nhận data. Sau khi `docker compose up -d` xong:

```bash
# Vào container Garage
docker exec -it web_truyen_garage /bin/sh

# 1. Lấy node ID
garage node id
# Output ví dụ: <node-id>@127.0.0.1:3901

# 2. Assign layout cho node (single-node, 1 zone, 1GB capacity placeholder)
garage layout assign <node-id-prefix-8-ky-tu> -z dc1 -c 1G
garage layout apply --version 1

# 3. Tạo bucket
garage bucket create web-truyen

# 4. Tạo access key
garage key create app-key
# Output sẽ in ra:
#   Key ID: GK<...>
#   Secret key: <secret-base64>
# → COPY 2 giá trị này

# 5. Cấp quyền key cho bucket
garage bucket allow --read --write --owner web-truyen --key app-key

# 6. (Tuỳ chọn) Bật public read cho bucket — để serve file qua web
garage bucket website --allow web-truyen

# Thoát
exit
```

Sau đó:
1. Paste **Key ID** → biến `S3_ACCESS_KEY`
2. Paste **Secret key** → biến `S3_SECRET_KEY`
3. **Redeploy backend** trong Coolify để service đọc env mới.

### 7.2 Tạo trang Meilisearch index lần đầu

Backend tự động tạo index `stories` lúc khởi động (`onModuleInit`). Nhưng index sẽ trống nếu DB đã có data từ trước → gọi reindex toàn bộ:

```bash
# Lấy admin access token (login bằng tài khoản ADMIN), copy cookie access_token
# Sau đó:
curl -X POST https://api.yourdomain.com/api/admin/search/reindex \
     -H "Cookie: access_token=<your-admin-token>" \
     -H "Content-Type: application/json"

# Response:
# { "success": true, "indexed": 1234 }
```

Hoặc dùng Coolify Terminal trên container `backend`:

```bash
# Trong terminal backend container
curl -X POST http://localhost:3009/api/admin/search/reindex \
     -H "Authorization: Bearer <admin-jwt>"
```

### 7.3 Đăng ký URL VNPay

Vào VNPay merchant portal (sandbox hoặc prod):
1. Settings → **Loại tích hợp** → chọn "Tích hợp qua URL"
2. **URL trả về (Return URL)**: `https://api.yourdomain.com/api/payments/vnpay/return`
3. **URL nhận IPN**: `https://api.yourdomain.com/api/payments/vnpay/ipn`
4. Lưu — VNPay mới chấp nhận callback từ domain của bạn.

### 7.4 Seed admin user + gói xu lần đầu

Container backend tự chạy `npx prisma migrate deploy` lúc start (mọi migration trong `apps/backend/prisma/migrations/` — gồm các migration kinh tế: chapter purchase, story access types, withdrawal, coin transfer + wallet lock, notification creator nullable — đều **additive/create-only, an toàn**), nhưng **không tự seed**. Chạy seed một lần:

```bash
# Coolify → backend → Terminal
npx prisma db seed
```

Seed tạo: admin/author/user mẫu, categories, pages, **và 4 gói xu** (50 / 250 / 500 / 1500 xu). ⚠️ **Chưa seed → trang nạp xu không có gói nào** (`coin_packages` rỗng). Có thể quản lý lại gói ở `/admin/coin-packages`.

Hoặc tạo admin thủ công qua API `/api/auth/register` rồi update role trong Postgres:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@yourdomain.com';
```

---

### 7.5 Cấu hình tính năng kinh tế (xu / donate / VIP / rút tiền / chuyển xu)

Các tham số kinh tế lưu ở **row `Settings`** (không phải biến môi trường) — chỉnh tại **`/admin/settings`** sau khi đăng nhập admin:

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| Phí nền tảng khi ủng hộ (`donationPlatformFeePercent`) | 2 | % nền tảng giữ khi donate. Spec đề xuất 3. |
| Phí nền tảng khi bán chương/VIP (`chapterSaleFeePercent`) | 2 (backfill = donate fee) | % nền tảng giữ khi tác giả bán chương trả phí hoặc truyện VIP. **Tách riêng từ 2026-05-20** — chỉnh độc lập với fee donate. |
| Số xu rút tối thiểu (`minWithdrawalCoins`) | 1000 | Ngưỡng tối thiểu tác giả được tạo yêu cầu rút. |
| Cho phép chuyển xu (`allowCoinTransfer`) | **tắt** | Bật mới cho phép user chuyển xu cho nhau (trang `/transfer`). Mặc định tắt. |

Công cụ vận hành cho admin:

- **`/admin/withdrawals`** — duyệt yêu cầu rút. Luồng: tác giả gửi yêu cầu → xu **bị giữ ngay** (trừ ví) → admin **chuyển khoản thủ công ngoài hệ thống** rồi bấm **Duyệt** (xác nhận đã trả), hoặc **Từ chối** (hệ thống **tự hoàn xu** + ghi lý do). Nền tảng không tự chuyển tiền.
- **`/admin/wallets`** — tra ví theo username/email, **Khóa/Mở ví** (chống gian lận). Ví khóa: user không mua chương/truyện, donate, chuyển hay rút được; số dư giữ nguyên.
- **Story access types**: tác giả tự chọn FREE / FREEMIUM / VIP ở form tạo/sửa truyện — không cần cấu hình deploy.

> ✅ **Realtime notification (SSE) — multi-instance OK từ Phase 2 scaling:** endpoint `GET /api/notifications/stream` đã chuyển sang **Redis pub/sub** khi `REDIS_URL` set (channel `notifications:sse`). Backend scale ≥2 instance giờ an toàn — `notifyUser` ở instance A publish, mọi instance subscribe lại push vào SSE local. Khi `REDIS_URL` không set → fallback in-process Subject (chỉ đúng 1 instance, dev/local OK). Traefik không buffer SSE — không cần config thêm; chỉ tránh idle-timeout quá ngắn (`>60s`).

---

### 7.6 Scale Phase 2 — multi-instance backend + read replica

**Khi nào cần:** ≥ 10k DAU concurrent hoặc CPU backend > 70% liên tục.

#### Backend ≥ 2 replica

Coolify → backend resource → **Configuration → Scaling → Replicas: 2-3**. Yêu cầu trước khi scale:

1. **`REDIS_URL` đã set** (BullMQ + Redis pub/sub SSE + Redis cache wallet fee đều phụ thuộc).
2. **`DATABASE_URL` trỏ qua PgBouncer** (đã default ở compose), `DIRECT_URL` trỏ Postgres trực tiếp cho migration.
3. **Traefik không cần sticky session** vì SSE qua Redis pub/sub — bất kỳ instance nào nhận connection cũng nhận được tick.

#### Read replica Postgres (tùy chọn)

Khi read query > 70% load. Prisma 5+ hỗ trợ read replica qua extension:

```bash
pnpm --filter @web-truyen/backend add @prisma/extension-read-replicas
```

Trong `apps/backend/src/prisma/prisma.service.ts`:

```ts
const replicaUrls = process.env.DATABASE_REPLICA_URLS?.split(',').filter(Boolean) ?? [];
const client = new PrismaClient();
if (replicaUrls.length > 0) {
  client.$extends(readReplicas({ url: replicaUrls }));
}
```

Coolify env:
```ini
DATABASE_REPLICA_URLS=postgresql://user:pass@replica1:5432/db,postgresql://user:pass@replica2:5432/db
```

Replica instance dùng PostgreSQL streaming replication (Coolify Postgres template hỗ trợ; hoặc image `bitnami/postgresql-repmgr`). Write vẫn đi DATABASE_URL (primary qua PgBouncer); read tự động cân tải qua replicas.

> ⚠️ Replica latency có thể gây "read after write" bug (user vừa update, fetch lại không thấy). Mitigate: ép Prisma dùng primary cho query "vừa-mới-ghi" qua `$primary()` extension method.

---

## 8. Cấu hình DNS &amp; HTTPS

### DNS record

| Record | Type | Value | Bắt buộc |
|---|---|---|---|
| `yourdomain.com` | A | `<IP server Coolify>` | ✅ |
| `www.yourdomain.com` | CNAME | `yourdomain.com` | ✅ |
| `api.yourdomain.com` | A | `<IP server Coolify>` | ✅ |
| `cdn.yourdomain.com` | A | `<IP server Coolify>` | tuỳ chọn (cho Garage) |
| `meili-admin.yourdomain.com` | A | `<IP server Coolify>` | tuỳ chọn (admin UI) |

TTL: 300s khi đang setup, lên 3600s khi ổn định.

### HTTPS
Coolify dùng **Traefik + Let's Encrypt** tự động. Sau khi DNS đã propagate (kiểm tra bằng `dig yourdomain.com`), bấm **Generate SSL** trong tab Domains.

### Cookies cross-subdomain

Frontend ở `yourdomain.com` gọi API ở `api.yourdomain.com` → trình duyệt coi là cross-site. Cookie auth phải:
```typescript
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  domain: '.yourdomain.com', // share giữa main và api
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

---

## 9. Kiểm tra sau deploy (smoke test)

```bash
# 1. Health backend
curl https://api.yourdomain.com/api/health
# → {"status":"ok","timestamp":"...","message":"Web Truyen API is running"}

# 2. Frontend
curl -I https://yourdomain.com
# → HTTP/2 200

# 3. Redis (queue) — log backend phải có "Email service ready"
docker compose logs backend | grep -i "email\|queue"

# 4. Meilisearch
curl https://api.yourdomain.com/api/search?q=test
# → JSON kết quả (rỗng nếu chưa có truyện), không có lỗi 500

# 5. Garage upload — đăng nhập làm tác giả → upload ảnh chương → verify URL trả về có prefix S3_PUBLIC_BASE_URL

# 6. VNPay — vào /wallet/deposit → chọn gói → nút "Thanh toán VNPay"
#    → redirect sang sandbox.vnpayment.vn
#    → thanh toán test card → quay về /wallet/payment-result?success=true
#    → coin tự cộng vào ví trong vài giây

# 7. CORS test (từ máy khác)
curl -i -H "Origin: https://yourdomain.com" https://api.yourdomain.com/api/health
# → header: Access-Control-Allow-Origin: https://yourdomain.com
```

### Migration đã chạy chưa?
```bash
# Coolify → backend → Terminal
npx prisma migrate status
# → Database schema is up to date!
```

### Email queue có chạy?
Trong log backend phải thấy dòng kiểu:
```
[QueueModule] Queue email registered
[EmailService] Email service ready! Sending from: ...
```
Khi user đăng ký → log có:
```
[EmailService] Email enqueued for user@example.com
[EmailProcessor] Processing email job 1 → user@example.com
[EmailService] Email sent successfully to user@example.com
```

### Smoke test tính năng kinh tế

```bash
# Sau khi đã `prisma db seed`:
# 1. Gói xu hiển thị ở trang nạp xu (4 gói)
# 2. Tạo truyện FREEMIUM → đặt giá 1 chương → user khác mở chương đó thấy paywall → mua → đọc được
# 3. Tạo truyện VIP đặt giá → trang truyện hiện banner "Mua trọn bộ" → mua → mở hết chương
# 4. Donate tác giả → tác giả thấy 🔔 thông báo realtime (không cần F5) + "Top ủng hộ tuần"
# 5. /author/withdrawals: gửi yêu cầu rút (≥ minWithdrawalCoins) → xu bị giữ
#    → /admin/withdrawals: Từ chối → xu hoàn lại; hoặc Duyệt sau khi đã CK tay
# 6. /admin/settings: bật "Cho phép chuyển xu" → /transfer chuyển cho user khác OK
#    (tắt lại → /transfer báo tính năng đang tắt)
# 7. /admin/wallets: khóa ví 1 user → user đó mua/chuyển/rút đều bị chặn
```

Realtime SSE OK khi: mở DevTools → Network → `notifications/stream` ở trạng thái
`pending`/`eventstream` (không đóng liên tục); khi có donate/bán hàng, chuông cập nhật ngay.

---

## 10. Update / Redeploy

### Auto-deploy on push (khuyến nghị)
Coolify → resource → **Configuration → Auto Deploy** → bật. Mỗi `git push origin master` sẽ trigger build.

### Manual
1. Push code lên Git.
2. Coolify → resource → **Redeploy**.
3. Coolify pull code mới, rebuild image, rolling swap.

### Khi đổi `NEXT_PUBLIC_*`
**Bắt buộc Redeploy** (rebuild), không chỉ Restart, vì giá trị này inline vào client bundle.

### Khi thêm migration Prisma mới
- Commit migration SQL vào `apps/backend/prisma/migrations/`
- Push → backend tự chạy `npx prisma migrate deploy` lúc khởi động
- Nếu migration thất bại → backend không start, xem log để fix

### Khi đổi schema Meilisearch
- Schema được set trong code (`MeilisearchService.onModuleInit()`)
- Sau deploy → gọi `POST /api/admin/search/reindex` để rebuild index với schema mới

---

## 11. Backup &amp; Restore

### 11.1 Postgres

```bash
# Backup thủ công
docker exec web_truyen_postgres pg_dump -U user -d web_truyen_db -Fc > pg_$(date +%F).dump

# Restore
docker cp pg_2026-05-14.dump web_truyen_postgres:/tmp/
docker exec -it web_truyen_postgres pg_restore -U user -d web_truyen_db --clean --if-exists /tmp/pg_2026-05-14.dump
```

Coolify → Postgres service → **Backups** → cấu hình cron daily + lưu S3.

### 11.2 Garage (object storage)

```bash
# Backup volume bằng tar (offline)
docker compose stop garage
docker run --rm -v web_truyen_garage_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/garage_data_$(date +%F).tar.gz -C /data .
docker run --rm -v web_truyen_garage_meta:/meta -v $(pwd):/backup alpine \
  tar czf /backup/garage_meta_$(date +%F).tar.gz -C /meta .
docker compose start garage

# Hoặc dùng `garage cluster snapshot` (online) — xem doc Garage
```

### 11.3 Meilisearch

```bash
# Tạo snapshot
curl -X POST 'http://localhost:7700/snapshots' \
     -H "Authorization: Bearer $MEILI_MASTER_KEY"

# Snapshot file nằm trong volume meili_data/snapshots/
```

> 💡 Meili index có thể luôn được rebuild từ Postgres bằng `POST /api/admin/search/reindex` → không quá quan trọng nếu mất, miễn Postgres còn.

### 11.4 Redis

Redis chỉ dùng làm queue → mất data = mất các email/notification chưa gửi. Có thể chấp nhận. Nếu muốn backup:
```bash
docker exec web_truyen_redis redis-cli SAVE
docker cp web_truyen_redis:/data/dump.rdb redis_$(date +%F).rdb
```

---

## 12. Rollback

### Rollback code
Coolify lưu lịch sử deploy. Vào tab **Deployments** → chọn deploy cũ → **Rollback to this version**.

### Rollback migration
Prisma không hỗ trợ rollback tự động. Nếu migration mới gây lỗi:
1. Restore DB từ snapshot trước migration.
2. Hoặc tạo migration mới đảo ngược thay đổi.

### Rollback Meilisearch
Sau khi rollback code, schema Meili có thể không khớp → **gọi reindex** lại:
```bash
POST /api/admin/search/reindex
```

---

## 13. Troubleshooting thường gặp

### ❌ Build fail: `pnpm: not found`
Đảm bảo Coolify đang dùng Dockerfile của repo. Settings → Build → **Buildpacks: Docker**.

### ❌ Build fail: `Cannot find module '@web-truyen/shared'`
Base directory phải là `/` (root repo). Nếu để `apps/backend` → Dockerfile không truy cập được `packages/shared`.

### ❌ Runtime: `PrismaClientInitializationError: Can't reach database`
- Kiểm tra `DATABASE_URL` — hostname phải là `postgres` (tên service compose), không phải `localhost`.
- `docker compose ps` xem postgres healthy chưa.
- Managed DB → kiểm tra `?sslmode=require` đã có trong connection string.

### ❌ Email không gửi, log thấy "BullMQ disabled"
`REDIS_URL` chưa được set hoặc Redis chưa healthy. Hệ thống tự fallback sang gửi đồng bộ — vẫn gửi được email, chỉ không có retry/back-pressure.

### ❌ Search trả về 0 kết quả dù DB có data
Meilisearch index trống. Gọi `POST /api/admin/search/reindex` để rebuild từ Postgres.

### ❌ Search log lỗi `MeiliSearchError: Invalid API key`
`MEILI_API_KEY` không khớp với `MEILI_MASTER_KEY` của container. Set 2 biến này thành **cùng giá trị**, redeploy backend.

### ❌ Upload ảnh trả URL `localhost` hoặc `/uploads/...`
Garage chưa được bootstrap (chưa tạo bucket + key) hoặc env `S3_*` chưa set. Tạm thời file lưu local. Xem [Section 7.1](#71-bootstrap-garage-s3-compatible-storage).

### ❌ Garage trả lỗi `bucket not found`
Quên bước `garage bucket create web-truyen`. Vào container Garage chạy lại.

### ❌ VNPay redirect về trang lỗi "Invalid signature"
- `VNPAY_HASH_SECRET` sai (copy thừa khoảng trắng / sai sandbox vs prod).
- VNPay portal đã đổi secret nhưng chưa update env → Redeploy backend.

### ❌ VNPay IPN trả `RspCode 97` (signature invalid)
Cùng nguyên nhân với "Invalid signature". Sandbox và Production secret **khác nhau** — đảm bảo dùng đúng cặp.

### ❌ Frontend CORS blocked
- Backend log: tìm `[CORS] Blocked origin: ...` → origin bị chặn nằm trong dòng này.
- Sửa `CORS_ORIGIN` → Restart backend.

### ❌ Cookie không lưu sau login (cross-subdomain)
Backend cookie thiếu `sameSite: 'none'` hoặc `secure: true` ở prod. Hoặc frontend không gửi `credentials: 'include'` trong axios.

### ❌ Out of memory khi build trên VPS nhỏ
Next.js build cần ~2GB RAM. Meili + Postgres + Redis cộng dồn ~1GB nữa. Khuyến nghị **VPS ≥4GB RAM** hoặc tăng swap. Hoặc build local rồi push image:
```bash
docker build -f apps/backend/Dockerfile -t registry.example.com/web-truyen-backend:latest .
docker push registry.example.com/web-truyen-backend:latest
```
Rồi Coolify pull image thay vì build.

### ❌ Healthcheck fail
- Backend: `docker exec web_truyen_backend wget -qO- http://127.0.0.1:3009/api/health`
- Meili: `docker exec web_truyen_meilisearch wget -qO- http://127.0.0.1:7700/health`
- Garage: `docker exec web_truyen_garage /garage status`
- Redis: `docker exec web_truyen_redis redis-cli ping`

Nếu fail, tăng `start_period` trong compose hoặc xem log container chi tiết.

### ❌ Trang nạp xu trống / không có gói nào
Chưa chạy seed → `coin_packages` rỗng. Coolify → backend Terminal: `npx prisma db seed` (idempotent, chạy lại an toàn). Hoặc tạo tay ở `/admin/coin-packages`.

### ❌ `/transfer` báo "Tính năng chuyển xu hiện đang tắt"
Đúng như thiết kế — mặc định tắt. Admin vào `/admin/settings` bật "Cho phép chuyển xu giữa người dùng".

### ❌ Chuông thông báo không cập nhật realtime (phải F5 mới thấy)
- Kiểm tra DevTools → Network có kết nối `notifications/stream` mở liên tục không. Bị đóng ngay → reverse proxy/timeout cắt SSE: đảm bảo không đặt idle-timeout quá ngắn cho backend service.
- Vẫn không tới đúng người dù 1 kết nối OK → đang chạy **>1 instance backend**. SSE pub/sub là in-process; giảm về 1 instance hoặc chuyển Redis pub/sub (xem [7.5](#75-cấu-hình-tính-năng-kinh-tế-xu--donate--vip--rút-tiền--chuyển-xu)).
- Vẫn poll 30s là fallback — thông báo không mất, chỉ trễ.

### ❌ Yêu cầu rút bị "Số xu rút tối thiểu là N"
`minWithdrawalCoins` (Settings) đang là N. Chỉnh ở `/admin/settings` nếu muốn ngưỡng khác.

---

## 14. Checklist trước khi go-live

### Bảo mật
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` đã sinh mới ≥32 ký tự, không reuse dev
- [ ] `POSTGRES_PASSWORD` mạnh
- [ ] `MEILI_MASTER_KEY` mạnh
- [ ] Garage `rpc_secret` + `admin_token` đã đổi khỏi placeholder
- [ ] Quay password tất cả service DB cũ nếu từng share trong code (và disable project Supabase cũ — đã gỡ khỏi dự án)
- [ ] `CORS_ORIGIN` chỉ chứa domain prod (không `*`, không `localhost`)
- [ ] Cookie auth có `secure: true, sameSite: 'none'` ở prod

### Infrastructure
- [ ] DNS A-record propagate (`dig yourdomain.com`)
- [ ] HTTPS Let's Encrypt cấp cho **cả frontend, backend, cdn (nếu có)**
- [ ] 6 volume persistent (postgres, redis, meili, garage_meta, garage_data, backend_uploads)
- [ ] Backup Postgres tự động (cron daily)

### Service phụ
- [ ] Redis healthy, log backend hiện "Email service ready"
- [ ] Meilisearch healthy, đã chạy reindex ban đầu (`POST /admin/search/reindex`)
- [ ] Garage bucket `web-truyen` tồn tại, có key với quyền read/write
- [ ] `S3_PUBLIC_BASE_URL` accessible từ Internet (nếu khác CDN, có thể là `https://api.yourdomain.com/uploads` nếu chưa setup CDN domain)

### Tính năng
- [ ] `/api/health` trả `200 ok`
- [ ] Login + logout + refresh token chạy đúng end-to-end
- [ ] Upload ảnh chương ra **Garage** (kiểm tra URL trả về có prefix `S3_PUBLIC_BASE_URL`)
- [ ] OAuth Google / Facebook redirect đúng domain prod (đã update callback URL trong console)
- [ ] PWA Service Worker đăng ký, offline page hiển thị khi mất mạng
- [ ] Search trả kết quả từ Meilisearch (kiểm tra log "Meili search hit")
- [ ] VNPay sandbox transaction thành công, coin cộng vào ví (kiểm tra `Payment.status=COMPLETED` + `CoinTransaction(DEPOSIT)`)
- [ ] Email verify đăng ký nhận được trong inbox (test với tài khoản Gmail thật)

### Kinh tế (spec themtinhnang.md)
- [ ] Đã chạy `prisma db seed` → 4 gói xu hiển thị ở trang nạp
- [ ] `/admin/settings`: đã đặt phí nền tảng (%), `minWithdrawalCoins`, quyết định bật/tắt chuyển xu
- [ ] FREEMIUM mua chương + VIP mua trọn bộ hoạt động (paywall + mở khóa)
- [ ] Rút tiền: gửi → xu bị giữ; Từ chối → hoàn xu; Duyệt → ghi nhận (CK tay ngoài hệ thống)
- [ ] Khóa ví (`/admin/wallets`) chặn được giao dịch của user bị khóa
- [ ] **Backend chạy đúng 1 instance** (ràng buộc SSE realtime — xem [7.5](#75-cấu-hình-tính-năng-kinh-tế-xu--donate--vip--rút-tiền--chuyển-xu)); chuông cập nhật realtime khi có donate/bán hàng

### Monitoring
- [ ] Coolify Auto Deploy đã bật, test bằng 1 commit nhỏ
- [ ] UptimeRobot / Better Stack ping `/api/health` mỗi 5 phút
- [ ] Log Winston rotate hợp lý (không đầy disk)

---

## 📚 Tham khảo
- [Coolify Docs](https://coolify.io/docs)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Prisma migrate deploy](https://www.prisma.io/docs/orm/prisma-migrate/workflows/production-and-testing)
- [Garage S3 Documentation](https://garagehq.deuxfleurs.fr/documentation/)
- [Meilisearch Docs](https://www.meilisearch.com/docs)
- [BullMQ Docs](https://docs.bullmq.io/)
- [VNPay Integration Guide](https://sandbox.vnpayment.vn/apis/docs/)
- [Tài liệu nội bộ](../README.md) · [Tính năng dự án](FEATURES.md) · [Mobile app guide](MOBILE_APP_GUIDE.md) · [Lộ trình mobile + thanh toán](LO_TRINH_MOBILE_VA_THANH_TOAN.html) · [Spec thêm tính năng](themtinhnang.md)
