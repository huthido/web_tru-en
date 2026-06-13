import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { AuthApi } from '@/lib/api/auth.service';
import { describeError } from '@/lib/error';
import type { RootNavigation } from '@/navigation/types';

/**
 * Tạo / đổi mật khẩu. Hai chế độ theo hasPassword từ /auth/me:
 * - false (tài khoản Google/Apple chưa có mật khẩu) → "Tạo mật khẩu",
 *   không hỏi mật khẩu hiện tại, gọi /auth/set-password.
 * - true → "Đổi mật khẩu" chuẩn, gọi /auth/change-password.
 */
export const ChangePasswordScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    // null = đang tải /auth/me
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Login response không có hasPassword — phải hỏi /auth/me mới nhất.
        AuthApi.me().then((me) => setHasPassword(me?.hasPassword ?? true));
    }, []);

    const isSetMode = hasPassword === false;

    const submit = async () => {
        if (!isSetMode && !currentPassword) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu hiện tại.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Mật khẩu yếu', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            Alert.alert(
                'Mật khẩu yếu',
                'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.',
            );
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Không khớp', 'Mật khẩu xác nhận không khớp.');
            return;
        }
        setSubmitting(true);
        try {
            if (isSetMode) {
                await AuthApi.setPassword({
                    newPassword,
                    confirmNewPassword: confirmPassword,
                });
                Alert.alert(
                    'Đã tạo mật khẩu',
                    'Từ giờ bạn có thể đăng nhập bằng email + mật khẩu.',
                    [{ text: 'OK', onPress: () => nav.goBack() }],
                );
            } else {
                await AuthApi.changePassword({
                    currentPassword,
                    newPassword,
                    confirmNewPassword: confirmPassword,
                });
                Alert.alert('Thành công', 'Đổi mật khẩu thành công.', [
                    { text: 'OK', onPress: () => nav.goBack() },
                ]);
            }
        } catch (err) {
            Alert.alert('Lỗi', describeError(err));
        } finally {
            setSubmitting(false);
        }
    };

    if (hasPassword === null) {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {isSetMode && (
                    <View style={styles.noticeBox}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                        <Text style={styles.noticeText}>
                            Tài khoản đăng nhập bằng Google/Apple chưa có mật khẩu. Tạo mật
                            khẩu để có thể đăng nhập trực tiếp bằng email.
                        </Text>
                    </View>
                )}

                {!isSetMode && (
                    <>
                        <Text style={styles.label}>Mật khẩu hiện tại</Text>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry={!showPasswords}
                            autoCapitalize="none"
                            placeholder="Nhập mật khẩu hiện tại"
                            placeholderTextColor={colors.textMuted}
                        />
                    </>
                )}

                <Text style={styles.label}>Mật khẩu mới</Text>
                <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPasswords}
                    autoCapitalize="none"
                    placeholder="Ít nhất 8 ký tự, có hoa + thường + số"
                    placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPasswords}
                    autoCapitalize="none"
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor={colors.textMuted}
                />

                <Pressable
                    style={styles.toggleRow}
                    onPress={() => setShowPasswords((v) => !v)}
                >
                    <Ionicons
                        name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.onSurfaceVariant}
                    />
                    <Text style={styles.toggleText}>
                        {showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={submit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.onPrimary} size="small" />
                    ) : (
                        <Ionicons name="lock-closed" size={16} color={colors.onPrimary} />
                    )}
                    <Text style={styles.submitText}>
                        {submitting
                            ? 'Đang xử lý...'
                            : isSetMode
                                ? 'Tạo mật khẩu'
                                : 'Đổi mật khẩu'}
                    </Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        center: { alignItems: 'center', justifyContent: 'center' },
        content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
        noticeBox: {
            flexDirection: 'row',
            gap: spacing.sm,
            alignItems: 'flex-start',
            backgroundColor: colors.primaryContainer,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
        },
        noticeText: {
            flex: 1,
            fontSize: 13,
            lineHeight: 18,
            color: colors.onPrimaryContainer,
        },
        label: {
            ...typography.labelMd,
            color: colors.onSurfaceVariant,
            marginTop: spacing.md,
            marginBottom: spacing.xs,
        },
        input: {
            backgroundColor: colors.surfaceContainer,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            color: colors.onSurface,
            fontSize: 14,
        },
        toggleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.md,
            alignSelf: 'flex-start',
            paddingVertical: spacing.xs,
        },
        toggleText: { fontSize: 13, color: colors.onSurfaceVariant },
        submitBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            marginTop: spacing.xl,
        },
        submitBtnDisabled: { opacity: 0.6 },
        submitText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
    });
