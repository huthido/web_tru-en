# 🚀 Hướng Dẫn Chạy Project

Hướng dẫn chi tiết để chạy cả Backend và Frontend.

---

## 📋 Prerequisites

Đảm bảo đã cài đặt:
- ✅ Node.js (v18+)
- ✅ npm hoặc yarn
- ✅ Git

---

## 🔧 Bước 1: Install Dependencies

### Backend
```bash
cd apps/backend
npm install
```

### Frontend
```bash
cd apps/frontend
npm install
```

**Hoặc chạy cả 2 cùng lúc (từ root):**
```bash
# Backend
cd apps/backend && npm install && cd ../..

# Frontend
cd apps/frontend && npm install && cd ../..
```

---

## 🗄️ Bước 2: Setup Database

### 2.1. Kiểm Tra Database Connection

Đảm bảo file `apps/backend/.env` có DATABASE_URL đúng:

```env
DATABASE_URL=postgresql://postgres.xotchyrdmgcwuanngxtx:[YOUR-PASSWORD]@db.xotchyrdmgcwuanngxtx.supabase.co:5432/postgres?sslmode=require
```

**Lưu ý:**
- Phải dùng **Direct Connection** (port 5432) cho migrations
- Host: `db.xotchyrdmgcwuanngxtx.supabase.co`
- Nếu gặp lỗi P1001, xem `apps/backend/FIX_P1001_ERROR.md`

### 2.2. Chạy Migrations

```bash
cd apps/backend
npx prisma migrate dev --name add_auth_fields
npx prisma generate
```

**Kết quả mong đợi:**
```
✔ Migration created
✔ Generated Prisma Client
```

---

## ⚙️ Bước 3: Configure Environment Variables

### Backend (.env)

File `apps/backend/.env` cần có:

```env
# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Database (đã có từ bước 2)
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=c7f9e4b2d1a9f0c6e5b4a3d2c1e9f8a
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=f9c8d7e6a5b4c3d2e1f0a9b8c7d6e5a
JWT_REFRESH_EXPIRES_IN=30d

# OAuth (optional - chỉ cần nếu dùng OAuth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_CALLBACK_URL=http://localhost:3001/api/auth/facebook/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback

FRONTEND_URL=http://localhost:3000

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**Copy từ `env.example`:**
```bash
cd apps/backend
cp env.example .env
# Sau đó chỉnh sửa .env với giá trị thực tế
```

### Frontend (.env.local)

Tạo file `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Hoặc tạo file:**
```bash
cd apps/frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
```

---

## 🎯 Bước 4: Chạy Backend

### Terminal 1 - Backend

```bash
cd apps/backend
npm run dev
```

**Kết quả mong đợi:**
```
🚀 Backend server running on: http://localhost:3001/api
```

**Test backend:**
```bash
# Test health check (nếu có)
curl http://localhost:3001/api

# Hoặc mở browser:
# http://localhost:3001/api
```

---

## 🎨 Bước 5: Chạy Frontend

### Terminal 2 - Frontend

```bash
cd apps/frontend
npm run dev
```

**Kết quả mong đợi:**
```
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  - ready started server on 0.0.0.0:3000
```

**Mở browser:**
```
http://localhost:3000
```

---

## ✅ Bước 6: Test Authentication

### 6.1. Test Register

1. Mở http://localhost:3000/register
2. Điền form:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `Test1234`
   - Confirm Password: `Test1234`
3. Click "Đăng ký"
4. Nếu thành công, sẽ redirect về homepage

### 6.2. Test Login

1. Mở http://localhost:3000/login
2. Điền:
   - Email/Username: `test@example.com`
   - Password: `Test1234`
3. Click "Đăng nhập"
4. Nếu thành công, sẽ redirect về homepage

### 6.3. Test Protected Route

1. Sau khi login, truy cập: http://localhost:3000/profile
2. Nếu thấy profile page → Protected route hoạt động ✅

---

## 🐛 Troubleshooting

### Backend không chạy

**Lỗi: Port 3001 đã được sử dụng**
```bash
# Tìm process đang dùng port 3001
netstat -ano | findstr :3001

# Kill process (thay PID bằng process ID)
taskkill /PID <PID> /F

# Hoặc đổi PORT trong .env
PORT=3002
```

**Lỗi: Database connection failed (P1001)**
- Xem `apps/backend/FIX_P1001_ERROR.md`
- Kiểm tra Supabase project có active không
- Re-fetch connection string từ Supabase Dashboard

**Lỗi: Prisma Client chưa generate**
```bash
cd apps/backend
npx prisma generate
```

### Frontend không chạy

**Lỗi: Port 3000 đã được sử dụng**
```bash
# Tìm process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Hoặc Next.js sẽ tự động dùng port khác (3001, 3002, ...)
```

**Lỗi: Cannot connect to API**
- Kiểm tra backend đang chạy không
- Kiểm tra `NEXT_PUBLIC_API_URL` trong `.env.local`
- Kiểm tra CORS trong backend `.env` (`CORS_ORIGIN`)

**Lỗi: Module not found**
```bash
cd apps/frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Scripts Hữu Ích

### Backend Scripts

```bash
cd apps/backend

# Development
npm run dev

# Build
npm run build

# Start production
npm run start:prod

# Prisma
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio
```

### Frontend Scripts

```bash
cd apps/frontend

# Development
npm run dev

# Build
npm run build

# Start production
npm run start

# Lint
npm run lint
```

---

## 🎯 Quick Start (Tóm Tắt)

```bash
# 1. Install dependencies
cd apps/backend && npm install && cd ../..
cd apps/frontend && npm install && cd ../..

# 2. Setup database
cd apps/backend
npx prisma migrate dev --name add_auth_fields
npx prisma generate

# 3. Configure .env files
# - Backend: apps/backend/.env (copy từ env.example)
# - Frontend: apps/frontend/.env.local (NEXT_PUBLIC_API_URL=http://localhost:3001/api)

# 4. Run backend (Terminal 1)
cd apps/backend
npm run dev

# 5. Run frontend (Terminal 2)
cd apps/frontend
npm run dev

# 6. Open browser
# http://localhost:3000
```

---

## ✅ Checklist

Trước khi chạy, đảm bảo:

- [ ] Node.js đã cài (v18+)
- [ ] Dependencies đã install (backend + frontend)
- [ ] Database connection string đúng (Direct connection, port 5432)
- [ ] Migrations đã chạy (`prisma migrate dev`)
- [ ] Prisma Client đã generate (`prisma generate`)
- [ ] Backend `.env` đã config đầy đủ
- [ ] Frontend `.env.local` có `NEXT_PUBLIC_API_URL`
- [ ] Backend đang chạy (port 3001)
- [ ] Frontend đang chạy (port 3000)

---

## 🎉 Hoàn Thành!

Nếu tất cả đều chạy:
- ✅ Backend: http://localhost:3001/api
- ✅ Frontend: http://localhost:3000
- ✅ Có thể test register/login

**Chúc bạn code vui vẻ! 🚀**

