# 🎨 Hướng Dẫn Deploy Backend Lên Render

Hướng dẫn chi tiết từng bước để deploy backend lên Render.

## 📋 Checklist Trước Khi Bắt Đầu

- [ ] Có tài khoản Render (đăng ký tại [render.com](https://render.com))
- [ ] Repository đã push lên GitHub
- [ ] Đã có PostgreSQL database (Neon/Supabase)
- [ ] Đã chuẩn bị các environment variables

---

## 🚀 Bước 1: Tạo Web Service Trên Render

### 1.1. Đăng Nhập và Tạo Service

1. Vào [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → Chọn **Web Service**
3. **Connect GitHub** (nếu chưa connect):
   - Click **Connect GitHub**
   - Authorize Render
   - Chọn repository của bạn

### 1.2. Chọn Repository

- Chọn repository: `web-truyen-tien-hung` (hoặc tên repo của bạn)
- Chọn branch: `main` hoặc `master`

---

## ⚙️ Bước 2: Cấu Hình Service

### 2.1. Basic Settings

Điền các thông tin sau:

| Field | Value |
|-------|-------|
| **Name** | `web-truyen-backend` (hoặc tên bạn muốn) |
| **Environment** | `Node` |
| **Region** | Chọn region gần nhất (Singapore, Frankfurt, etc.) |
| **Branch** | `main` hoặc `master` |
| **Root Directory** | `apps/backend` ⚠️ **QUAN TRỌNG** |

### 2.2. Build & Deploy Settings

| Field | Value |
|-------|-------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start:prod` |

**Lưu ý quan trọng**: 
- Render sẽ tự động chạy `npm install` ở root trước (vì là monorepo)
- Sau đó chạy build command trong `Root Directory` (`apps/backend`)
- Build script đã được cấu hình để tự động generate Prisma client

**Lưu ý**: 
- Render sẽ tự động chạy build command trong `Root Directory` (`apps/backend`)
- Start command cũng chạy trong `apps/backend`

### 2.3. Advanced Settings (Optional)

- **Auto-Deploy**: `Yes` (tự động deploy khi có commit mới)
- **Health Check Path**: `/api/health` (nếu có)
- **Dockerfile Path**: Để trống (không dùng Docker)

---

## 🔐 Bước 3: Thêm Environment Variables

Click vào tab **Environment** → Thêm các biến sau:

### 3.1. Bắt Buộc

```env
# Server
NODE_ENV=production
PORT=3001

# Database - Paste connection string từ Neon/Supabase
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# JWT Secrets - Generate bằng lệnh bên dưới
JWT_SECRET=<generate-32-chars>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<generate-32-chars>
JWT_REFRESH_EXPIRES_IN=30d
```

**Generate JWT Secrets**:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3.2. CORS & Frontend

```env
# CORS - Thay bằng domain frontend của bạn
CORS_ORIGIN=https://your-frontend.vercel.app

# Frontend URL (cho OAuth redirects)
FRONTEND_URL=https://your-frontend.vercel.app
```

### 3.3. Cloudinary (Cho Upload Ảnh)

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Lấy từ [Cloudinary Dashboard](https://cloudinary.com/console)**:
1. Đăng ký/đăng nhập Cloudinary
2. Vào Dashboard → Copy các giá trị

### 3.4. OAuth (Optional - Nếu dùng Google/Facebook Login)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://web-truyen-backend.onrender.com/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=https://web-truyen-backend.onrender.com/api/auth/facebook/callback
```

### 3.5. Rate Limiting (Optional)

```env
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

---

## 🚀 Bước 4: Deploy

1. Click **Create Web Service**
2. Render sẽ bắt đầu build:
   - Install dependencies
   - Run build command
   - Start service
3. Đợi build xong (thường 3-5 phút)
4. Khi build thành công, bạn sẽ thấy:
   - ✅ **Live URL**: `https://web-truyen-backend.onrender.com`
   - Status: **Live**

---

## 🗄️ Bước 5: Run Database Migrations

Sau khi deploy xong, cần chạy migrations để tạo tables trong database.

### Cách 1: Dùng Render Shell (Khuyên Dùng)

1. Vào service → Tab **Shell**
2. Click **Open Shell**
3. Chạy lệnh:
```bash
cd apps/backend
npx prisma migrate deploy
```

### Cách 2: Dùng Local với Render Environment

```bash
# Install Render CLI (optional)
npm i -g render-cli

# Hoặc dùng cách khác: SSH vào Render (nếu có)
```

### Cách 3: Dùng Prisma Studio (Để verify)

```bash
# Trong Render Shell
cd apps/backend
npx prisma studio
# (Sẽ mở Prisma Studio tại localhost:5555 - cần port forwarding)
```

---

## ✅ Bước 6: Verify Deployment

### 6.1. Test API Health

```bash
# Test health endpoint (nếu có)
curl https://web-truyen-backend.onrender.com/api/health

# Test stories endpoint
curl https://web-truyen-backend.onrender.com/api/stories
```

### 6.2. Check Logs

1. Vào service → Tab **Logs**
2. Kiểm tra xem có lỗi không
3. Tìm dòng: `Backend server running on: http://localhost:3001/api`

### 6.3. Test từ Browser

Mở URL: `https://web-truyen-backend.onrender.com/api/stories`

Nếu thấy JSON response → ✅ Deploy thành công!

---

## 🔧 Cấu Hình Bổ Sung

### Custom Domain (Nếu có)

1. Vào service → Tab **Settings**
2. Scroll xuống **Custom Domains**
3. Thêm domain: `api.yourdomain.com`
4. Render sẽ cung cấp DNS records
5. Thêm DNS records vào domain provider
6. Đợi SSL certificate được cấp (tự động)

### Auto-Deploy Settings

1. Vào **Settings** → **Auto-Deploy**
2. Chọn:
   - **Auto-Deploy**: `Yes` (tự động deploy khi push code)
   - **Branch**: `main` hoặc `master`

### Health Checks

1. Vào **Settings** → **Health Check**
2. **Health Check Path**: `/api/health` (nếu có endpoint này)
3. Render sẽ tự động restart nếu health check fail

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Render Free Tier - Auto Sleep

**Vấn đề**: 
- Free tier sẽ tự động sleep sau 15 phút không có traffic
- Request đầu tiên sau khi sleep sẽ mất ~30-60 giây để wake up

**Giải pháp**:
- Upgrade lên **Starter Plan** ($7/tháng) để không bị sleep
- Hoặc dùng service như [UptimeRobot](https://uptimerobot.com) để ping mỗi 5 phút

### 2. Build Timeout

- Render free tier có build timeout là 10 phút
- Nếu build lâu hơn, cần optimize hoặc upgrade plan

### 3. Environment Variables

- **KHÔNG** commit `.env` file lên GitHub
- Chỉ thêm env vars qua Render Dashboard
- Render sẽ tự động inject vào runtime

### 4. Database Connection

- Với Neon: Dùng **pooled connection string** (có `?pgbouncer=true`)
- Với Supabase: Dùng connection string từ Settings → Database

---

## 🔧 Troubleshooting

### Lỗi: Build Failed - "nest: not found"

**Nguyên nhân**: 
- `nest` command không được tìm thấy
- Dependencies chưa được install đúng cách trong monorepo
- `@nestjs/cli` chưa được install

**Giải pháp**:
1. **Đảm bảo build command đúng**:
   ```
   Build Command: npm install && npm run build
   ```
   (Render sẽ tự động install ở root trước)

2. **Build script đã được sửa** để dùng `npx nest build` thay vì `nest build`
   - File `apps/backend/package.json` đã được update
   - Commit và push lại code

3. **Nếu vẫn lỗi**, thử build command này:
   ```
   cd apps/backend && npm install && npx prisma generate && npx nest build
   ```

4. **Test build local trước**:
   ```bash
   # Từ root directory
   npm install
   cd apps/backend
   npm run build
   ```

### Lỗi: Build Failed (Chung)

**Nguyên nhân**: 
- Build command sai
- Dependencies không install được
- TypeScript errors

**Giải pháp**:
1. Check logs trong Render Dashboard
2. Test build local: `cd apps/backend && npm install && npm run build`
3. Fix errors và push lại

### Lỗi: Database Connection Failed

**Nguyên nhân**: 
- `DATABASE_URL` sai
- Database không accessible từ Render IP

**Giải pháp**:
1. Kiểm tra connection string
2. Với Neon: Đảm bảo dùng pooled connection
3. Với Supabase: Check IP whitelist (thường không cần)

### Lỗi: Port Already in Use

**Nguyên nhân**: Render tự động set PORT, không dùng 3001

**Giải pháp**: 
- Backend code đã handle: `process.env.PORT || 3001`
- Không cần fix gì, Render sẽ tự động set PORT

### Lỗi: Service Sleep (Free Tier)

**Triệu chứng**: Request đầu tiên sau khi sleep rất chậm

**Giải pháp**:
- Upgrade lên Starter Plan
- Hoặc dùng UptimeRobot để keep-alive

### Lỗi: CORS Error

**Nguyên nhân**: `CORS_ORIGIN` không khớp với frontend URL

**Giải pháp**:
1. Check `CORS_ORIGIN` trong environment variables
2. Đảm bảo match với frontend URL (bao gồm `https://`)
3. Nếu có nhiều origins, có thể dùng: `https://domain1.com,https://domain2.com`

---

## 📊 Monitoring

### View Logs

1. Vào service → Tab **Logs**
2. Xem real-time logs
3. Có thể filter và search

### Metrics

1. Vào service → Tab **Metrics**
2. Xem:
   - CPU usage
   - Memory usage
   - Request count
   - Response time

---

## 🔄 Update/Deploy Mới

### Auto-Deploy (Khuyên Dùng)

1. Push code lên GitHub
2. Render tự động detect và deploy
3. Xem progress trong **Events** tab

### Manual Deploy

1. Vào service → Tab **Manual Deploy**
2. Chọn branch/commit
3. Click **Deploy**

### Rollback

1. Vào **Events** tab
2. Tìm deployment cũ
3. Click **Redeploy**

---

## 🎉 Hoàn Thành!

Backend đã được deploy lên Render thành công!

**Next Steps**:
1. ✅ Update frontend `NEXT_PUBLIC_API_URL` = `https://web-truyen-backend.onrender.com`
2. ✅ Test API endpoints
3. ✅ Setup monitoring (optional)
4. ✅ Configure custom domain (optional)

---

## 📚 Tài Liệu Tham Khảo

- [Render Docs](https://render.com/docs)
- [Render Web Services](https://render.com/docs/web-services)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [NestJS Deployment](https://docs.nestjs.com/recipes/deployment)

---

## 💡 Tips & Best Practices

1. **Luôn test build local trước khi push**
2. **Check logs thường xuyên để phát hiện lỗi sớm**
3. **Dùng environment variables thay vì hardcode**
4. **Setup health checks để auto-restart khi crash**
5. **Monitor metrics để optimize performance**
6. **Backup database thường xuyên**
