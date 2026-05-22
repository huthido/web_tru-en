import type { ExpoConfig } from 'expo/config';

/**
 * Expo config (replaces the old static app.json).
 *
 * `extra.apiUrl` is sourced from the EXPO_PUBLIC_API_URL env var so that
 * dev / staging / production builds can point at different backends without
 * editing source. See `.env.example` for the per-platform host cheatsheet.
 *
 * Fallback host targets the Android emulator (10.0.2.2 = host loopback) on
 * the backend's local port (apps/backend/.env → PORT=3009).
 */
const config: ExpoConfig = {
  name: 'Web Truyện HungYeu',
  slug: 'web-truyen-hungyeu',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'webtruyen',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.hungyeu.webtruyen',
  },
  android: {
    package: 'com.hungyeu.webtruyen',
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3009/api',
  },
  plugins: ['expo-secure-store'],
};

export default config;
