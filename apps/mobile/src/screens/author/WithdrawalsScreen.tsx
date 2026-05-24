import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, radius, spacing } from '@/theme';
import { EmptyView, ErrorView, Loading } from '@/components/ui';
import {
    WalletApi,
    type Withdrawal,
    type WithdrawalStatus,
} from '@/lib/api/wallet.service';
import { formatNumber } from '@/lib/format';
import { describeError } from '@/lib/error';

const STATUS_LABEL: Record<WithdrawalStatus, { text: string; bg: string; fg: string }> = {
    PENDING: { text: 'Đang chờ duyệt', bg: '#FFF3E0', fg: '#EF6C00' },
    APPROVED: { text: 'Đã duyệt', bg: '#E3F2FD', fg: '#1565C0' },
    PROCESSING: { text: 'Đang xử lý', bg: '#E3F2FD', fg: '#1565C0' },
    COMPLETED: { text: 'Hoàn thành', bg: '#E8F5E9', fg: '#2E7D32' },
    REJECTED: { text: 'Từ chối', bg: '#FFEBEE', fg: '#C62828' },
};

export const WithdrawalsScreen: React.FC = () => {
    const qc = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);

    const balanceQ = useQuery({
        queryKey: ['wallet', 'balance'],
        queryFn: () => WalletApi.getBalance(),
    });
    const listQ = useQuery({
        queryKey: ['author', 'withdrawals'],
        queryFn: () => WalletApi.myWithdrawals(),
    });

    if (listQ.isLoading) return <Loading />;
    if (listQ.isError)
        return <ErrorView message={describeError(listQ.error)} onRetry={() => listQ.refetch()} />;

    return (
        <View style={styles.screen}>
            <View style={styles.headerCard}>
                <Text style={styles.headerLabel}>Có thể rút</Text>
                {balanceQ.isLoading ? (
                    <ActivityIndicator color={colors.white} />
                ) : (
                    <Text style={styles.headerValue}>
                        {formatNumber(balanceQ.data?.earnedBalance)} xu
                    </Text>
                )}
                <Pressable style={styles.newBtn} onPress={() => setModalOpen(true)}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={styles.newBtnText}>Tạo yêu cầu rút</Text>
                </Pressable>
            </View>

            <FlatList
                data={listQ.data ?? []}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={listQ.isRefetching}
                        onRefresh={() => listQ.refetch()}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <EmptyView
                        icon="cash-outline"
                        message="Chưa có yêu cầu rút xu nào."
                    />
                }
                renderItem={({ item }) => <WithdrawalRow item={item} />}
            />

            <NewWithdrawalModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                balance={balanceQ.data?.earnedBalance ?? 0}
                onSuccess={() => {
                    qc.invalidateQueries({ queryKey: ['author', 'withdrawals'] });
                    qc.invalidateQueries({ queryKey: ['wallet', 'balance'] });
                }}
            />
        </View>
    );
};

function WithdrawalRow({ item }: { item: Withdrawal }) {
    const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.PENDING;
    return (
        <View style={styles.row}>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowAmount}>{formatNumber(item.amount)} xu</Text>
                <Text style={styles.rowMeta}>
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                </Text>
                {item.bankName || item.bankAccount ? (
                    <Text style={styles.rowMeta}>
                        {item.bankName} · {item.bankAccount}
                    </Text>
                ) : null}
                {item.reviewerNotes ? (
                    <Text style={styles.rowNote}>Ghi chú: {item.reviewerNotes}</Text>
                ) : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.fg }]}>{status.text}</Text>
            </View>
        </View>
    );
}

