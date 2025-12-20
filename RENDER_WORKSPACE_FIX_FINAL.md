# 🔧 Fix Render - Workspace Not Found

## ❌ Vấn Đề

```
npm error No workspaces found:
npm error   --workspace=apps/backend
```

**Nguyên nhân**: 
- Render có thể không nhận diện workspaces đúng cách
- Hoặc `npm install` chưa setup workspaces trước khi chạy build command

## ✅ Giải Pháp: Build Trực Tiếp

Thay vì dùng workspace command, chạy build trực tiếp từ `apps/backend`:

### Cấu Hình Render

**Root Directory**: TRỐNG (để trống)

**Build Command**:
```bash
npm install && cd apps/backend && npx prisma generate && npm run build
```

**Start Command**:
```bash
cd apps/backend && node dist/main
```

---

## 🚀 Các Bước

### Bước 1: Verify Code

Đảm bảo:
- ✅ Root `package.json` có workspaces config
- ✅ `apps/backend/package.json` có build script: `npx nest build`

### Bước 2: Cấu Hình Render

1. **Root Directory**: TRỐNG (xóa hết nếu có)
2. **Build Command**: 
   ```
   npm install && cd apps/backend && npx prisma generate && npm run build
   ```
3. **Start Command**: 
   ```
   cd apps/backend && node dist/main
   ```
4. **Save Changes**

### Bước 3: Deploy

1. Click **Manual Deploy** → **Deploy latest commit**
2. Xem logs

---

## 🔍 Verify Logs

Sau khi deploy thành công:

```
==> Building at /opt/render/project/src
==> npm install
==> Installing dependencies...
==> cd apps/backend
==> npx prisma generate
==> npm run build
==> npx nest build
✅ Build succeeded
```

**Path phải là**: `/opt/render/project/src` (KHÔNG có `apps/backend`)

---

## ✅ Tại Sao Hoạt Động

1. **Root Directory trống** → Build từ root
2. **npm install** → Install tất cả dependencies (bao gồm `@nestjs/cli` ở root)
3. **cd apps/backend** → Chuyển vào thư mục backend
4. **npx prisma generate** → Generate Prisma Client
5. **npm run build** → Chạy build script trong `apps/backend/package.json` (sẽ dùng `npx nest build`)
6. **npx nest build** → Tìm `nest` từ root `node_modules` (npm workspaces hoist)

---

## 🎉 Sau Khi Thành Công

Test API:
```bash
curl https://your-service.onrender.com/api/stories
```

Nếu thấy JSON response → ✅ Deploy thành công!
