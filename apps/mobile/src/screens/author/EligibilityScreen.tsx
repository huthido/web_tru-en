import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { MonetizationService, type MonetizationEligibility } from '@/lib/api/monetization.service';
import { formatNumber } from '@/lib/format';
import type { RootNavigation } from '@/navigation/types';

/** Tiến độ mở khoá Trung tâm Kiếm tiền — theo docs/Điều Kiện Bật Kiếm Tiền.docx. */
export const EligibilityScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const nav = useNavigation<RootNavigation>();
    const { data, isLoading } = useQuery<MonetizationEligibility>({
        queryKey: ['monetization', 'eligibility', 'me'],
        queryFn: () => MonetizationService.getMyEligibility(),
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading || !data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Mở khoá tính năng nâng cao</Text>
            <Text style={styles.subtitle}>
                Donate và rút xu mở tự do cho mọi tác giả. Đạt đủ 4 điều kiện để mở thêm quyền lợi: nhận xu quảng cáo, bán chương trả phí, truyện VIP, tick xanh ✓.
            </Text>

            {data.eligible && (
                <View style={styles.successCard}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.successTitle}>Chúc mừng!</Text>
                        <Text style={styles.successSubtitle}>Bạn đã đủ điều kiện — 4 quyền lợi nâng cao đã mở khoá.</Text>
                    </View>
                    <Pressable onPress={() => nav.replace('Earnings')} style={styles.cta}>
                        <Text style={styles.ctaText}>Vào</Text>
                    </Pressable>
                </View>
            )}

            <ProgressCard
                icon="eye"
                title="Tổng lượt xem"
                current={data.progress.totalViews.current}
                required={data.progress.totalViews.required}
                ok={data.criteria.totalViews}
            />
            <ProgressCard
                icon="people"
                title="Người theo dõi tác giả"
                current={data.progress.followers.current}
                required={data.progress.followers.required}
                ok={data.criteria.followers}
            />
            <BinaryCard
                icon="shield-checkmark"
                title="Tài khoản không vi phạm"
                ok={data.criteria.accountOk}
                okMessage="Tài khoản đang hoạt động bình thường."
                failMessage={data.reasons?.accountOk ?? 'Có báo cáo vi phạm gần đây.'}
            />
            <BinaryCard
                icon="document-text"
                title="Nội dung không vi phạm"
                ok={data.criteria.contentOk}
                okMessage="Không có nội dung bị xử lý vi phạm."
                failMessage={data.reasons?.contentOk ?? 'Có nội dung bị xử lý vi phạm gần đây.'}
            />

            <Text style={styles.footnote}>
                Tiêu chí tài khoản / nội dung tính trong cửa sổ 90 ngày gần nhất.
            </Text>
        </ScrollView>
    );
};

function ProgressCard({
    icon,
    title,
    current,
    required,
    ok,
}: {
    icon: any;
    title: string;
    current: number;
    required: number;
    ok: boolean;
}) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const pct = Math.min(100, Math.round((current / required) * 100));
    return (
        <View style={[styles.card, ok && styles.cardOk]}>
            <View style={styles.cardHead}>
                <View style={[styles.iconBox, ok && styles.iconBoxOk]}>
                    <Ionicons name={ok ? 'checkmark' : icon} size={18} color={ok ? colors.onPrimary : colors.onSurfaceVariant} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardValue}>
                {formatNumber(current)}
                <Text style={styles.cardValueMuted}> / {formatNumber(required)}</Text>
            </Text>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
        </View>
    );
}

function BinaryCard({
    icon,
    title,
    ok,
    okMessage,
    failMessage,
}: {
    icon: any;
    title: string;
    ok: boolean;
    okMessage: string;
    failMessage: string;
}) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={[styles.card, ok ? styles.cardOk : styles.cardErr]}>
            <View style={styles.cardHead}>
                <View style={[styles.iconBox, ok ? styles.iconBoxOk : styles.iconBoxErr]}>
                    <Ionicons name={ok ? 'checkmark' : 'close'} size={18} color={colors.onPrimary} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardMessage}>{ok ? okMessage : failMessage}</Text>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg, gap: spacing.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    title: { ...typography.headlineLg, color: colors.onSurface, fontSize: 24 },
    subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    successCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.primaryContainer,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    successTitle: { ...typography.headlineSm, color: colors.onSurface, fontSize: 16 },
    successSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
    cta: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
    },
    ctaText: { ...typography.labelMd, color: colors.onPrimary, fontFamily: 'DMSans_700Bold' },
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    cardOk: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
    cardErr: { borderColor: colors.error, backgroundColor: colors.errorContainer },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxOk: { backgroundColor: colors.primary },
    iconBoxErr: { backgroundColor: colors.error },
    cardTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface, flex: 1 },
    cardValue: { ...typography.headlineLg, fontSize: 22, color: colors.onSurface },
    cardValueMuted: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: fontSize.md },
    cardMessage: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    progressBar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceContainer, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.primary },
    footnote: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: spacing.sm },
});
