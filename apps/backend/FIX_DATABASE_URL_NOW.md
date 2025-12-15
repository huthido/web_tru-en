# 🔧 Sửa DATABASE_URL Ngay - Hướng Dẫn

## ⚠️ Vấn Đề

File `.env` đang dùng **pooler connection** (SAI):
```
DATABASE_URL=postgresql://postgres.xotchyrdmgcwuanngxtx:M1d6eGYFXRtivJFy@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Tại sao sai?**
- Host: `aws-1-ap-south-1.pooler.supabase.com` (pooler)
- Port: `5432` (direct port)
- **Pooler không hỗ trợ migrations!**

## ✅ Giải Pháp

### Cách 1: Sửa Thủ Công (Khuyến Nghị)

1. Mở file `apps/backend/.env`
2. Tìm dòng `DATABASE_URL=`
3. Thay thế:

**TỪ:**
```
aws-1-ap-south-1.pooler.supabase.com:5432
```

**THÀNH:**
```
db.xotchyrdmgcwuanngxtx.supabase.co:5432
```

**Kết quả:**
```env
DATABASE_URL=postgresql://postgres.xotchyrdmgcwuanngxtx:M1d6eGYFXRtivJFy@db.xotchyrdmgcwuanngxtx.supabase.co:5432/postgres?sslmode=require
```

### Cách 2: Copy Từ Supabase Dashboard

1. Vào **Supabase Dashboard** > **Settings** > **Database**
2. Scroll xuống **Connection string**
3. Chọn tab **Direct connection**
4. Chọn mode **URI**
5. Copy connection string
6. Paste vào `.env` (thay thế dòng DATABASE_URL hiện tại)

## ✅ Sau Khi Sửa

Chạy lại migration:
```bash
cd apps/backend
npx prisma migrate dev --name add_auth_fields
```

Sẽ hoạt động! ✅

## 📝 Tại Sao `db pull` Chạy Được Nhưng `migrate dev` Không?

- **`db pull`**: Chỉ đọc schema (read-only) → có thể chạy với pooler (nhưng không đúng)
- **`migrate dev`**: Cần write operations, transactions → **BẮT BUỘC** phải dùng direct connection

Xem chi tiết: `WHY_DB_PULL_WORKS_BUT_MIGRATE_FAILS.md`

