# 🚀 Hướng Dẫn Triển Khai Backend

Hướng dẫn chi tiết để deploy backend lên production.

## 📋 Mục Lục

1. [Chuẩn Bị](#chuẩn-bị)
2. [Option 1: Railway (Khuyên Dùng)](#option-1-railway-khuyên-dùng)
3. [Option 2: Render](#option-2-render)
4. [Option 3: VPS (Vultr, DigitalOcean, AWS)](#option-3-vps-vultr-digitalocean-aws)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Post-Deployment](#post-deployment)

---

## 🎯 Chuẩn Bị

### 1. Database (PostgreSQL)

Bạn cần một PostgreSQL database. Các lựa chọn:

#### **Option A: Neon (Free Tier - Khuyên Dùng)**

1. Vào [Neon Console](https://console.neon.tech)
2. **Create Project** → Chọn region gần nhất
3. **Copy Connection String**:
   - Vào **Dashboard** → **Connection Details**
   - Copy connection string (dạng: `postgresql://user:password@host/database?sslmode=require`)
   - Lưu lại để dùng cho `DATABASE_URL`

#### **Option B: Supabase (Free Tier)**

1. Vào [Supabase](https://supabase.com)
2. **New Project** → Đặt tên project
3. **Settings** → **Database** → Copy connection string

#### **Option C: Railway PostgreSQL**

1. Vào [Railway](https://railway.app)
2. **New Project** → **New Database** → **PostgreSQL**
3. Click vào database → **Variables** → Copy `DATABASE_URL`

---

## 🚂 Option 1: Railway (Khuyên Dùng)

**Ưu điểm**: Dễ setup, tự động SSL, free tier tốt

### Bước 1: Tạo Project

1. Vào [Railway](https://railway.app) → Đăng nhập
2. **New Project** → **Deploy from GitHub repo**
3. Chọn repository của bạn → Chọn branch (thường là `main` hoặc `master`)

### Bước 2: Cấu Hình

1. Click vào service vừa tạo
2. Vào tab **Settings**
3. Cấu hình:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### Bước 3: Thêm Environment Variables

Vào tab **Variables** → Thêm các biến sau:

```env
# Server
NODE_ENV=production
PORT=3001

# CORS - Thay bằng domain frontend của bạn
CORS_ORIGIN=https://your-frontend.vercel.app

# Database - Paste connection string từ Neon/Supabase
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# JWT Secrets - Generate bằng lệnh bên dưới
JWT_SECRET=<generate-32-chars>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<generate-32-chars>
JWT_REFRESH_EXPIRES_IN=30d

# Frontend URL
FRONTEND_URL=https://your-frontend.vercel.app

# Cloudinary (cho upload ảnh)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OAuth - Google (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/api/auth/google/callback

# OAuth - Facebook (Optional)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=https://your-backend.railway.app/api/auth/facebook/callback

# Rate Limiting (Optional)
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

**Generate JWT Secrets**:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Bước 4: Deploy

1. Railway sẽ tự động build và deploy
2. Đợi build xong (thường 2-5 phút)
3. Click vào service → Tab **Settings** → **Generate Domain** để lấy URL
4. URL sẽ có dạng: `https://your-app.railway.app`

### Bước 5: Run Migrations

Sau khi deploy xong, cần chạy database migrations:

**Cách 1: Dùng Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migrations
cd apps/backend
railway run npx prisma migrate deploy
```

**Cách 2: Dùng Railway Dashboard**
1. Vào service → Tab **Deployments**
2. Click vào deployment mới nhất
3. Mở **Shell** hoặc **Logs**
4. Chạy: `npx prisma migrate deploy`

---

## 🎨 Option 2: Render

**Ưu điểm**: Free tier tốt, dễ sử dụng

### Bước 1: Tạo Web Service

1. Vào [Render](https://render.com) → Đăng nhập
2. **New +** → **Web Service**
3. **Connect GitHub** → Chọn repository

### Bước 2: Cấu Hình

- **Name**: `web-truyen-backend`
- **Environment**: `Node`
- **Region**: Chọn gần nhất
- **Branch**: `main` hoặc `master`
- **Root Directory**: `apps/backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`

### Bước 3: Environment Variables

Thêm các biến giống như Railway (xem phần trên)

### Bước 4: Deploy

1. Click **Create Web Service**
2. Render sẽ tự động build và deploy
3. URL sẽ có dạng: `https://web-truyen-backend.onrender.com`

### Bước 5: Run Migrations

```bash
# SSH vào Render (nếu có) hoặc dùng Render Shell
cd apps/backend
npx prisma migrate deploy
```

---

## 🖥️ Option 3: VPS (Vultr, DigitalOcean, AWS)

**Ưu điểm**: Full control, có thể tùy chỉnh

### Bước 1: Setup Server

```bash
# SSH vào server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (reverse proxy)
apt install -y nginx
```

### Bước 2: Clone Repository

```bash
# Install Git (nếu chưa có)
apt install -y git

# Clone repository
cd /var/www
git clone https://github.com/your-username/web-truyen-tien-hung.git
cd web-truyen-tien-hung

# Install dependencies
npm install
```

### Bước 3: Setup Environment

```bash
# Tạo .env file
cd apps/backend
nano .env
```

Paste các environment variables (xem phần Environment Variables)

```bash
# Build backend
npm run build
```

### Bước 4: Setup PM2

```bash
# Start với PM2
pm2 start dist/main.js --name "web-truyen-backend"

# Save PM2 config
pm2 save

# Setup PM2 startup script
pm2 startup
# (Copy và chạy lệnh mà PM2 hiển thị)

# Check status
pm2 status
pm2 logs web-truyen-backend
```

### Bước 5: Setup Nginx

```bash
# Tạo Nginx config
nano /etc/nginx/sites-available/web-truyen-backend
```

Paste config sau (thay `api.yourdomain.com` bằng domain của bạn):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/web-truyen-backend /etc/nginx/sites-enabled/

# Test config
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Bước 6: Setup SSL với Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d api.yourdomain.com

# Auto-renewal (đã tự động setup)
certbot renew --dry-run
```

### Bước 7: Run Migrations

```bash
cd /var/www/web-truyen-tien-hung/apps/backend
npx prisma migrate deploy
```

---

## 🔐 Environment Variables

### Bắt Buộc

| Variable | Mô Tả | Ví Dụ |
|----------|-------|-------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret cho JWT (tối thiểu 32 ký tự) | Generate bằng `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Secret cho refresh token | Generate bằng `openssl rand -base64 32` |

### Tùy Chọn (Nhưng Khuyên Dùng)

| Variable | Mô Tả | Default |
|----------|-------|---------|
| `PORT` | Port server chạy | `3001` |
| `NODE_ENV` | Environment | `production` |
| `CORS_ORIGIN` | Frontend URL cho CORS | `http://localhost:3000` |
| `FRONTEND_URL` | Frontend URL cho OAuth redirects | `http://localhost:3000` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | - |
| `FACEBOOK_APP_ID` | Facebook App ID | - |
| `FACEBOOK_APP_SECRET` | Facebook App Secret | - |

### Generate JWT Secrets

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## 🗄️ Database Setup

### 1. Tạo Database

Nếu dùng Neon/Supabase, database đã được tạo sẵn. Chỉ cần copy connection string.

### 2. Run Migrations

Sau khi deploy backend, cần chạy migrations:

```bash
# Nếu dùng Railway CLI
railway run npx prisma migrate deploy

# Nếu dùng Render/VPS
cd apps/backend
npx prisma migrate deploy
```

### 3. (Optional) Seed Data

```bash
# Chạy seed script
npm run prisma:seed
```

---

## ✅ Post-Deployment

### 1. Verify Deployment

**Test API Health**:
```bash
curl https://your-backend-url.com/api/health
```

**Test API Endpoint**:
```bash
curl https://your-backend-url.com/api/stories
```

### 2. Update Frontend

Cập nhật `NEXT_PUBLIC_API_URL` trong frontend:

**Vercel**:
- Vào project → **Settings** → **Environment Variables**
- Thêm: `NEXT_PUBLIC_API_URL=https://your-backend-url.com`

**Local**:
- Tạo file `apps/frontend/.env.local`
- Thêm: `NEXT_PUBLIC_API_URL=https://your-backend-url.com`

### 3. Monitor Logs

**Railway**:
- Vào service → Tab **Deployments** → Click deployment → Xem logs

**Render**:
- Vào service → Tab **Logs**

**VPS (PM2)**:
```bash
pm2 logs web-truyen-backend
pm2 monit
```

### 4. Update Domain (Nếu có)

**Railway**:
- Settings → **Generate Domain** hoặc **Custom Domain**

**Render**:
- Settings → **Custom Domain**

**VPS**:
- Đã setup trong Nginx config

---

## 🔧 Troubleshooting

### Lỗi: Database Connection Failed

**Nguyên nhân**: `DATABASE_URL` sai hoặc database không accessible

**Giải pháp**:
1. Kiểm tra connection string
2. Đảm bảo database cho phép connection từ IP của server
3. Với Neon: Dùng pooled connection string

### Lỗi: Port Already in Use

**Nguyên nhân**: Port 3001 đã được sử dụng

**Giải pháp**:
```bash
# Tìm process đang dùng port
lsof -i :3001

# Kill process
kill -9 <PID>

# Hoặc đổi PORT trong .env
PORT=3002
```

### Lỗi: JWT_SECRET too short

**Nguyên nhân**: JWT_SECRET ngắn hơn 32 ký tự

**Giải pháp**: Generate lại secret dài hơn 32 ký tự

### Lỗi: CORS Error

**Nguyên nhân**: `CORS_ORIGIN` không khớp với frontend URL

**Giải pháp**: Cập nhật `CORS_ORIGIN` trong environment variables

---

## 📚 Tài Liệu Tham Khảo

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [NestJS Deployment](https://docs.nestjs.com/recipes/deployment)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

## 🎉 Hoàn Thành!

Backend đã được deploy thành công! 

**Next Steps**:
1. ✅ Deploy frontend (xem `FRONTEND_DEPLOYMENT.md`)
2. ✅ Test API endpoints
3. ✅ Setup monitoring (optional)
4. ✅ Configure backups (optional)
