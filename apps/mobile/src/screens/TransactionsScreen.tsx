import React, { useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing } from '@/theme';
import { formatNumber, timeAgo } from '@/lib/format';
import { describeError } from '@/lib/error';
import type { CoinTransaction, TransactionType } from '@/lib/api/types';
import { useWalletHistoryInfinite } from '@/lib/hooks/wallet';
import { EmptyView, ErrorView, Loading } from '@/components/ui';

const TYPE_META: Record<
    TransactionType,
    { icon: keyof typeof Ionicons.glyphMap; tint: string; label: string }
> = {
    DEPOSIT: { icon: 'arrow-down-circle', tint: colors.success, label: 'Nạp xu' },
    REFUND: { icon: 'refresh-circle', tint: colors.success, label: 'Hoàn xu' },
    BONUS: { icon: 'gift', tint: '#7C4DFF', label: 'Quà tặng' },
    PURCHASE_CHAPTER: { icon: 'book', tint: colors.primary, label: 'Mở chương' },
    PURCHASE_STORY: { icon: 'library', tint: colors.primary, label: 'Mua trọn bộ' },
    DONATE_AUTHOR: { icon: 'heart', tint: '#D81B60', label: 'Ủng hộ tác giả' },
    TRANSFER: { icon: 'swap-horizontal', tint: colors.coin, label: 'Chuyển xu' },
    WITHDRAWAL: { icon: 'arrow-up-circle', tint: colors.danger, label: 'Rút xu' },
    ADMIN_ADJUST: { icon: 'settings', tint: colors.textMuted, label: 'Điều chỉnh' },
};

const TYPE_LIST = Object.keys(TYPE_META) as TransactionType[];

function metaFor(type: TransactionType) {
    return TYPE_META[type] ?? TYPE_META.ADMIN_ADJUST;
}

function TransactionRow({ tx }: { tx: CoinTransaction }) {
    const meta = metaFor(tx.type);
    const positive = tx.amount > 0;
    return (
        <View style={styles.txRow}>
            <View style={[styles.txIcon, { backgroundColor: meta.tint + '1A' }]}>
                <Ionicons name={meta.icon} size={20} color={meta.tint} />
            </View>
            <View style={styles.txBody}>
                <Text numberOfLines={1} style={styles.txTitle}>
                    {tx.description || meta.label}
                </Text>
                <Text style={styles.txDate}>{timeAgo(tx.createdAt)}</Text>
            </View>
            <Text style={[styles.txAmount, { color: positive ? colors.success : colors.danger }]}>
                {positive ? '+' : ''}
                {formatNumber(tx.amount)}
            </Text>
        </View>
    );
}

export const TransactionsScreen: React.FC = () => {
    const [types, setTypes] = useState<TransactionType[]>([]);
    const query = useWalletHistoryInfinite(types);

    const toggleType = (t: TransactionType) => {
        setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    };

    const items = query.data?.pages.flatMap((p) => p.items) ?? [];
    const total = query.data?.pages[0]?.total ?? 0;

    return (
        <View style={styles.screen}>
            {/* Filter chips */}
            <View style={styles.filterBar}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                >
                    {TYPE_LIST.map((t) => {
                        const active = types.includes(t);
                        const meta = TYPE_META[t];
                        return (
                            <Pressable
                                key={t}
                                onPress={() => toggleType(t)}
                                style={[
                                    styles.chip,
                                    active ? { backgroundColor: meta.tint, borderColor: meta.tint } : null,
                                ]}
                            >
                                <Ionicons
                                    name={meta.icon}
                                    size={14}
                                    color={active ? '#fff' : meta.tint}
                                />
                                <Text
                                    style={[styles.chipText, active ? { color: '#fff' } : null]}
                                >
                                    {meta.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
                {types.length > 0 ? (
                    <Pressable onPress={() => setTypes([])} hitSlop={8}>
                        <Text style={styles.clearText}>Xoá lọc</Text>
                    </Pressable>
                ) : null}
            </View>

            {/* List */}
            {query.isLoading ? (
                <Loading />
            ) : query.isError ? (
                <ErrorView
                    message={describeError(query.error) || 'Không tải được lịch sử'}
                    onRetry={() => query.refetch()}
                />
            ) : items.length === 0 ? (
                <EmptyView icon="time-outline" message="Không có giao dịch nào khớp bộ lọc." />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <TransactionRow tx={item} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={query.isRefetching && !query.isFetchingNextPage}
                            onRefresh={() => query.refetch()}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    onEndReached={() => {
                        if (query.hasNextPage && !query.isFetchingNextPage) {
                            query.fetchNextPage();
                        }
                    }}
                    onEndReachedThreshold={0.3}
                    ListHeaderComponent={
                        <Text style={styles.summary}>
                            {items.length} / {formatNumber(total)} giao dịch
                        </Text>
                    }
                    ListFooterComponent={
                        query.isFetchingNextPage ? (
                            <View style={styles.footerLoader}>
                                <Loading />
                            </View>
                        ) : !query.hasNextPage && items.length > 0 ? (
                            <Text style={styles.endOfList}>— Hết —</Text>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    filterBar: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chipsRow: {
        paddingHorizontal: spacing.lg,
        gap: spacing.xs,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        marginRight: spacing.xs,
    },
    chipText: { fontSize: fontSize.xs, color: colors.text, fontWeight: '600' },
    clearText: {
        color: colors.primary,
        fontSize: fontSize.xs,
        fontWeight: '600',
        paddingHorizontal: spacing.md,
    },
    listContent: {
        padding: spacing.lg,
        gap: 0,
    },
    summary: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    txBody: { flex: 1, gap: 2 },
    txTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
    txDate: { fontSize: fontSize.xs, color: colors.textMuted },
    txAmount: { fontSize: fontSize.md, fontWeight: '700' },
    footerLoader: { paddingVertical: spacing.md },
    endOfList: {
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: fontSize.xs,
        paddingVertical: spacing.md,
    },
});
