import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius, spacing, typography } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<
    string,
    { label: string; icon: IoniconName; iconActive: IoniconName }
> = {
    Home: { label: 'Trang chủ', icon: 'home-outline', iconActive: 'home' },
    Search: { label: 'Khám phá', icon: 'compass-outline', iconActive: 'compass' },
    Upload: { label: 'Đăng', icon: 'add-outline', iconActive: 'add' },
    Library: { label: 'Thư viện', icon: 'library-outline', iconActive: 'library' },
    Wallet: { label: 'Ví xu', icon: 'wallet-outline', iconActive: 'wallet' },
    Profile: { label: 'Cá nhân', icon: 'person-outline', iconActive: 'person' },
};

/**
 * Tab bar tuỳ chỉnh theo Stitch Luminous Petal: glassmorphism (BlurView),
 * 6 items với Upload là FAB tròn nổi ở giữa. Bấm Upload navigate trực tiếp
 * sang CreateStoryScreen stack thay vì hiện UploadStub screen.
 */
export function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.barInner}>
                {state.routes.map((route, index) => {
                    const meta = TAB_META[route.name];
                    if (!meta) return null;
                    const isFocused = state.index === index;
                    const isFab = route.name === 'Upload';

                    const onPress = () => {
                        if (isFab) {
                            // Skip Upload tab — push CreateStoryScreen stack trên RootStack.
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
                                    <Ionicons name="add" size={28} color={colors.onPrimary} />
                                </View>
                            </Pressable>
                        );
                    }

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabSlot}
                            hitSlop={8}
                        >
                            <Ionicons
                                name={isFocused ? meta.iconActive : meta.icon}
                                size={22}
                                color={isFocused ? colors.primary : colors.onSurfaceVariant}
                            />
                            <Text
                                style={[
                                    styles.tabLabel,
                                    { color: isFocused ? colors.primary : colors.onSurfaceVariant },
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

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(249,249,249,0.7)',
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
    tabLabel: {
        ...typography.labelSm,
        fontSize: 10,
        letterSpacing: 0.3,
        textTransform: 'none',
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
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
});
