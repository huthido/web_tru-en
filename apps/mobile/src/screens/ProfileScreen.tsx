import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import type { RootNavigation, TabNavigation } from '@/navigation/types';
import { colors, fontSize, radius, spacing } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
    USER: 'Độc giả',
    AUTHOR: 'Tác giả',
    ADMIN: 'Quản trị viên',
};

export const ProfileScreen: React.FC = () => {
    const { user, logout, deleteAccount } = useAuth();
    const tabNav = useNavigation<TabNavigation>();
    const rootNav = useNavigation<RootNavigation>();
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
    sectionLabel: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
    sectionLabelText: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
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
    deleteAccountBtn: {
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    deleteAccountText: {
        color: colors.textMuted,
        fontSize: fontSize.xs,
        textDecorationLine: 'underline',
    },
    /* delete modal */
    modalBackdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    modalCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
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
