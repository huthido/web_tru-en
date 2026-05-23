import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, radius, spacing } from '@/theme';
import { formatNumber, timeAgo } from '@/lib/format';
import { describeError } from '@/lib/error';
import type { CoinPackage, CoinTransaction, TransactionType } from '@/lib/api/types';
import {
    useCoinPackages,
    useWalletBalance,
    useWalletHistory,
    walletKeys,
} from '@/lib/hooks/wallet';
import { EmptyView, ErrorView, Loading, SectionHeader } from '@/components/ui';
import { PaymentsApi } from '@/lib/api/payments.service';
import { finish as finishIap, purchase as runIapPurchase } from '@/lib/iap';

/* ── transaction styling ─────────────────────────────────────────────── */

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
            <Text
                style={[
                    styles.txAmount,
                    { color: positive ? colors.success : colors.danger },
                ]}
            >
                {positive ? '+' : ''}
                {formatNumber(tx.amount)}
            </Text>
        </View>
    );
}

/* ── coin package card ──────────────────────────────────────────────── */

function pickSku(pkg: CoinPackage): string | null {
    if (Platform.OS === 'ios') return pkg.appleProductId ?? null;
    if (Platform.OS === 'android') return pkg.googleProductId ?? null;
    return null;
}

function PackageCard({
    pkg,
    onBuy,
    busySku,
}: {
    pkg: CoinPackage;
    onBuy: (pkg: CoinPackage, sku: string) => void;
    busySku: string | null;
}) {
    const sku = pickSku(pkg);
    const onMobile = !!sku;
    const busy = !!sku && busySku === sku;

    return (
        <View style={styles.pkgCard}>
            <View style={styles.pkgCoinRow}>
                <Ionicons name="logo-bitcoin" size={22} color={colors.coin} />
                <Text style={styles.pkgCoinAmount}>{formatNumber(pkg.coinAmount)}</Text>
            </View>
            <Text style={styles.pkgName}>{pkg.name}</Text>
            <Text style={styles.pkgPrice}>{formatNumber(pkg.priceVND)} đ</Text>
            {onMobile ? (
                <Pressable
                    disabled={busy || !!busySku}
                    onPress={() => sku && onBuy(pkg, sku)}
                    style={({ pressed }) => [
                        styles.pkgBtn,
                        (busy || !!busySku) && styles.pkgBtnBusy,
                        pressed && styles.pkgBtnPressed,
                    ]}
                >
                    <Text style={styles.pkgBtnText}>{busy ? 'Đang xử lý…' : 'Mua xu'}</Text>
                </Pressable>
            ) : (
                <View style={styles.pkgBtnDisabled}>
                    <Text style={styles.pkgBtnDisabledText}>Chỉ bán trên web</Text>
                </View>
            )}
        </View>
    );
}

/* ── screen ─────────────────────────────────────────────────────────── */

