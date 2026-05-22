import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing } from '../theme';

/** Full-area centered loading spinner. */
export function Loading({ label }: { label?: string }) {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            {label ? <Text style={styles.dim}>{label}</Text> : null}
        </View>
    );
}

/** Error state with an optional retry button. */
export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
    return (
        <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
            <Text style={styles.dim}>{message ?? 'Đã có lỗi xảy ra'}</Text>
            {onRetry ? (
                <Pressable style={styles.retryBtn} onPress={onRetry}>
                    <Ionicons name="refresh" size={16} color={colors.white} />
                    <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

/** Empty-state placeholder. */
export function EmptyView({
    icon = 'file-tray-outline',
    message,
}: {
    icon?: keyof typeof Ionicons.glyphMap;
    message: string;
}) {
    return (
        <View style={styles.center}>
            <Ionicons name={icon} size={48} color={colors.border} />
            <Text style={styles.dim}>{message}</Text>
        </View>
    );
}

/** Section title with an optional "Xem thêm" action. */
export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {onSeeAll ? (
                <Pressable hitSlop={8} style={styles.seeAll} onPress={onSeeAll}>
                    <Text style={styles.seeAllText}>Xem thêm</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </Pressable>
            ) : null}
        </View>
    );
}

/** Five-icon star rating display. */
export function Stars({ rating, size = 13 }: { rating?: number; size?: number }) {
    const r = rating ?? 0;
    return (
        <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((i) => {
                const name = r >= i ? 'star' : r >= i - 0.5 ? 'star-half' : 'star-outline';
                return <Ionicons key={i} name={name} size={size} color={colors.star} />;
            })}
        </View>
    );
}

/** Thin horizontal progress bar (0-100). */
export function ProgressBar({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.md,
    },
    dim: {
        color: colors.textMuted,
        fontSize: fontSize.md,
        textAlign: 'center',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
    },
    retryText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAllText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
    progressTrack: {
        height: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.border,
        overflow: 'hidden',
    },
    progressFill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.primary },
});
