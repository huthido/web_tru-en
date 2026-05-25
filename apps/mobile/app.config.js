// @ts-check
/**
 * Expo config (replaces the old static app.json).
 *
 * `extra.apiUrl` is sourced from the EXPO_PUBLIC_API_URL env var so that
 * dev / staging / production builds can point at different backends without
 * editing source. See `.env.example` for the per-platform host cheatsheet.
 *
 * Fallback host targets the Android emulator (10.0.2.2 = host loopback) on
 * the backend's local port (apps/backend/.env → PORT=3009).
 *
 * Native (Android / iOS) only — there is no `web` target: token storage uses
 * expo-secure-store, which has no web implementation.
 *
 * NOTE: kept as plain `.js` (not `.ts`) — EAS Build cloud worker loads this
 * file via Node ESM without a TypeScript transformer, so `import type` /
 * type annotations break the "Read app config" phase.
 */

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'Yêu',
  slug: 'web-truyen-hungyeu',
  owner: 'huthido.dev',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'webtruyen',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  // Native only — no web target (expo-secure-store has no web support).
  platforms: ['ios', 'android'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.hungyeu.webtruyen',
    usesAppleSignIn: true,
    icon: './assets/icon.png',
  },
  android: {
    package: 'com.hungyeu.webtruyen',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3009/api',
    eas: {
      projectId: '582547a6-04e0-49ca-91b9-b58dd2ce428f',
    },
  },
  plugins: [
    'expo-secure-store',
    // Sign in with Apple (only iOS uses it; the plugin is a no-op on Android).
    'expo-apple-authentication',
    // react-native-iap needs both store frameworks linked. Plugin adds the
    // billing client + StoreKit entitlement in the dev build manifest.
    [
      'react-native-iap',
      {
        paymentProvider: 'Play Store',
      },
    ],
    // Image picker — tác giả chọn ảnh bìa truyện từ thư viện.
    [
      'expo-image-picker',
      {
        photosPermission:
          'App YÊU cần truy cập thư viện ảnh để bạn chọn ảnh bìa cho truyện của mình.',
      },
    ],
    // App Tracking Transparency — bắt buộc ở iOS 14.5+ khi app có quảng cáo
    // third-party (AdMob/FAN/...). Chuẩn bị scaffold sẵn để khi tích hợp SDK
    // quảng cáo bên ngoài v2 không cần đổi config nữa.
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'App YÊU dùng dữ liệu này để hiển thị quảng cáo phù hợp hơn với sở thích của bạn.',
      },
    ],
    // Google AdMob — banner / interstitial. App ID lấy từ AdMob console
    // (ca-app-pub-XXXX~YYYY). Trên dev/local có thể tạm dùng Google test IDs
    // để build chạy được khi user chưa setup AdMob account.
    // Push notification — Expo proxy về FCM (Android) / APNs (iOS).
    // EAS credentials cần: APNs .p8 (iOS) + Firebase Service Account JSON
    // (Android). Setup riêng ở `eas credentials`.
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#635D60',
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
          // Google's official "sample" Android app ID for testing — KHÔNG kiếm
          // được tiền nhưng cho build chạy. Thay bằng app ID thật trước khi ship.
          'ca-app-pub-3940256099942544~3347511713',
        iosAppId:
          process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
          'ca-app-pub-3940256099942544~1458002511',
        // App Tracking Transparency dialog message — show trước khi init SDK iOS 14.5+.
        userTrackingUsageDescription:
          'App YÊU dùng dữ liệu này để hiển thị quảng cáo phù hợp hơn với sở thích của bạn.',
        skAdNetworkItems: [],
      },
    ],
  ],
};

module.exports = config;
