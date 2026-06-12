import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/auth-context';
import { describeError } from '@/lib/error';
import type { RootNavigation } from '@/navigation/types';
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';

const ROLE_LABEL: Record<string, string> = {
    USER: 'Độc giả',
    AUTHOR: 'Tác giả',
    ADMIN: 'Quản trị viên',
};

const LEGAL_LINKS: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; url: string }> = [
    { icon: 'shield-checkmark-outline', label: 'Chính sách bảo mật', url: 'https://yeuyeu.net/privacy' },
    { icon: 'document-text-outline', label: 'Điều khoản sử dụng', url: 'https://yeuyeu.net/terms' },
    { icon: 'mail-outline', label: 'Hỗ trợ & Phản ánh', url: 'https://yeuyeu.net/gop-y-phan-anh' },
];

async function openExternal(url: string) {
    try {
        await Linking.openURL(url);
    } catch {
        Alert.alert('Không mở được', 'Hãy kiểm tra kết nối mạng và thử lại.');
    }
}

export const ProfileScreen: React.FC = () => {
    const { user, logout, deleteAccount } = useAuth();
    const rootNav = useNavigation<RootNavigation>();
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const name = user?.displayName || user?.username || 'bạn';
    const initial = name.trim().charAt(0).toUpperCase() || '?';

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    const onConfirmDelete = async () => {
        setBusy(true);
        try {
            await deleteAccount(password.trim() || undefined);
            // user nay là null → RootNavigator tự đẩy về Login.
        } catch (err) {
            Alert.alert('Không xoá được', describeError(err));
        } finally {
            setBusy(false);
            setDeleteOpen(false);
            setPassword('');
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Pressable
                style={styles.profileCard}
                onPress={() => {
                    if (user?.username) rootNav.navigate('UserProfile', { username: user.username });
                }}
            >
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
                {user?.username ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontFamily: 'DMSans_500Medium' }}>
                            Xem trang cá nhân
                        </Text>
                    </View>
                ) : null}
            </Pressable>

            <Pressable style={styles.card} onPress={() => rootNav.navigate('Wallet')}>
                <View style={styles.cardHeader}>
                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                    <Text style={styles.cardTitle}>Ví xu</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.onSurfaceVariant}
                    />
                </View>
                <Text style={styles.placeholder}>
                    Xem số dư, lịch sử giao dịch và các gói nạp xu.
                </Text>
            </Pressable>

            {/* Tiện ích + cài đặt — Thư viện rời tab bar (PDF fix nav) nên gom
                vào đây cùng Thông báo / Cài đặt. */}
            <View style={styles.legalGroup}>
                <Pressable
                    style={[styles.legalRow, styles.legalRowDivider]}
                    onPress={() => rootNav.navigate('Library')}
                >
                    <Ionicons name="library-outline" size={20} color={colors.onSurfaceVariant} />
                    <Text style={styles.legalText}>Thư viện</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable
                    style={[styles.legalRow, styles.legalRowDivider]}
                    onPress={() => rootNav.navigate('Notifications')}
                >
                    <Ionicons name="notifications-outline" size={20} color={colors.onSurfaceVariant} />
                    <Text style={styles.legalText}>Thông báo</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable
                    style={[styles.legalRow, styles.legalRowDivider]}
                    onPress={() => rootNav.navigate('Settings')}
                >
                    <Ionicons name="settings-outline" size={20} color={colors.onSurfaceVariant} />
                    <Text style={styles.legalText}>Cài đặt</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable
                    style={styles.legalRow}
                    onPress={() => rootNav.navigate('BugReport')}
                >
                    <Ionicons name="bug-outline" size={20} color={colors.onSurfaceVariant} />
                    <Text style={styles.legalText}>Báo lỗi</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
            </View>

            <View style={styles.sectionLabel}>
                <Text style={styles.sectionLabelText}>KHU VỰC TÁC GIẢ</Text>
            </View>

            <Pressable style={styles.card} onPress={() => rootNav.navigate('MyStories')}>
                <View style={styles.cardHeader}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    <Text style={styles.cardTitle}>Truyện của tôi</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <Text style={styles.placeholder}>
                    Quản lý truyện, thêm chương, gửi duyệt xuất bản.
                </Text>
            </Pressable>

            <Pressable style={styles.card} onPress={() => rootNav.navigate('Earnings')}>
                <View style={styles.cardHeader}>
                    <Ionicons name="cash-outline" size={20} color={colors.primary} />
                    <Text style={styles.cardTitle}>Doanh thu</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <Text style={styles.placeholder}>
                    Thu nhập từ donate, bán chương, bán truyện VIP và rút xu.
                </Text>
            </Pressable>

            <View style={styles.sectionLabel}>
                <Text style={styles.sectionLabelText}>THÔNG TIN & HỖ TRỢ</Text>
            </View>

            <View style={styles.legalGroup}>
                {LEGAL_LINKS.map((item, idx) => (
                    <Pressable
                        key={item.url}
                        style={[
                            styles.legalRow,
                            idx < LEGAL_LINKS.length - 1 && styles.legalRowDivider,
                        ]}
                        onPress={() => openExternal(item.url)}
                    >
                        <Ionicons name={item.icon} size={18} color={colors.primary} />
                        <Text style={styles.legalText}>{item.label}</Text>
                        <View style={{ flex: 1 }} />
                        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                    </Pressable>
                ))}
            </View>

            <Pressable style={styles.logout} onPress={logout}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>

            <Pressable
                style={styles.deleteAccountBtn}
                onPress={() => setDeleteOpen(true)}
            >
                <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                <Text style={styles.deleteAccountText}>Xoá tài khoản</Text>
            </Pressable>

            <Modal
                visible={deleteOpen}
                transparent
                animationType="fade"
                onRequestClose={() => !busy && setDeleteOpen(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <Ionicons name="warning" size={36} color={colors.danger} />
                        </View>
                        <Text style={styles.modalTitle}>Xoá tài khoản?</Text>
                        <Text style={styles.modalBody}>
                            Hành động này KHÔNG thể hoàn tác. Email và tên hiển thị
                            sẽ bị xoá, số dư xu chưa rút sẽ bị khoá, và bạn sẽ
                            không đăng nhập lại được. Truyện / bình luận bạn đã
                            đăng vẫn còn nhưng hiển thị "Người dùng đã xoá".
                        </Text>
                        <TextInput
                            placeholder="Mật khẩu (bỏ trống nếu đăng nhập Google/FB)"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            style={styles.modalInput}
                            editable={!busy}
                        />
                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalBtn, styles.modalCancelBtn]}
                                onPress={() => {
                                    setDeleteOpen(false);
                                    setPassword('');
                                }}
                                disabled={busy}
                            >
                                <Text style={styles.modalCancelText}>Huỷ</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.modalBtn,
                                    styles.modalDangerBtn,
                                    busy && { opacity: 0.7 },
                                ]}
                                onPress={onConfirmDelete}
                                disabled={busy}
                            >
                                {busy ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.modalDangerText}>
                                        Xác nhận xoá
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    // PaddingBottom 100 để không bị MainTabBar floating che.
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
    profileCard: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.tertiaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primaryContainer,
    },
    avatarText: { color: colors.tertiary, fontSize: 34, fontFamily: 'PlusJakartaSans_700Bold' },
    name: { ...typography.headlineSm, color: colors.onSurface },
    roleBadge: {
        backgroundColor: colors.primaryContainer,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: radius.pill,
    },
    roleText: { ...typography.labelSm, color: colors.onPrimaryContainer, fontSize: 11, letterSpacing: 0.6 },
    email: { ...typography.bodySm, color: colors.onSurfaceVariant },
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardTitle: { ...typography.headlineSm, fontSize: 18, color: colors.onSurface },
    placeholder: { ...typography.bodySm, color: colors.onSurfaceVariant },
    sectionLabel: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
    sectionLabelText: { ...typography.labelSm, color: colors.onSurfaceVariant },
    legalGroup: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    legalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    legalRowDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant,
    },
    legalText: { ...typography.bodyMd, color: colors.onSurface },
    logout: {
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    logoutText: { ...typography.labelMd, color: colors.error, fontFamily: 'DMSans_700Bold' },
    deleteAccountBtn: {
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    deleteAccountText: {
        color: colors.onSurfaceVariant,
        fontSize: fontSize.xs,
        textDecorationLine: 'underline',
        fontFamily: 'DMSans_400Regular',
    },
    /* delete modal */
    modalBackdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    modalCard: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.sm,
    },
    modalIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFEBEE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    modalBody: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalInput: {
        alignSelf: 'stretch',
        backgroundColor: colors.bg,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.sm,
        color: colors.text,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignSelf: 'stretch',
        marginTop: spacing.md,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    modalCancelBtn: { backgroundColor: colors.bg },
    modalCancelText: { color: colors.text, fontWeight: '600' },
    modalDangerBtn: { backgroundColor: colors.danger },
    modalDangerText: { color: colors.white, fontWeight: '700' },
});
