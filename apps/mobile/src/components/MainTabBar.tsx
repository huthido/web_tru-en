import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { radius, spacing, typography } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ACTIVE_PINK = '#C0788A';       // muted dusty rose — nhạt, khớp Luminous Petal
const ACTIVE_PILL_LIGHT = '#fbe8ee'; // blush nhạt
const ACTIVE_PILL_DARK  = '#3d1e28'; // blush tối cho dark mode

// Thứ tự theo docs/Fix vài điểm trên app web.pdf: Trang chủ · Khám phá ·
// [FAB Đăng truyện] · Kiếm tiền · Cửa hàng · Tài khoản. Thư viện chuyển vào
// Tài khoản (ProfileScreen).
const TAB_META: Record<
    string,
    { label: string; icon: IoniconName; iconActive: IoniconName }
> = {
    Home: { label: 'Trang chủ', icon: 'home-outline', iconActive: 'home' },
    Search: { label: 'Khám phá', icon: 'compass-outline', iconActive: 'compass' },
    Upload: { label: 'Đăng', icon: 'add-outline', iconActive: 'add' },
    Earn: { label: 'Kiếm tiền', icon: 'cash-outline', iconActive: 'cash' },
    Shop: { label: 'Cửa hàng', icon: 'storefront-outline', iconActive: 'storefront' },
    Profile: { label: 'Tài khoản', icon: 'person-outline', iconActive: 'person' },
};

export function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { isDark, colors } = useAppTheme();

    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <BlurView
                intensity={isDark ? 90 : 70}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.barInner}>
                {state.routes.map((route, index) => {
                    const meta = TAB_META[route.name];
                    if (!meta) return null;
                    const isFocused = state.index === index;
                    const isFab = route.name === 'Upload';

                    const onPress = () => {
                        if (isFab) {
                            navigation.getParent()?.navigate('CreateStory' as never);
                            return;
                        }
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name as never);
                        }
                    };

                    if (isFab) {
                        return (
                            <Pressable
                                key={route.key}
                                onPress={onPress}
                                style={styles.fabSlot}
                                hitSlop={8}
                            >
                                <View style={styles.fab}>
                                    <Ionicons name="add" size={28} color={isDark ? '#e8c0cc' : '#8a4060'} />
                                </View>
                            </Pressable>
                        );
                    }

                    const pillBg = isDark ? ACTIVE_PILL_DARK : ACTIVE_PILL_LIGHT;

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabSlot}
                            hitSlop={8}
                        >
                            <View style={[styles.iconPill, isFocused && { backgroundColor: pillBg }]}>
                                <Ionicons
                                    name={isFocused ? meta.iconActive : meta.icon}
                                    size={22}
                                    color={isFocused ? ACTIVE_PINK : colors.onSurfaceVariant}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.tabLabel,
                                    { color: isFocused ? ACTIVE_PINK : colors.onSurfaceVariant },
                                    isFocused && styles.tabLabelActive,
                                ]}
                                numberOfLines={1}
                            >
                                {meta.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function makeStyles(colors: ReturnType<typeof import('@/contexts/theme-context').useAppTheme>['colors'], isDark: boolean) {
    return StyleSheet.create({
        wrapper: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? 'rgba(20,18,24,0.85)' : 'rgba(249,249,249,0.75)',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.outlineVariant,
        },
        barInner: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.sm,
            paddingTop: spacing.xs,
            height: 60,
        },
        tabSlot: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            paddingVertical: spacing.xs,
        },
        iconPill: {
            width: 48,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        tabLabel: {
            ...typography.labelSm,
            fontSize: 10,
            letterSpacing: 0.3,
            textTransform: 'none',
        },
        tabLabelActive: {
            fontFamily: 'DMSans_700Bold',
        },
        fabSlot: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        fab: {
            width: 52,
            height: 52,
            borderRadius: radius.pill,
            backgroundColor: isDark ? '#4a2535' : '#f0c8d4',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -20,
            borderWidth: 1.5,
            borderColor: isDark ? '#7a4560' : '#d4a0b4',
            shadowColor: '#c07090',
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
        },
    });
}
