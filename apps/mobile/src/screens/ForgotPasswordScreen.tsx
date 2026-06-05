import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fontSize, radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { RootStackParamList } from '@/navigation/types';
import { AuthApi } from '@/lib/api/auth.service';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

    const submit = async () => {
        const trimmed = email.trim();
        if (!trimmed) {
            Alert.alert('Thiếu email', 'Vui lòng nhập email tài khoản của bạn.');
            return;
        }
        setBusy(true);
        try {
            await AuthApi.forgotPassword(trimmed);
            setSubmittedEmail(trimmed);
        } catch (err) {
            const e = err as {
                response?: { data?: { error?: string; message?: string } };
                message?: string;
            };
            Alert.alert(
                'Không gửi được',
                e.response?.data?.error ||
                    e.response?.data?.message ||
                    e.message ||
                    'Vui lòng thử lại.',
            );
        } finally {
            setBusy(false);
        }
    };

    if (submittedEmail) {
        return (
            <View style={styles.screen}>
                <View style={styles.card}>
                    <Ionicons name="mail-open-outline" size={56} color={colors.primary} />
                    <Text style={styles.successTitle}>Đã gửi email khôi phục</Text>
                    <Text style={styles.successText}>
                        Nếu địa chỉ <Text style={styles.bold}>{submittedEmail}</Text> tồn
                        tại trong hệ thống, một liên kết đặt lại mật khẩu vừa được gửi.
                        Vui lòng kiểm tra hộp thư (kể cả Spam) và mở liên kết để đặt mật
                        khẩu mới.
                    </Text>
                    <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.primaryBtnText}>Quay lại đăng nhập</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.screen}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>Quên mật khẩu?</Text>
                <Text style={styles.subtitle}>
                    Nhập email tài khoản, mình sẽ gửi liên kết đặt lại mật khẩu vào hộp
                    thư của bạn.
                </Text>

                <TextInput
                    placeholder="Email"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    editable={!busy}
                />

                <Pressable
                    style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
                    onPress={submit}
                    disabled={busy}
                >
                    {busy ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.primaryBtnText}>Gửi email khôi phục</Text>
                    )}
                </Pressable>

                <Pressable
                    style={styles.linkBtn}
                    onPress={() => navigation.goBack()}
                    disabled={busy}
                >
                    <Text style={styles.linkText}>Quay lại đăng nhập</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        marginBottom: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
    },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
    linkBtn: { alignItems: 'center', marginTop: spacing.lg, paddingVertical: spacing.sm },
    linkText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
    card: {
        margin: spacing.xl,
        marginTop: spacing.xxl * 2,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        alignItems: 'center',
        gap: spacing.md,
    },
    successTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    successText: {
        fontSize: fontSize.sm,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 22,
    },
    bold: { fontWeight: '700' },
});
