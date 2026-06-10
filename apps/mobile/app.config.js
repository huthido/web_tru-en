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
  // Tên 3 chữ cái — in hoa bắt buộc để không bị lu mờ cạnh các app khác.
  name: 'YÊU',
  slug: 'web-truyen-hungyeu',
  owner: 'huthido.dev',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'webtruyen',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/582547a6-04e0-49ca-91b9-b58dd2ce428f',
  },
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    // Brand đen trắng: splash nền đen + tim trắng.
    backgroundColor: '#000000',
  },
  // Native only — no web target (expo-secure-store has no web support).
  platforms: ['ios', 'android'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.yeuyeu.webtruyen',
    usesAppleSignIn: true,
    icon: './assets/icon.png',
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
  android: {
    package: 'com.yeuyeu.webtruyen',
    runtimeVersion: '1.0.0',
    adaptiveIcon: {
      // Foreground = tim trắng trên nền trong suốt; nền đen ở đây.
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000',
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
    'expo-apple-authentication',
    [
      'react-native-iap',
      {
        paymentProvider: 'Play Store',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'App YÊU cần truy cập thư viện ảnh để bạn chọn ảnh bìa cho truyện của mình.',
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'App YÊU dùng dữ liệu này để hiển thị quảng cáo phù hợp hơn với sở thích của bạn.',
      },
    ],
    [
      'expo-notifications',
      {
        // Android status-bar icon phải là trắng-trên-trong-suốt.
        icon: './assets/notification-icon.png',
        color: '#000000',
      },
    ],
    // AdMob chỉ enable khi có App ID thật — SDK 25+ không chấp nhận test ID.
    ...(process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
      ? [
          [
            'react-native-google-mobile-ads',
            {
              androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
              iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || '',
              userTrackingUsageDescription:
                'App YÊU dùng dữ liệu này để hiển thị quảng cáo phù hợp hơn với sở thích của bạn.',
              skAdNetworkItems: [],
            },
          ],
        ]
      : []),
  ],
};

module.exports = config;
