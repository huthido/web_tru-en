# Hướng dẫn phát triển Mobile App

## ✅ Khả năng phát triển Mobile App

Dự án hiện tại **HOÀN TOÀN SẴN SÀNG** để phát triển mobile app vì:

### 1. Backend đã hỗ trợ Mobile Authentication
- ✅ JWT Strategy đã có `ExtractJwt.fromAuthHeaderAsBearerToken()` - hỗ trợ Bearer token
- ✅ API RESTful hoàn chỉnh
- ✅ CORS đã được cấu hình
- ✅ Rate limiting sẵn sàng

### 2. Kiến trúc Monorepo
- ✅ Cấu trúc workspace cho phép thêm app mới
- ✅ Shared types package có thể dùng chung
- ✅ Backend API độc lập, không phụ thuộc frontend

## 📱 Công nghệ đề xuất

### Option 1: React Native (Khuyến nghị)
**Ưu điểm:**
- ✅ Code sharing với frontend (TypeScript, React patterns)
- ✅ Cross-platform (iOS + Android)
- ✅ Ecosystem lớn
- ✅ Dễ maintain với team hiện tại

**Tech Stack:**
- React Native (Expo hoặc bare)
- React Query (giống frontend)
- Axios (API client)
- React Navigation
- AsyncStorage (token storage)

### Option 2: Flutter
**Ưu điểm:**
- ✅ Performance tốt
- ✅ UI đẹp, smooth
- ✅ Single codebase cho iOS + Android

**Tech Stack:**
- Flutter + Dart
- Dio (HTTP client)
- Provider/Riverpod (state management)
- SharedPreferences (token storage)

### Option 3: Native (Swift + Kotlin)
**Ưu điểm:**
- ✅ Performance tối đa
- ✅ Native features đầy đủ

**Nhược điểm:**
- ❌ Cần 2 codebase riêng
- ❌ Development time lâu hơn

## 🏗️ Cấu trúc Monorepo mới

```
web-truyen-tien-hung/
├── apps/
│   ├── backend/          # ✅ Đã có
│   ├── frontend/         # ✅ Đã có
│   └── mobile/           # 🆕 Mobile app (React Native)
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── services/
│       │   ├── hooks/
│       │   └── navigation/
│       ├── package.json
│       └── app.json
├── packages/
│   └── shared/           # ✅ Đã có - dùng chung types
└── package.json
```

## 🔐 Authentication cho Mobile

### Backend đã sẵn sàng:
```typescript
// apps/backend/src/auth/strategies/jwt.strategy.ts
ExtractJwt.fromExtractors([
  request?.cookies?.['access_token'],  // Web
  ExtractJwt.fromAuthHeaderAsBearerToken(), // Mobile ✅
])
```

### Mobile App Flow:

1. **Login/Register:**
   ```typescript
   POST /api/auth/login
   Body: { emailOrUsername, password }
   Response: { accessToken, refreshToken, user }
   ```

2. **Store Tokens:**
   ```typescript
   // React Native - AsyncStorage
   await AsyncStorage.setItem('accessToken', accessToken);
   await AsyncStorage.setItem('refreshToken', refreshToken);
   ```

3. **API Requests:**
   ```typescript
   // Add Bearer token to headers
   headers: {
     'Authorization': `Bearer ${accessToken}`,
     'Content-Type': 'application/json'
   }
   ```

4. **Token Refresh:**
   ```typescript
   POST /api/auth/refresh
   Body: { refreshToken }
   Response: { accessToken }
   ```

## 📋 API Endpoints sẵn sàng cho Mobile

