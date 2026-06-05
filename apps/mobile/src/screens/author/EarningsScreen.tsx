import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueries, useQuery } from '@tanstack/react-query';
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { ErrorView } from '@/components/ui';
import { WalletApi, type EarningsBreakdown, type TodayEarnings } from '@/lib/api/wallet.service';
import { MonetizationService } from '@/lib/api/monetization.service';
import { formatNumber } from '@/lib/format';
import { describeError } from '@/lib/error';
import type { RootNavigation } from '@/navigation/types';

export const EarningsScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const nav = useNavigation<RootNavigation>();

    // Donate / bán content đã tạo mở tự do cho mọi tác giả. Eligibility chỉ
    // dùng để hiện banner mời mở khoá tính năng nâng cao.
    const eligibilityQ = useQuery({
        queryKey: ['monetization', 'eligibility', 'me'],
        queryFn: () => MonetizationService.getMyEligibility(),
        staleTime: 5 * 60 * 1000,
    });
    const showUpgradeBanner = !!eligibilityQ.data && !eligibilityQ.data.eligible;

    const balanceQ = useQuery({
        queryKey: ['wallet', 'balance'],
        queryFn: () => WalletApi.getBalance(),
    });
    const todayQ = useQuery<TodayEarnings>({
        queryKey: ['author', 'earnings', 'today'],
        queryFn: () => WalletApi.myTodayEarnings(),
    });
    const breakdownQs = useQueries({
        queries: [
            {
                queryKey: ['author', 'earnings', 'donations'],
                queryFn: () => WalletApi.myDonations(),
            },
            {
                queryKey: ['author', 'earnings', 'chapter-sales'],
                queryFn: () => WalletApi.myChapterSales(),
            },
            {
                queryKey: ['author', 'earnings', 'story-sales'],
                queryFn: () => WalletApi.myStorySales(),
            },
        ],
    });
    const [donationsQ, chapterSalesQ, storySalesQ] = breakdownQs;

    const refetchAll = () => {
        balanceQ.refetch();
        todayQ.refetch();
        breakdownQs.forEach((q) => q.refetch());
    };
    const refreshing =
        balanceQ.isRefetching ||
        todayQ.isRefetching ||
        breakdownQs.some((q) => q.isRefetching);

    const isAnyError = [balanceQ, todayQ, ...breakdownQs].some((q) => q.isError);
    if (isAnyError && !balanceQ.data && !todayQ.data) {
        return (
            <ErrorView
                message={describeError(
                    balanceQ.error ??
                        todayQ.error ??
                        donationsQ.error ??
                        chapterSalesQ.error ??
                        storySalesQ.error,
                )}
                onRetry={refetchAll}
            />
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={refetchAll}
                    tintColor={colors.primary}
                />
            }
        >
            {/* Banner mời mở khoá tính năng nâng cao */}
            {showUpgradeBanner && (
                <Pressable style={styles.upgradeBanner} onPress={() => nav.navigate('Eligibility')}>
                    <Ionicons name="sparkles" size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.upgradeTitle}>Mở khoá thêm tính năng nâng cao</Text>
                        <Text style={styles.upgradeSubtitle}>
                            Nhận xu quảng cáo, bán chương trả phí, truyện VIP, gắn tick xanh ✓.
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
            )}

            {/* Balance card */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Xu kiếm được (có thể rút)</Text>
                {balanceQ.isLoading ? (
                    <ActivityIndicator color={colors.white} />
                ) : (
                    <Text style={styles.balanceValue}>
                        {formatNumber(balanceQ.data?.earnedBalance)} xu
                    </Text>
                )}
                <Pressable
                    style={styles.withdrawBtn}
                    onPress={() => nav.navigate('Withdrawals')}
                >
                    <Ionicons name="arrow-down-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.withdrawText}>Rút xu</Text>
                </Pressable>
            </View>

            {/* Today */}
            <SectionCard title="Hôm nay" loading={todayQ.isLoading}>
                {todayQ.data ? (
                    <View style={styles.gridSm}>
                        <Cell label="Donate" value={formatNumber(todayQ.data.donations)} />
                        <Cell label="Bán chương" value={formatNumber(todayQ.data.chapterSales)} />
                        <Cell label="Bán truyện" value={formatNumber(todayQ.data.storySales)} />
                        <Cell label="Tổng" value={formatNumber(todayQ.data.total)} highlight />
                    </View>
                ) : null}
            </SectionCard>

            {/* Total breakdown */}
            <SectionCard
                title="Thu nhập từ ủng hộ (donate)"
                loading={donationsQ.isLoading}
            >
                {donationsQ.data ? <BreakdownRows data={donationsQ.data} /> : null}
            </SectionCard>

            <SectionCard title="Bán chương" loading={chapterSalesQ.isLoading}>
                {chapterSalesQ.data ? <BreakdownRows data={chapterSalesQ.data} /> : null}
            </SectionCard>

            <SectionCard title="Bán truyện VIP" loading={storySalesQ.isLoading}>
                {storySalesQ.data ? <BreakdownRows data={storySalesQ.data} /> : null}
            </SectionCard>
        </ScrollView>
    );
};

