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
  ],
};

module.exports = config;
