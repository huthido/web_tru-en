# `apps/mobile` — Web Truyện HungYeu (Expo + React Native)

**Status: Phase 2 — trải nghiệm đọc** (Phase 1 khung + audit: 2026-05-22;
Phase 2: 2026-05-22). Đã có: duyệt truyện, chi tiết truyện, trình đọc chương
(có lưu tiến độ + tuỳ chỉnh cỡ chữ/nền), tìm kiếm, theo dõi, lịch sử đọc.
CHƯA bao gồm: IAP/Play Billing UI, push notification.

> **Expo SDK 54** — chốt ở 54 (không phải bản mới nhất) để khớp với app
> Expo Go ngoài store. Nếu nâng SDK cao hơn Expo Go hỗ trợ thì phải dùng
> dev build (`npx expo run:android`) thay cho Expo Go.

Roadmap đầy đủ ở `docs/LO_TRINH_MOBILE_VA_THANH_TOAN.html` §5 (5 phase, ~14–18
tuần). Đã xong Phase 0 (chiến lược) + Phase 1 (khung) + Phase 2 (đọc truyện).

## Cấu trúc

```
apps/mobile/
├── index.js                         # Entry point (registerRootComponent)
├── App.tsx                          # Root component — Providers + RootNavigator
├── app.config.ts                    # Expo config — apiUrl từ EXPO_PUBLIC_API_URL
├── metro.config.js                  # Metro config (mặc định Expo)
├── babel.config.js
├── .env.example                     # Mẫu biến môi trường (copy sang .env)
├── package.json                     # Expo SDK 54, RN 0.81, React Nav 7
├── tsconfig.json
├── src/
│   ├── theme/                       # Token màu / spacing / theme cho trình đọc
│   ├── lib/
│   │   ├── api/                     # client.ts + types.ts + *.service.ts (stories, chapters,
│   │   │                            #   search, categories, reading-history, follows, auth, payments)
│   │   ├── hooks/                   # React Query hooks (stories, chapters, search, library...)
│   │   ├── html.ts                  # HTML → block parser cho trình đọc
│   │   ├── format.ts, url.ts        # Format số/ngày, resolve URL ảnh
│   ├── contexts/auth-context.tsx    # Boot từ SecureStore; xử lý forced logout
│   ├── components/                  # StoryCard, StoryRow, StoryCover, StoryListItem, ui
│   ├── navigation/                  # Root Stack (Login | Tabs | StoryDetail | Reader) + types
│   └── screens/                     # Home, Search, Library, Profile, StoryDetail, Reader, Login
└── README.md (this file)
```

## Khác biệt so với web frontend

| Topic | Web | Mobile |
|---|---|---|
| Auth | Cookie HttpOnly (`withCredentials: true`) | Bearer JWT trong `expo-secure-store` |
| Refresh | Server-side cookie rotate | Explicit `POST /auth/refresh { refreshToken }` |
| Nạp xu | VNPay redirect | Apple IAP / Google Play Billing (Phase 3) |
| Withdrawal | UI có sẵn | KHÔNG có UI rút trên mobile — chỉ qua web (theo Apple §3.1.1) |

## Setup lần đầu (chưa chạy)

`apps/mobile` là project pnpm **độc lập** (cố ý loại khỏi `pnpm-workspace.yaml`
để Expo ~500MB không bị hoist vào Docker build của backend/frontend). Vì vậy
phải cài riêng — không dùng `pnpm install` ở root:

```bash
cd apps/mobile
pnpm install --ignore-workspace   # cài độc lập, bỏ qua workspace ở root
cp .env.example .env              # rồi chỉnh EXPO_PUBLIC_API_URL theo máy

pnpm start                        # chạy Metro bundler (= expo start)
```

`--ignore-workspace` là bắt buộc: nếu thiếu, pnpm sẽ leo lên `pnpm-workspace.yaml`
ở root và cài nhầm chỗ.

Quét QR bằng Expo Go (iOS / Android), hoặc nhấn `i` (iOS Sim) / `a` (Android
Emulator).

### Cấu hình API URL

App đọc `EXPO_PUBLIC_API_URL` từ `.env`. Copy mẫu rồi chỉnh theo máy:

```bash
cp .env.example .env
```

Port phải khớp backend (`apps/backend/.env` → `PORT`, hiện là `3009`). Host
tuỳ nơi chạy app:

| Chạy ở đâu | EXPO_PUBLIC_API_URL |
|---|---|
| Android emulator | `http://10.0.2.2:3009/api` |
| iOS simulator | `http://localhost:3009/api` |
| Máy thật (Expo Go) | `http://<IP-LAN-máy-bạn>:3009/api` |

## Backend yêu cầu

Mobile gọi REST giống web. Endpoint hiện đã có:

- `POST /auth/login` — trả `{ accessToken, refreshToken, user }`.
- `POST /auth/refresh` — body `{ refreshToken }`, trả `{ accessToken }`.
- `GET /auth/me` — Bearer required, trả `{ user }`.
- `POST /payments/apple/redeem` — `{ productId, transactionId, receipt }`.
- `POST /payments/google/redeem` — `{ productId, purchaseToken }`.

### Token trả về body (X-Client-Type)

Backend mặc định bóc `accessToken`/`refreshToken` khỏi body và đặt vào cookie
HttpOnly (phục vụ web). Mobile không có cookie jar nên client gửi header
`X-Client-Type: mobile` trên mọi request — `CookieInterceptor` thấy header này
sẽ **giữ token trong body** và không set cookie. Web không gửi header → hành vi
cũ giữ nguyên.

## Còn lại để hoàn thành mobile app (Phase 3 → 5)

- [x] Phase 2 — duyệt truyện (5 list trang chủ), chi tiết truyện, trình đọc
      chương (HTML→block, lưu tiến độ, cỡ chữ + nền sáng/sepia/tối), tìm kiếm
      + lọc thể loại, theo dõi, lịch sử đọc. Mở khoá chương/truyện bằng xu có
      sẵn ngay trong trình đọc (spend-side — hợp lệ).
- [ ] Phase 3 — IAP UI: pick coin package → mở Apple/Google native sheet →
      `PaymentsApi.redeemAppleIap` / `redeemGooglePlay`. LƯU Ý:
      `expo-in-app-purchases` đã ngừng phát triển — dùng `react-native-iap`,
      `expo-iap` hoặc RevenueCat (cần dev build). Compliance: thêm luồng
      "xóa tài khoản trong app" (Apple §5.1.1(v)), report/block UGC.
- [ ] Phase 4 — push (APNs/FCM) qua `expo-notifications`, dark mode,
      offline cache truyện đã mua.
- [ ] Phase 5 — store listing (App Store Connect + Google Play Console),
      EAS Build, TestFlight / Internal Testing, nộp duyệt.

## Compliance reminder (Apple §3.1.1 / Google Play §4.3)

- Backend đã tách `purchasedBalance` / `earnedBalance` (commit `e9d8ba1`).
  Mobile UI **chỉ** hiển thị nạp xu qua Apple IAP / Google Play. KHÔNG
  được link sang web để nạp (Apple sẽ reject).
- Withdrawal UI chỉ có trên web. Mobile tuyệt đối không có nút rút.
- Donate vẫn được phép trên mobile vì là spend-side (đốt coin).

Xem `docs/LO_TRINH_MOBILE_VA_THANH_TOAN.html` §6.3 trước khi đụng vào
luồng tiền trên mobile — sai Apple guideline = từ chối thẳng.
