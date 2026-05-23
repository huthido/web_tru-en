import React from 'react';
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
import { colors, fontSize, radius, spacing } from '@/theme';
import { ErrorView } from '@/components/ui';
import { WalletApi, type EarningsBreakdown, type TodayEarnings } from '@/lib/api/wallet.service';
import { formatNumber } from '@/lib/format';
import { describeError } from '@/lib/error';
import type { RootNavigation } from '@/navigation/types';

export const EarningsScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();

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
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            {loading ? <ActivityIndicator color={colors.primary} /> : children}
        </View>
    );
}

function BreakdownRows({ data }: { data: EarningsBreakdown }) {
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
    return (
        <View style={styles.kv}>
            <Text style={styles.kvK}>{k}</Text>
            <Text style={[styles.kvV, highlight && { color: colors.primary, fontWeight: '800' }]}>
                {v}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    balanceCard: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
        alignItems: 'flex-start',
    },
    balanceLabel: { color: colors.white, opacity: 0.85, fontSize: fontSize.sm },
    balanceValue: { color: colors.white, fontSize: 30, fontWeight: '800' },
    withdrawBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        marginTop: spacing.xs,
    },
    withdrawText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
    gridSm: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cell: {
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: colors.bg,
        padding: spacing.md,
        borderRadius: radius.md,
        gap: 2,
    },
    cellLabel: { fontSize: fontSize.xs, color: colors.textMuted },
    cellValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    kv: { flexDirection: 'row', justifyContent: 'space-between' },
    kvK: { fontSize: fontSize.sm, color: colors.textMuted },
    kvV: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