export const WalletScreen: React.FC = () => {
    const qc = useQueryClient();
    const balance = useWalletBalance();
    const history = useWalletHistory();
    const packages = useCoinPackages();
    const [refreshing, setRefreshing] = useState(false);
    const [buyingSku, setBuyingSku] = useState<string | null>(null);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            qc.invalidateQueries({ queryKey: walletKeys.balance }),
            qc.invalidateQueries({ queryKey: walletKeys.history }),
            qc.invalidateQueries({ queryKey: walletKeys.packages }),
        ]);
        setRefreshing(false);
    }, [qc]);

    const onBuy = useCallback(
        async (_pkg: CoinPackage, sku: string) => {
            if (buyingSku) return;
            setBuyingSku(sku);
            try {
                const p = await runIapPurchase(sku);
                if (p.kind === 'apple') {
                    await PaymentsApi.redeemAppleIap({
                        productId: p.productId,
                        transactionId: p.transactionId,
                        receipt: p.receipt,
                    });
                } else {
                    await PaymentsApi.redeemGooglePlay({
                        productId: p.productId,
                        purchaseToken: p.purchaseToken,
                    });
                }
                await finishIap(p);
                await Promise.all([
                    qc.invalidateQueries({ queryKey: walletKeys.balance }),
                    qc.invalidateQueries({ queryKey: walletKeys.history }),
                ]);
                Alert.alert('Thành công', 'Xu đã được cộng vào ví.');
            } catch (e: any) {
                Alert.alert('Mua xu thất bại', describeError(e) || e?.message || String(e));
            } finally {
                setBuyingSku(null);
            }
        },
        [buyingSku, qc],
    );

    if (balance.isLoading) return <Loading />;
    if (balance.isError || !balance.data) {
        return (
            <ErrorView
                message={describeError(balance.error) || 'Không tải được ví'}
                onRetry={() => balance.refetch()}
            />
        );
    }

    const w = balance.data;
    const total = w.purchasedBalance + w.earnedBalance;
    const transactions = history.data ?? [];
    const pkgList = (packages.data ?? []).filter((p) => p.isActive);

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                />
            }
        >
            {/* Balance card */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Tổng số dư</Text>
                <View style={styles.balanceTotalRow}>
                    <Ionicons name="logo-bitcoin" size={28} color={colors.coin} />
                    <Text style={styles.balanceTotal}>{formatNumber(total)}</Text>
                </View>
                {w.isLocked ? (
                    <View style={styles.lockBanner}>
                        <Ionicons name="lock-closed" size={14} color={colors.danger} />
                        <Text style={styles.lockText}>
                            Ví đang bị khoá. Liên hệ hỗ trợ để mở lại.
                        </Text>
                    </View>
                ) : null}
                <View style={styles.bucketRow}>
                    <View style={styles.bucket}>
                        <Text style={styles.bucketLabel}>Xu đã mua</Text>
                        <Text style={styles.bucketValue}>
                            {formatNumber(w.purchasedBalance)}
                        </Text>
                        <Text style={styles.bucketHint}>Dùng để mở chương / mua truyện</Text>
                    </View>
                    <View style={styles.bucketDivider} />
                    <View style={styles.bucket}>
                        <Text style={styles.bucketLabel}>Xu tích luỹ</Text>
                        <Text style={styles.bucketValue}>
                            {formatNumber(w.earnedBalance)}
                        </Text>
                        <Text style={styles.bucketHint}>Rút thành tiền (chỉ trên web)</Text>
                    </View>
                </View>
            </View>

            {/* Coin packages */}
            <View style={styles.section}>
                <SectionHeader title="Mua xu" />
                {packages.isLoading ? (
                    <View style={styles.smallLoader}>
                        <Loading />
                    </View>
                ) : pkgList.length === 0 ? (
                    <View style={styles.emptyInline}>
                        <EmptyView
                            icon="pricetags-outline"
                            message="Chưa có gói xu nào đang bán"
                        />
                    </View>
                ) : (
                    <FlatList
                        horizontal
                        data={pkgList}
                        keyExtractor={(p) => p.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pkgList}
                        renderItem={({ item }) => (
                            <PackageCard pkg={item} onBuy={onBuy} busySku={buyingSku} />
                        )}
                    />
                )}
            </View>

            {/* Transactions */}
            <View style={styles.section}>
                <SectionHeader title="Giao dịch gần đây" />
                {history.isLoading ? (
                    <View style={styles.smallLoader}>
                        <Loading />
                    </View>
                ) : history.isError ? (
                    <View style={styles.emptyInline}>
                        <ErrorView
                            message={describeError(history.error)}
                            onRetry={() => history.refetch()}
                        />
                    </View>
                ) : transactions.length === 0 ? (
                    <View style={styles.emptyInline}>
                        <EmptyView icon="time-outline" message="Chưa có giao dịch nào" />
                    </View>
                ) : (
                    <View style={styles.txList}>
                        {transactions.map((tx) => (
                            <TransactionRow key={tx.id} tx={tx} />
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: spacing.xxl },
    /* balance */
    balanceCard: {
        backgroundColor: colors.surface,
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.lg,
        gap: spacing.md,
    },
    balanceLabel: { fontSize: fontSize.sm, color: colors.textMuted },
    balanceTotalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    balanceTotal: { fontSize: 32, fontWeight: '800', color: colors.text },
    lockBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: '#FFEBEE',
    },
    lockText: { color: colors.danger, fontSize: fontSize.xs, flex: 1 },
    bucketRow: {
        flexDirection: 'row',
        backgroundColor: colors.bg,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
    },
    bucket: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm },
    bucketDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
    bucketLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
    bucketValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    bucketHint: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
    /* sections */
    section: { marginBottom: spacing.lg },
    smallLoader: { height: 160 },
    emptyInline: { height: 140 },
    /* packages */
    pkgList: { paddingHorizontal: spacing.lg, gap: spacing.md },
    pkgCard: {
        width: 160,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.xs,
    },
    pkgCoinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    pkgCoinAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
    pkgName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
    pkgPrice: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '700' },
    pkgBtn: {
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    pkgBtnPressed: { opacity: 0.85 },
    pkgBtnBusy: { backgroundColor: colors.textMuted },
    pkgBtnText: { fontSize: fontSize.xs, color: '#fff', fontWeight: '700' },
    pkgBtnDisabled: {
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.bg,
        alignItems: 'center',
    },
    pkgBtnDisabledText: { fontSize: fontSize.xs, color: colors.textMuted },
    /* transactions */
    txList: {
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
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
});
