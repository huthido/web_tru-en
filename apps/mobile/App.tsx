import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { AuthProvider } from '@/contexts/auth-context';
import { RootNavigator } from '@/navigation';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
        },
    },
});

/**
 * Init Google Mobile Ads SDK ngay khi app mở. Thứ tự bắt buộc cho iOS:
 *   1. ATT permission (yêu cầu user iOS 14.5+ trước khi track)
 *   2. setRequestConfiguration (rating, COPPA, tag for child treatment)
 *   3. initialize() — kết nối với AdMob server, mediation adapters
 *
 * Nếu user từ chối ATT, requestNonPersonalizedAdsOnly = true ở BannerAd
 * (set per-ad ở component AdmobBanner). Tránh init fail làm crash app —
 * mọi error đều catch + log thay vì throw.
 */
async function bootstrapAdMob() {
    try {
        if (Platform.OS === 'ios') {
            await requestTrackingPermissionsAsync();
        }
        await mobileAds().setRequestConfiguration({
            maxAdContentRating: MaxAdContentRating.T,
            tagForChildDirectedTreatment: false,
            tagForUnderAgeOfConsent: false,
        });
        await mobileAds().initialize();
    } catch (err) {
        console.warn('[admob] init failed (sẽ không hiển thị AdMob ads):', err);
    }
}

export default function App() {
    useEffect(() => {
        bootstrapAdMob();
    }, []);

    return (
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <RootNavigator />
                    <StatusBar style="auto" />
                </AuthProvider>
            </QueryClientProvider>
        </SafeAreaProvider>
    );
}
