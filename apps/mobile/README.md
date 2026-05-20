# `apps/mobile` — Web Truyện HungYeu (Expo + React Native)

**Status: Phase 1 skeleton** (lập 2026-05-20). Khung tối thiểu để chạy app
trên iOS Simulator / Android Emulator / Expo Go. CHƯA bao gồm: danh sách
truyện, đọc chương, IAP/Play Billing UI, push notification.

Roadmap đầy đủ ở `docs/LO_TRINH_MOBILE_VA_THANH_TOAN.html` §5 (5 phase, ~14–18
tuần). Hiện tại đã xong Phase 0 (quyết định chiến lược) + Phase 1 (khung).

## Cấu trúc

```
apps/mobile/
├── App.tsx                          # Entry — Providers + RootNavigator
├── app.json                         # Expo config (bundle id, plugins)
├── babel.config.js
├── package.json                     # Expo SDK 51, RN 0.74, React Nav 6
├── tsconfig.json
├── src/
│   ├── lib/api/
│   │   ├── client.ts                # Axios + SecureStore Bearer token + single-flight refresh
│   │   ├── auth.service.ts          # login / me / logout
│   │   └── payments.service.ts      # Apple IAP / Google Play redeem clients
│   ├── contexts/
│   │   └── auth-context.tsx         # Boot from SecureStore; reacts to forced logout
│   ├── navigation/index.tsx         # Conditional Stack: Login | Home
│   └── screens/
│       ├── LoginScreen.tsx
│       └── HomeScreen.tsx
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

Repo hiện chỉ có code source — chưa cài Expo deps để tránh bloat ~500MB
node_modules. Khi sẵn sàng dev:

```bash
# Từ root project
pnpm install                          # cài Expo + RN + React Navigation cho apps/mobile

# Chạy Metro bundler
pnpm --filter @web-truyen/mobile start

# Hoặc trực tiếp
cd apps/mobile
pnpm exec expo start
```

Quét QR bằng Expo Go (iOS / Android), hoặc nhấn `i` (iOS Sim) / `a` (Android
Emulator). Android Emulator gọi backend qua `10.0.2.2:3001` (đã set trong
`app.json` → `extra.apiUrl`); iOS Sim dùng `localhost:3001` — sửa
`apiUrl` trong `app.json` nếu cần.

## Backend yêu cầu

Mobile gọi REST giống web. Endpoint hiện đã có:

- `POST /auth/login` — trả `{ accessToken, refreshToken, user }`.
- `POST /auth/refresh` — body `{ refreshToken }`.
- `GET /auth/me` — Bearer required.
- `POST /payments/apple/redeem` — `{ productId, transactionId, receipt }`.
- `POST /payments/google/redeem` — `{ productId, purchaseToken }`.

> ⚠️ Cần kiểm tra `/auth/login` có trả `refreshToken` trong body không —
> web hiện đang đặt vào HttpOnly cookie. Nếu chưa, thêm field này khi
> client gọi từ user-agent mobile (phát hiện qua header / query).

## Còn lại để hoàn thành mobile app (Phase 2 → 5)

- [ ] Phase 2 — danh sách truyện, chi tiết truyện, đọc chương, tìm kiếm,
      lịch sử đọc, follow/favorite. Tái dùng React Query patterns từ web.
- [ ] Phase 3 — IAP UI: pick coin package → mở Apple/Google native sheet
      qua `expo-in-app-purchases` (cần eject hoặc dev build) →
      `PaymentsApi.redeemAppleIap` / `redeemGooglePlay`. Compliance: thêm
      luồng "xóa tài khoản trong app" (Apple §5.1.1(v)), report/block UGC.
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
