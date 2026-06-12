import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import {
    BugReportsApi,
    SEVERITY_OPTIONS,
    STATUS_LABELS,
    type BugReport,
    type BugSeverity,
} from '@/lib/api/bug-reports.service';

/** Màn báo lỗi — user mô tả bug, xem trạng thái các báo lỗi đã gửi. */
export const BugReportScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<BugSeverity>('MEDIUM');
    const [submitting, setSubmitting] = useState(false);
    const [myReports, setMyReports] = useState<BugReport[]>([]);

    const loadMine = useCallback(() => {
        BugReportsApi.listMine()
            .then(setMyReports)
            .catch(() => setMyReports([]));
    }, []);

    useEffect(loadMine, [loadMine]);

    const submit = async () => {
        if (title.trim().length < 5) {
            Alert.alert('Thiếu thông tin', 'Tiêu đề cần ít nhất 5 ký tự.');
            return;
        }
        if (description.trim().length < 10) {
            Alert.alert(
                'Thiếu thông tin',
                'Mô tả cần ít nhất 10 ký tự — hãy ghi rõ các bước tái hiện lỗi.',
            );
            return;
        }
        setSubmitting(true);
        try {
            await BugReportsApi.create({
                title: title.trim(),
                description: description.trim(),
                severity,
            });
            setTitle('');
            setDescription('');
            setSeverity('MEDIUM');
            loadMine();
            Alert.alert('Đã gửi', 'Cảm ơn bạn! Đội ngũ sẽ kiểm tra sớm nhất.');
        } catch {
            Alert.alert('Lỗi', 'Gửi báo lỗi thất bại, vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.label}>Tiêu đề</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={200}
                    placeholder="VD: App văng khi mở chương mới"
                    placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.label}>Mô tả chi tiết</Text>
                <TextInput
                    style={[styles.input, styles.textarea]}
                    value={description}
                    onChangeText={setDescription}
                    maxLength={5000}
                    multiline
                    textAlignVertical="top"
                    placeholder={'Các bước tái hiện lỗi:\n1. Mở màn hình...\n2. Nhấn vào...\n3. Lỗi xảy ra: ...'}
                    placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.label}>Mức độ</Text>
                <View style={styles.chipRow}>
                    {SEVERITY_OPTIONS.map((o) => {
                        const active = severity === o.value;
                        return (
                            <Pressable
                                key={o.value}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => setSeverity(o.value)}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {o.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Pressable
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={submit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.onPrimary} size="small" />
                    ) : (
                        <Ionicons name="send" size={16} color={colors.onPrimary} />
                    )}
                    <Text style={styles.submitText}>
                        {submitting ? 'Đang gửi...' : 'Gửi báo lỗi'}
                    </Text>
                </Pressable>

                {myReports.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>BÁO LỖI ĐÃ GỬI</Text>
                        {myReports.map((r) => (
                            <View key={r.id} style={styles.reportRow}>
                                <View style={styles.flex}>
                                    <Text style={styles.reportTitle} numberOfLines={1}>
                                        {r.title}
                                    </Text>
                                    <Text style={styles.reportDate}>
                                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                    </Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>
                                        {STATUS_LABELS[r.status] ?? r.status}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        flex: { flex: 1 },
        content: {
            padding: spacing.lg,
            paddingBottom: spacing.xl * 2,
            backgroundColor: colors.background,
            flexGrow: 1,
        },
        label: {
            ...typography.labelMd,
            color: colors.onSurfaceVariant,
            marginBottom: spacing.xs,
            marginTop: spacing.md,
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
        textarea: { minHeight: 140 },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        chip: {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            backgroundColor: colors.surfaceContainer,
        },
        chipActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        chipText: { fontSize: 13, color: colors.onSurfaceVariant },
        chipTextActive: { color: colors.onPrimary, fontWeight: '600' },
        submitBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            marginTop: spacing.lg,
        },
        submitBtnDisabled: { opacity: 0.6 },
        submitText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
        sectionTitle: {
            ...typography.labelMd,
            color: colors.onSurfaceVariant,
            marginTop: spacing.xl,
            marginBottom: spacing.sm,
            letterSpacing: 1,
        },
        reportRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: colors.surfaceContainer,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            padding: spacing.md,
            marginBottom: spacing.sm,
        },
        reportTitle: { color: colors.onSurface, fontSize: 14, fontWeight: '600' },
        reportDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
        statusBadge: {
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceVariant,
        },
        statusText: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '600' },
    });
