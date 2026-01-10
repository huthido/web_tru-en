# 🍎 iOS Safari OAuth Login Fix

## Vấn đề
iPhone/iOS Safari **KHÔNG thể đăng nhập** bằng Google/Facebook OAuth do:
- ❌ **ITP (Intelligent Tracking Prevention)** block third-party cookies
- ❌ **Cross-origin redirects** clear cookies
- ❌ **SameSite=None** cần HTTPS nhưng localhost không có SSL

## Flow hiện tại (BỊ LỖI trên iOS)
```
1. User click "Login with Google" → Google Auth
2. Google redirect → http://localhost:3001/api/auth/google/callback
3. Backend create code → Redirect http://localhost:3000/auth/callback?code=xxx
4. Frontend exchange code → Set cookies
   ❌ COOKIES BỊ BLOCK vì cross-origin (3001 → 3000)
```

## Giải pháp

### ✅ Solution 1: Deploy lên Production (RECOMMENDED)
Deploy backend và frontend lên **cùng 1 domain**:
- Frontend: `https://yourdomain.com`
- Backend: `https://yourdomain.com/api` (hoặc `https://api.yourdomain.com`)

**Khi deploy:**
```env
# Backend .env
FRONTEND_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
FACEBOOK_CALLBACK_URL=https://yourdomain.com/api/auth/facebook/callback
```

iOS Safari sẽ accept cookies vì:
- ✅ Same domain (first-party context)
- ✅ HTTPS enabled
- ✅ SameSite=None works correctly

### ✅ Solution 2: Ngrok cho Development (TESTING)
Dùng **ngrok** để expose localhost với HTTPS:

```bash
# Install ngrok
# https://ngrok.com/download

# Expose backend
ngrok http 3001 --domain=your-backend.ngrok.io

# Expose frontend (terminal khác)
ngrok http 3000 --domain=your-frontend.ngrok.io
```

**Update .env:**
```env
# Backend
FRONTEND_URL=https://your-frontend.ngrok.io
GOOGLE_CALLBACK_URL=https://your-backend.ngrok.io/api/auth/google/callback
FACEBOOK_CALLBACK_URL=https://your-backend.ngrok.io/api/auth/facebook/callback

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://your-backend.ngrok.io/api
```

**Update Google OAuth Console:**
- Authorized redirect URIs: `https://your-backend.ngrok.io/api/auth/google/callback`
- Authorized JavaScript origins: `https://your-frontend.ngrok.io`

### ❌ Solution 3: Localhost với mDNS (KHÔNG KHUYẾN NGHỊ)
Dùng `.local` domain nhưng vẫn không có HTTPS → vẫn bị lỗi.

## Code đã optimize cho iOS

### Backend Cookie Settings
```typescript
// apps/backend/src/auth/auth.controller.ts
res.cookie('access_token', tokens.accessToken, {
  httpOnly: true,
  secure: isHttps,  // Auto-detect HTTPS
  sameSite: isCrossOrigin && isHttps ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### Frontend Axios Interceptor
```typescript
// apps/frontend/src/lib/api/client.ts
- withCredentials: true  // Send cookies cross-origin
- Intelligent retry logic for 401 errors
- Token refresh queue to prevent race conditions
```

## Test Flow

### Desktop/Android (✅ WORKS)
1. Login with Google → Success
2. Cookies set → Authenticated
3. Refresh token works

### iPhone/iOS Safari (❌ BLOCKED on localhost)
1. Login with Google → Redirect back
2. ❌ Cookies KHÔNG được set (ITP block)
3. Redirect to `/login?error=oauth_failed`

### iPhone/iOS Safari (✅ WORKS on Production with HTTPS)
1. Login with Google → Success
2. Cookies set → Authenticated
3. Refresh token works

## Debug trên iPhone

### Check Cookies in Safari
1. Open Safari Developer Tools (Settings → Advanced → Web Inspector)
2. Connect iPhone to Mac
3. Safari → Develop → [Your iPhone] → [Your Website]
4. Console → `document.cookie` → Check if cookies exist

### Expected Result
```javascript
// ✅ Production (HTTPS same-domain)
document.cookie
// "access_token=...; refresh_token=..."

// ❌ Localhost (HTTP cross-origin)
document.cookie
// "" (empty - cookies blocked)
```

## TL;DR
- 🖥️ **Desktop/Android**: Works on localhost
- 🍎 **iPhone**: ONLY works on Production với HTTPS same-domain
- 🚀 **Deploy ngay** để test trên iPhone!

## Next Steps
1. Deploy lên Vercel/Render/Railway
2. Update Google OAuth credentials
3. Test on iPhone
4. Profit! 🎉
