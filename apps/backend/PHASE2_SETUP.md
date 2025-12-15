# Phase 2: Authentication System - Setup Guide

## ✅ Đã Hoàn Thành

Tất cả code đã được implement. Bây giờ cần setup và test.

## 🔧 Setup Steps

### 1. Run Migration

Cập nhật User model với các fields mới:

```bash
cd apps/backend
npx prisma migrate dev --name add_auth_fields
npx prisma generate
```

### 2. Install Dependencies

```bash
# Backend
cd apps/backend
npm install

# Frontend
cd apps/frontend
npm install
```

### 3. Configure Environment Variables

Cập nhật `apps/backend/.env`:

```env
# JWT (đã có)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# OAuth (optional - chỉ cần nếu muốn dùng OAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3001/api/auth/facebook/callback

FRONTEND_URL=http://localhost:3000
```

### 4. Setup OAuth Apps (Optional)

#### Google OAuth
1. Vào https://console.cloud.google.com
2. Tạo project mới hoặc chọn project
3. Enable "Google+ API"
4. Tạo OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID và Client Secret vào `.env`

#### Facebook OAuth
1. Vào https://developers.facebook.com
2. Tạo app mới
3. Add "Facebook Login" product
4. Settings > Basic: Add callback URL
5. Settings > Advanced: Enable "Require App Secret"
6. Copy App ID và App Secret vào `.env`


## 🧪 Testing

### Test Registration

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test1234",
    "confirmPassword": "Test1234"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "test@example.com",
    "password": "Test1234"
  }'
```

### Test Protected Route

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: access_token=YOUR_TOKEN"
```

## 📝 Notes

- OAuth có thể bỏ qua nếu không cần ngay
- Local authentication (email/password) hoạt động độc lập
- HTTP-only cookies được set tự động
- Frontend đã tích hợp sẵn với React Query

## ✅ Phase 2 Complete!

Sau khi setup xong, bạn có thể:
1. Test register/login
2. Test OAuth (nếu đã config)
3. Test protected routes
4. Tiếp tục Phase 3

