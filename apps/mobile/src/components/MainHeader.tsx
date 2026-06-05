import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { fontSize, radius, spacing, typography } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useWalletBalance } from '@/lib/hooks/wallet';
import { useUnreadCount } from '@/lib/hooks/notifications';
import type { MainTabsParamList } from '@/navigation/types';

type TabNav = BottomTabNavigationProp<MainTabsParamList>;

const ACTIVE_PINK = '#D81B60';

export function MainHeader() {
    const insets = useSafeAreaInsets();
    const nav = useNavigation<TabNav>();
    const { isDark, scheme, preference, toggle, colors } = useAppTheme();
    const { data: wallet } = useWalletBalance();
    const { data: unread } = useUnreadCount();

    const balance = (wallet?.balance ?? 0).toLocaleString('vi-VN');
    const unreadCount = unread?.count ?? 0;
    const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

    const themeIcon: 'sunny' | 'moon' | 'phone-portrait-outline' =
        preference === 'light' ? 'sunny' :
        preference === 'dark' ? 'moon' :
        'phone-portrait-outline';

    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={[styles.wrap, { paddingTop: insets.top }]}>
            <BlurView
                intensity={isDark ? 80 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.inner}>
                {/* Logo + wordmark */}
                <View style={styles.brand}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandText}>Yêu</Text>
                </View>

                {/* Search bar — tap to switch to Search tab */}
                <Pressable
                    style={styles.searchBar}
                    onPress={() => nav.navigate('Search')}
                >
                    <Ionicons name="search-outline" size={15} color={colors.onSurfaceVariant} />
                    <Text style={styles.searchPlaceholder} numberOfLines={1}>
                        Tìm kiếm truyện...
                    </Text>
                </Pressable>

                {/* Right actions */}
                <View style={styles.actions}>
                    {/* Coin balance */}
                    <Pressable
                        style={styles.coinPill}
                        onPress={() => (nav as any).getParent()?.navigate('Wallet')}
                        hitSlop={6}
                    >
                        <Ionicons name="logo-bitcoin" size={13} color={colors.coin} />
                        <Text style={styles.coinText} numberOfLines={1}>
                            {balance}
                        </Text>
                    </Pressable>

                    {/* Theme toggle */}
                    <Pressable style={styles.iconBtn} onPress={toggle} hitSlop={8}>
                        <Ionicons name={themeIcon} size={20} color={colors.onSurface} />
                    </Pressable>

                    {/* Notification bell */}
                    <Pressable
                        style={styles.iconBtn}
                        onPress={() => (nav as any).getParent()?.navigate('Notifications')}
                        hitSlop={8}
                    >
                        <Ionicons
                            name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                            size={22}
                            color={colors.onSurface}
                        />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{badgeLabel}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const INNER_H = 52;

function makeStyles(colors: ReturnType<typeof import('@/contexts/theme-context').useAppTheme>['colors'], isDark: boolean) {
    return StyleSheet.create({
        wrap: {
            backgroundColor: isDark
                ? 'rgba(20,18,24,0.92)'
                : 'rgba(252,242,246,0.88)',
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outlineVariant + '99',
        },
        inner: {
            height: INNER_H,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
        },
        brand: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
        },
        logo: {
            width: 30,
            height: 30,
            borderRadius: 8,
        },
        brandText: {
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 20,
            color: colors.onSurface,
            letterSpacing: -0.3,
        },
        searchBar: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            height: 36,
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
        },
        searchPlaceholder: {
            ...typography.bodySm,
            color: colors.onSurfaceVariant,
            fontSize: fontSize.xs,
            flex: 1,
        },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
        },
        coinPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            maxWidth: 72,
        },
        coinText: {
            fontFamily: 'DMSans_700Bold',
            fontSize: fontSize.xs,
            color: colors.onSurface,
        },
        iconBtn: {
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
        },
        badge: {
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
        },
        badgeText: {
            color: '#fff',
            fontSize: 9,
            fontFamily: 'DMSans_700Bold',
            lineHeight: 11,
        },
    });
}