Tất cả endpoints hiện tại đều có thể dùng cho mobile:

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Lấy thông tin user
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/google` - OAuth Google
- `GET /api/auth/facebook` - OAuth Facebook

### Stories
- `GET /api/stories` - Danh sách truyện
- `GET /api/stories/:slug` - Chi tiết truyện
- `GET /api/stories/homepage/newest` - Truyện mới
- `GET /api/stories/homepage/recommended` - Đề xuất
- `GET /api/stories/:storyId/similar` - Truyện tương tự

### Chapters
- `GET /api/chapters/:chapterId` - Đọc chương
- `GET /api/stories/:storyId/chapters` - Danh sách chương

### Reading History
- `GET /api/reading-history` - Lịch sử đọc
- `POST /api/reading-history` - Lưu tiến độ
- `PATCH /api/reading-history/:id` - Cập nhật tiến độ

### User Actions
- `POST /api/stories/:storyId/like` - Like truyện
- `POST /api/follows/:storyId` - Follow truyện
- `POST /api/ratings` - Đánh giá truyện
- `GET /api/favorites` - Truyện yêu thích

### Search
- `GET /api/search?q=keyword` - Tìm kiếm
- `GET /api/search/suggestions?q=keyword` - Gợi ý

## 🚀 Bước triển khai

### Phase 1: Setup (1-2 tuần)
1. ✅ Tạo React Native project trong monorepo
2. ✅ Setup API client với Bearer token
3. ✅ Implement authentication flow
4. ✅ Setup navigation

### Phase 2: Core Features (3-4 tuần)
1. ✅ Homepage với các sections
2. ✅ Story detail page
3. ✅ Chapter reading page
4. ✅ Search functionality
5. ✅ User profile

### Phase 3: Advanced Features (2-3 tuần)
1. ✅ Reading history
2. ✅ Favorites/Follows
3. ✅ Comments
4. ✅ Ratings
5. ✅ Offline reading (cache chapters)

### Phase 4: Polish (1-2 tuần)
1. ✅ Push notifications
2. ✅ Dark mode
3. ✅ Performance optimization
4. ✅ Testing

## 📝 Cần điều chỉnh Backend

### 1. Thêm endpoint trả token trong body (nếu cần)
Hiện tại login/register trả token trong cookies. Có thể thêm option trả trong body:

```typescript
// apps/backend/src/auth/auth.controller.ts
@Post('login')
async login(@Body() loginDto: LoginDto, @Res() res: Response) {
  const result = await this.authService.login(loginDto);
  
  // Set cookies (cho web)
  res.cookie('access_token', result.accessToken, {...});
  
  // Return tokens in body (cho mobile)
  return {
    ...result,
    accessToken: result.accessToken, // ✅ Đã có
    refreshToken: result.refreshToken, // ✅ Đã có
  };
}
```

### 2. CORS cho Mobile
CORS đã được cấu hình, nhưng cần đảm bảo:
- ✅ Allow all origins cho mobile (hoặc whitelist)
- ✅ Allow Authorization header

## 🔧 Ví dụ code Mobile App

### API Client (React Native)
```typescript
// apps/mobile/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: 'https://your-backend-url.com/api',
  timeout: 30000,
});

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        // Try refresh
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          await AsyncStorage.setItem('accessToken', newToken);
          // Retry original request
          return apiClient.request(error.config);
        }
      }
      // Redirect to login
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    }
    return Promise.reject(error);
  }
);
```

### Auth Hook
```typescript
// apps/mobile/src/hooks/useAuth.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '../services/auth.service';

export const useAuth = () => {
  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getMe(),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginDto) => authService.login(data),
    onSuccess: async (data) => {
      await AsyncStorage.setItem('accessToken', data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.refreshToken);
    },
  });

  return { user, login: loginMutation.mutate };
};
```

## 📦 Dependencies cần thiết

### React Native
```json
{
  "dependencies": {
    "react-native": "^0.73.0",
    "@react-navigation/native": "^6.1.0",
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.5",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-safe-area-context": "^4.8.0"
  }
}
```

## 🎯 Kết luận

**✅ Dự án HOÀN TOÀN SẴN SÀNG cho mobile app vì:**

1. ✅ Backend API đã hoàn chỉnh
2. ✅ Authentication đã hỗ trợ Bearer token
3. ✅ Monorepo structure dễ mở rộng
4. ✅ Shared types có thể dùng chung
5. ✅ Không cần thay đổi backend nhiều

**🚀 Bắt đầu ngay:**
1. Tạo React Native project trong `apps/mobile`
2. Setup API client với Bearer token
3. Implement authentication
4. Build các screens chính

**⏱️ Timeline ước tính:**
- MVP: 6-8 tuần
- Full features: 10-12 tuần

