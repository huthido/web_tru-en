import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import {
    useFonts as usePlusJakartaSans,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider, useAppTheme } from '@/contexts/theme-context';
import { RootNavigator } from '@/navigation';
import { PushBootstrap } from '@/lib/push/PushBootstrap';

// Giữ splash screen tới khi font load xong — tránh FOUC khi text render system
// font rồi flick sang Plus Jakarta sau ~200ms.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Foreground notification: vẫn hiển thị alert + sound + badge (mặc định Expo
// im lặng khi app foreground để tránh phá UX). User muốn biết ngay khi có
// donation/comment mới dù đang xem app.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
        },
    },
});

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

function ThemedStatusBar() {
    const { isDark } = useAppTheme();
    return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
    const [fontsLoaded] = usePlusJakartaSans({
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_700Bold,
    });

    useEffect(() => {
        bootstrapAdMob();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            await SplashScreen.hideAsync().catch(() => undefined);
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        // Trả về null — splash screen vẫn hiển thị (preventAutoHideAsync).
        return null;
    }

    return (
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <ThemeProvider>
                        <AuthProvider>
                            <PushBootstrap />
                            <RootNavigator />
                            <ThemedStatusBar />
                        </AuthProvider>
                    </ThemeProvider>
                </QueryClientProvider>
            </SafeAreaProvider>
        </View>
    );
}
