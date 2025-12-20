# 🔧 Fix Render Build - Workspace Issue

## ❌ Vấn Đề

Path: `/opt/render/project/src/apps/backend`
Lỗi: `npx nest build` không tìm thấy executable

**Nguyên nhân**: 
- Render đang chạy build từ workspace `apps/backend`
- `@nestjs/cli` ở root `node_modules` nhưng `npx` không tìm thấy

## ✅ Giải Pháp: Sửa Build Script

### Đã Sửa `apps/backend/package.json`

Build script đã được sửa để tìm `nest` CLI từ nhiều nơi:

```json
{
  "scripts": {
    "build": "node ../../node_modules/.bin/nest build || node node_modules/.bin/nest build || npx nest build"
  }
}
```

**Cách hoạt động**:
1. Thử tìm `nest` ở root `node_modules` (../../node_modules/.bin/nest)
2. Nếu không có, thử tìm ở local `node_modules` (node_modules/.bin/nest)
3. Nếu vẫn không có, dùng `npx` (sẽ tự động download)

---

## 🚀 Cấu Hình Render

### Option 1: Root Directory TRỐNG (KHUYÊN DÙNG)

1. **Root Directory**: (TRỐNG)
2. **Build Command**: 
   ```
   npm install && npm run build:backend
   ```
3. **Start Command**: 
   ```
   cd apps/backend && node dist/main
   ```

### Option 2: Root Directory = `apps/backend`

1. **Root Directory**: `apps/backend`
2. **Build Command**: 
   ```
   cd ../.. && npm install && cd apps/backend && npm run build
   ```
3. **Start Command**: 
   ```
   npm run start:prod
   ```

**Lưu ý**: Build script đã được sửa để tự động tìm `nest` CLI từ root.

---

## 📝 Commit và Push

```bash
git add apps/backend/package.json
git commit -m "Fix: Build script finds nest CLI from root node_modules"
git push
```

---

## 🔍 Verify

Sau khi deploy, logs sẽ hiển thị:

**Nếu Root Directory trống**:
```
==> Building at /opt/render/project/src
==> npm install
==> npm run build:backend
==> node ../../node_modules/.bin/nest build
✅ Build succeeded
```

**Nếu Root Directory = apps/backend**:
```
==> Building at /opt/render/project/src/apps/backend
==> cd ../.. && npm install
==> cd apps/backend && npm run build
==> node ../../node_modules/.bin/nest build
✅ Build succeeded
```

---

## ✅ Checklist

- [ ] Build script đã được sửa (tìm nest từ root)
- [ ] `@nestjs/cli` đã có trong root `package.json`
- [ ] Code đã commit và push
- [ ] Build Command trên Render đúng
- [ ] Root Directory đúng (trống hoặc `apps/backend`)

---

## 🎉 Sau Khi Thành Công

Test API:
```bash
curl https://your-service.onrender.com/api/stories
```
