# Sửa Lỗi "Can't reach database server"

## 🔍 Nguyên Nhân Có Thể

1. **Password có ký tự đặc biệt** - Cần URL encode
2. **Connection string format sai** - Copy không đúng từ Supabase
3. **Network restrictions** - Supabase chặn IP
4. **Firewall/VPN** - Blocking connection

## ✅ Giải Pháp Từng Bước

### Bước 1: Lấy Lại Connection String Từ Supabase

1. Vào **Supabase Dashboard**: https://supabase.com/dashboard
2. Chọn project của bạn
3. **Settings** (⚙️) > **Database**
4. Scroll xuống section **Connection string**
5. Chọn tab **Direct connection** (KHÔNG phải Connection pooling)
6. Chọn mode **URI**
7. **Copy toàn bộ connection string** (không chỉnh sửa gì)

### Bước 2: Kiểm tra Password

Nếu password có ký tự đặc biệt (`!@#$%^&*()`), cần **URL encode**:

| Ký tự | URL Encoded |
|-------|-------------|
| `!` | `%21` |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `*` | `%2A` |
| `(` | `%28` |
| `)` | `%29` |

**Hoặc đơn giản hơn:** Reset password trong Supabase để dùng password không có ký tự đặc biệt.

### Bước 3: Kiểm tra Network Restrictions

1. Vào **Supabase Dashboard** > **Settings** > **Database**
2. Scroll xuống **Network restrictions**
3. Nếu có IP whitelist:
   - Thêm IP hiện tại của bạn
   - Hoặc tạm thời disable (chỉ cho development)

### Bước 4: Test Connection String

**Cách 1: Dùng psql (nếu có)**
```bash
psql "postgresql://postgres.xotchyrdmgcwuanngxtx:YourPassword@db.xotchyrdmgcwuanngxtx.supabase.co:5432/postgres?sslmode=require"
```

**Cách 2: Test với Prisma**
```bash
cd apps/backend
npx prisma db pull
```

### Bước 5: Thử Format Khác

Nếu vẫn không được, thử format này:

```env
# Format với connection parameters
DATABASE_URL=postgresql://postgres.xotchyrdmgcwuanngxtx:YourPassword@db.xotchyrdmgcwuanngxtx.supabase.co:5432/postgres?sslmode=require&connect_timeout=10
```

## 🔧 Giải Pháp Tạm Thời

### Option 1: Reset Database Password

1. **Supabase Dashboard** > **Settings** > **Database**
2. Scroll xuống **Database password**
3. Click **Reset database password**
4. Copy password mới (chọn password không có ký tự đặc biệt)
5. Cập nhật connection string

### Option 2: Dùng Connection Pooler (Transaction Mode)

Nếu direct connection không hoạt động:

1. **Supabase Dashboard** > **Settings** > **Database**
2. **Connection string** > **Connection pooling** tab
3. Chọn **Transaction** mode
4. Copy connection string
5. Thử với Prisma (một số operations có thể hoạt động)

**Lưu ý:** Pooler vẫn không hỗ trợ migrations, nhưng có thể dùng cho `db pull` trong một số trường hợp.

### Option 3: Tạo Migration Thủ Công

1. Vào **Supabase Dashboard** > **SQL Editor**
2. Tạo tables bằng SQL dựa trên Prisma schema
3. Sau đó dùng `prisma db pull` để sync

## 📝 Checklist

- [ ] Đã copy connection string trực tiếp từ Supabase (không chỉnh sửa)
- [ ] Password đúng (không có typo)
- [ ] Password đã URL encode nếu có ký tự đặc biệt
- [ ] Network restrictions đã được cấu hình
- [ ] Đã tắt VPN nếu đang dùng
- [ ] Đã thử reset database password
- [ ] Đã thử cả direct và pooler connection

## 🆘 Nếu Vẫn Không Được

1. **Kiểm tra Supabase project status** - Đảm bảo project đang active
2. **Thử từ browser khác/network khác** - Loại trừ firewall
3. **Liên hệ Supabase support** - Nếu project có vấn đề
4. **Tạm thời dùng local PostgreSQL** - Với Docker để tiếp tục development

## 💡 Mẹo

**Cách nhanh nhất để có connection string đúng:**

1. Vào Supabase Dashboard
2. Settings > Database > Connection string
3. Chọn **Direct connection** > **URI**
4. Click nút **Copy** (không tự type)
5. Paste trực tiếp vào `.env`
6. Thay `[YOUR-PASSWORD]` bằng password thực tế (URL encode nếu cần)

**Đảm bảo:**
- Không có khoảng trắng thừa
- Không có line break
- Format đúng với `?sslmode=require` ở cuối

