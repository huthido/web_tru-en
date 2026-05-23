import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/auth-context';
import type { TabNavigation } from '@/navigation/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
    USER: 'Độc giả',
    AUTHOR: 'Tác giả',
    ADMIN: 'Quản trị viên',
};

export const ProfileScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const tabNav = useNavigation<TabNavigation>();
    const name = user?.displayName || user?.username || 'bạn';
    const initial = name.trim().charAt(0).toUpperCase() || '?';

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <Text style={styles.name}>{name}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>
                        {ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? ''}
                    </Text>
                </View>
                {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
            </View>

            <Pressable style={styles.card} onPress={() => tabNav.navigate('Wallet')}>
                <View style={styles.cardHeader}>
                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                    <Text style={styles.cardTitle}>Ví xu</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                    />
                </View>
                <Text style={styles.placeholder}>
                    Xem số dư, lịch sử giao dịch và các gói nạp xu.
                </Text>
            </Pressable>

            <Pressable style={styles.logout} onPress={logout}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md },
    profileCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.sm,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: colors.white, fontSize: 34, fontWeight: '700' },
    name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
    roleBadge: {
        backgroundColor: colors.primarySoft,
        paddingHorizontal: spacing.md,
        paddingVertical: 3,
        borderRadius: radius.pill,
    },
    roleText: { color: colors.primaryDark, fontSize: fontSize.xs, fontWeight: '600' },
    email: { color: colors.textMuted, fontSize: fontSize.sm },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    placeholder: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
    logout: {
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    logoutText: { color: colors.danger, fontWeight: '600', fontSize: fontSize.md },
});
