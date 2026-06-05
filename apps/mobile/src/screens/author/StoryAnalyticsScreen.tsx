import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api/client';
import { ErrorView, Loading } from '@/components/ui';
import { fontSize, radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { formatCount } from '@/lib/format';
import { describeError } from '@/lib/error';
import type { RootStackParamList } from '@/navigation/types';

interface StoryStats {
    story: {
        id: string;
        title: string;
        viewCount: number;
        likeCount: number;
        followCount: number;
        rating: number;
        ratingCount: number;
    };
    counts: {
        chapters: number;
        comments: number;
        favorites: number;
        follows: number;
        ratings: number;
        recentComments: number;
    };
    views: {
        story: number;
        chapters: number;
        total: number;
    };
}

type R = RouteProp<RootStackParamList, 'StoryAnalytics'>;

export const StoryAnalyticsScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const route = useRoute<R>();
    const { storyId, storyTitle } = route.params;

    const q = useQuery({
        queryKey: ['author', 'analytics', storyId],
        queryFn: async () => {
            const res = await apiClient.get(`/statistics/stories/${storyId}`);
            return unwrap<StoryStats>(res);
        },
    });

    const max = useMemo(() => {
        const total = q.data?.views.total ?? 1;
        return Math.max(total, 1);
    }, [q.data]);

    if (q.isLoading) return <Loading />;
    if (q.isError) return <ErrorView message={describeError(q.error)} onRetry={() => q.refetch()} />;
    if (!q.data) return <ErrorView message="Không có dữ liệu thống kê." />;

    const s = q.data;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {storyTitle ? <Text style={styles.title}>{storyTitle}</Text> : null}

            <View style={styles.grid}>
                <StatCard
                    icon="eye-outline"
                    label="Lượt đọc truyện"
                    value={formatCount(s.story.viewCount)}
                />
                <StatCard
                    icon="document-text-outline"
                    label="Lượt đọc chương"
                    value={formatCount(s.views.chapters)}
                />
                <StatCard
                    icon="bookmark-outline"
                    label="Theo dõi"
                    value={formatCount(s.story.followCount)}
                />
                <StatCard
                    icon="heart-outline"
                    label="Yêu thích"
                    value={formatCount(s.counts.favorites)}
                />
                <StatCard
                    icon="list-outline"
                    label="Số chương"
                    value={formatCount(s.counts.chapters)}
                />
                <StatCard
                    icon="star-outline"
                    label="Đánh giá"
                    value={`${(s.story.rating ?? 0).toFixed(1)} (${formatCount(s.counts.ratings)})`}
                />
                <StatCard
                    icon="chatbubble-outline"
                    label="Bình luận"
                    value={formatCount(s.counts.comments)}
                />
                <StatCard
                    icon="time-outline"
                    label="BL 30 ngày"
                    value={formatCount(s.counts.recentComments)}
                />
            </View>

            <View style={styles.compareCard}>
                <Text style={styles.compareTitle}>Phân bổ lượt đọc</Text>
                <CompareRow
                    label="Trang truyện"
                    value={s.views.story}
                    max={max}
                    color={colors.primary}
                />
                <CompareRow
                    label="Trang chương"
                    value={s.views.chapters}
                    max={max}
                    color="#8b5cf6"
                />
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tổng</Text>
                    <Text style={styles.totalValue}>{formatCount(s.views.total)}</Text>
                </View>
            </View>
        </ScrollView>
    );
};

function StatCard({
    icon,
    label,
    value,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
}) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.card}>
            <Ionicons name={icon} size={20} color={colors.primary} />
            <Text style={styles.cardLabel}>{label}</Text>
            <Text style={styles.cardValue}>{value}</Text>
        </View>
    );
}

function CompareRow({
    label,
    value,
    max,
    color,
}: {
    label: string;
    value: number;
    max: number;
    color: string;
}) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <View style={styles.compareRow}>
            <View style={styles.compareHeader}>
                <Text style={styles.compareLabel}>{label}</Text>
                <Text style={styles.compareValue}>{formatCount(value)}</Text>
            </View>
            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    card: {
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.xs,
    },
    cardLabel: { fontSize: fontSize.xs, color: colors.textMuted },
    cardValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
    compareCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    compareTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
    compareRow: { gap: spacing.xs },
    compareHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    compareLabel: { fontSize: fontSize.sm, color: colors.text },
    compareValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
    barTrack: {
        height: 8,
        backgroundColor: colors.border,
        borderRadius: radius.pill,
        overflow: 'hidden',
    },
    barFill: { height: 8, borderRadius: radius.pill },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    totalLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted },
    totalValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
});