function NewWithdrawalModal({
    open,
    onClose,
    balance,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    balance: number;
    onSuccess: () => void;
}) {
    const [amount, setAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setAmount('');
        setBankName('');
        setBankAccount('');
        setNote('');
    };

    const submit = async () => {
        const a = Number(amount);
        if (!Number.isFinite(a) || a <= 0) {
            Alert.alert('Số tiền không hợp lệ', 'Số xu rút phải > 0.');
            return;
        }
        if (a > balance) {
            Alert.alert('Vượt quá số dư', `Bạn chỉ có ${formatNumber(balance)} xu khả dụng.`);
            return;
        }
        if (!bankName.trim() || !bankAccount.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên ngân hàng và số tài khoản.');
            return;
        }
        try {
            setSubmitting(true);
            await WalletApi.requestWithdrawal({
                amount: a,
                bankName: bankName.trim(),
                bankAccount: bankAccount.trim(),
                note: note.trim() || undefined,
            });
            reset();
            onSuccess();
            onClose();
            Alert.alert('Đã gửi', 'Yêu cầu rút xu đã được tạo. Vui lòng đợi admin xử lý.');
        } catch (err) {
            Alert.alert('Lỗi', describeError(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Yêu cầu rút xu</Text>
                        <Pressable onPress={onClose} disabled={submitting}>
                            <Ionicons name="close" size={24} color={colors.textMuted} />
                        </Pressable>
                    </View>
                    <Text style={styles.modalLabel}>Số xu (có thể rút: {formatNumber(balance)})</Text>
                    <TextInput
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={styles.modalInput}
                    />
                    <Text style={styles.modalLabel}>Tên ngân hàng</Text>
                    <TextInput
                        value={bankName}
                        onChangeText={setBankName}
                        placeholder="Vietcombank, MB, Techcombank..."
                        placeholderTextColor={colors.textMuted}
                        style={styles.modalInput}
                    />
                    <Text style={styles.modalLabel}>Số tài khoản</Text>
                    <TextInput
                        value={bankAccount}
                        onChangeText={setBankAccount}
                        placeholder="9700123456789"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={styles.modalInput}
                    />
                    <Text style={styles.modalLabel}>Ghi chú (tùy chọn)</Text>
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="Tên chủ tài khoản, chi nhánh..."
                        placeholderTextColor={colors.textMuted}
                        style={[styles.modalInput, { minHeight: 60 }]}
                        multiline
                    />
                    <Pressable
                        style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                        onPress={submit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.submitText}>Gửi yêu cầu</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    headerCard: {
        backgroundColor: colors.primary,
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        gap: spacing.sm,
        alignItems: 'flex-start',
    },
    headerLabel: { color: colors.onPrimary, opacity: 0.85, fontSize: fontSize.sm, fontFamily: 'DMSans_500Medium' },
    headerValue: { color: colors.onPrimary, fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold' },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.onPrimary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
    },
    newBtnText: { color: colors.primary, fontFamily: 'DMSans_700Bold', fontSize: fontSize.sm },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
    row: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    rowAmount: { fontSize: fontSize.md, fontFamily: 'DMSans_700Bold', color: colors.onSurface },
    rowMeta: { fontSize: fontSize.xs, color: colors.onSurfaceVariant, marginTop: 2, fontFamily: 'DMSans_400Regular' },
    rowNote: {
        fontSize: fontSize.xs,
        color: colors.onSurface,
        marginTop: 4,
        fontStyle: 'italic',
        fontFamily: 'DMSans_400Regular',
    },
    statusPill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.pill,
        alignSelf: 'flex-start',
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    modalBackdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: colors.surfaceContainerLowest,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        gap: spacing.xs,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    modalTitle: { fontSize: fontSize.lg, fontFamily: 'PlusJakartaSans_700Bold', color: colors.onSurface },
    modalLabel: { fontSize: fontSize.xs, fontFamily: 'DMSans_500Medium', color: colors.onSurface, marginTop: spacing.sm },
    modalInput: {
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.md,
        color: colors.onSurface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        fontFamily: 'DMSans_400Regular',
    },
    submitBtn: {
        marginTop: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: radius.pill,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    submitText: { color: colors.onPrimary, fontFamily: 'DMSans_700Bold', fontSize: fontSize.md },
});