function SectionCard({
    title,
    loading,
    children,
}: {
    title: string;
    loading?: boolean;
    children?: React.ReactNode;
}) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            {loading ? <ActivityIndicator color={colors.primary} /> : children}
        </View>
    );
}

function BreakdownRows({ data }: { data: EarningsBreakdown }) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={{ gap: spacing.xs }}>
            <KV k="Doanh thu gốc" v={`${formatNumber(data.gross)} xu`} />
            <KV
                k={`Phí nền tảng (${Math.round((data.feeRate ?? 0) * 100)}%)`}
                v={`- ${formatNumber(data.platformFee)} xu`}
            />
            <View style={styles.divider} />
            <KV k="Thực nhận" v={`${formatNumber(data.net)} xu`} highlight />
        </View>
    );
}

function Cell({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.cell}>
            <Text style={styles.cellLabel}>{label}</Text>
            <Text style={[styles.cellValue, highlight && { color: colors.primary }]}>
                {value}
            </Text>
        </View>
    );
}

function KV({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.kv}>
            <Text style={styles.kvK}>{k}</Text>
            <Text style={[styles.kvV, highlight && { color: colors.primary, fontWeight: '800' }]}>
                {v}
            </Text>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    balanceCard: {
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        padding: spacing.lg,
        gap: spacing.sm,
        alignItems: 'flex-start',
    },
    balanceLabel: { ...typography.labelMd, color: colors.onPrimary, opacity: 0.85 },
    balanceValue: { ...typography.headlineLg, color: colors.onPrimary, fontSize: 30 },
    withdrawBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.onPrimary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        marginTop: spacing.xs,
    },
    withdrawText: { ...typography.labelMd, color: colors.primary, fontFamily: 'DMSans_700Bold' },
    upgradeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.primaryContainer,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    upgradeTitle: { ...typography.labelMd, color: colors.onSurface, fontFamily: 'DMSans_700Bold' },
    upgradeSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: fontSize.xs, marginTop: 2 },
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    cardTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
    gridSm: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cell: {
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: colors.surfaceContainerLow,
        padding: spacing.md,
        borderRadius: radius.md,
        gap: 2,
    },
    cellLabel: { ...typography.bodySm, fontSize: fontSize.xs, color: colors.onSurfaceVariant },
    cellValue: { ...typography.headlineSm, fontSize: fontSize.lg, color: colors.onSurface },
    kv: { flexDirection: 'row', justifyContent: 'space-between' },
    kvK: { ...typography.bodySm, color: colors.onSurfaceVariant },
    kvV: { ...typography.bodySm, color: colors.onSurface, fontFamily: 'DMSans_500Medium' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant, marginVertical: spacing.xs },
});
