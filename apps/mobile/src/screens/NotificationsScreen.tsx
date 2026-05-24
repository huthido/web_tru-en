import React, { useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, typography } from '@/theme';
import { timeAgo } from '@/lib/format';
import { describeError } from '@/lib/error';
import {
    useMarkAllAsRead,
    useMarkAsRead,
    useNotifications,
} from '@/lib/hooks/notifications';
import type { Notification, NotificationType } from '@/lib/api/notifications.service';
import { EmptyView, ErrorView, Loading } from '@/components/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TYPE_META: Record<NotificationType, { icon: IoniconName; tint: string }> = {
    STORY_NEW_CHAPTER: { icon: 'book', tint: colors.primary },
    STORY_APPROVED: { icon: 'checkmark-circle', tint: colors.success },
    STORY_REJECTED: { icon: 'close-circle', tint: colors.error },
    DONATION_RECEIVED: { icon: 'heart', tint: '#D81B60' },
    CHAPTER_PURCHASED: { icon: 'cart', tint: colors.coin },
    STORY_PURCHASED: { icon: 'library', tint: colors.coin },
    WITHDRAWAL_PROCESSED: { icon: 'cash', tint: colors.success },
    COIN_TRANSFER_RECEIVED: { icon: 'swap-horizontal', tint: colors.coin },
    COIN_DEPOSITED: { icon: 'arrow-down-circle', tint: colors.success },
    COMMENT_REPLY: { icon: 'chatbubble', tint: colors.tertiary },
    SYSTEM: { icon: 'megaphone', tint: colors.onSurfaceVariant },
};

function NotificationRow({
    item,
    onPress,
}: {
    item: Notification;
    onPress: (item: Notification) => void;
}) {
    const meta = TYPE_META[item.type] ?? TYPE_META.SYSTEM;
    return (
        <Pressable
            onPress={() => onPress(item)}
            style={[styles.row, !item.isRead && styles.rowUnread]}
        >
            <View style={[styles.iconWrap, { backgroundColor: meta.tint + '1A' }]}>
                <Ionicons name={meta.icon} size={20} color={meta.tint} />
            </View>
            <View style={styles.body}>
                <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={2}>
                    {item.title}
                </Text>
                {item.body ? (
                    <Text style={styles.subtitle} numberOfLines={2}>
                        {item.body}
                    </Text>
                ) : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.isRead ? <View style={styles.unreadDot} /> : null}
        </Pressable>
    );
}

export const NotificationsScreen: React.FC = () => {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const query = useNotifications(filter);
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();

    const items = query.data?.pages.flatMap((p) => p.items) ?? [];
    const total = query.data?.pages[0]?.total ?? 0;

    const handlePress = (item: Notification) => {
        if (!item.isRead) markAsRead.mutate(item.recipientId);
        // TODO: handle `actionUrl` để deep link (story / chapter / wallet).
        // Tạm thời chỉ đánh dấu đã đọc.
    };

    return (
        <View style={styles.screen}>
            <View style={styles.tabBar}>
                <Pressable
                    onPress={() => setFilter('all')}
                    style={[styles.tab, filter === 'all' && styles.tabActive]}
                >
                    <Text
                        style={[styles.tabText, filter === 'all' && styles.tabTextActive]}
                    >
                        Tất cả
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setFilter('unread')}
                    style={[styles.tab, filter === 'unread' && styles.tabActive]}
                >
                    <Text
                        style={[styles.tabText, filter === 'unread' && styles.tabTextActive]}
                    >
                        Chưa đọc
                    </Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable
                    onPress={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending || total === 0}
                    style={styles.markAllBtn}
                    hitSlop={8}
                >
                    <Text style={styles.markAllText}>Đánh dấu tất cả</Text>
                </Pressable>
            </View>

            {query.isLoading ? (
                <Loading />
            ) : query.isError ? (
                <ErrorView
                    message={describeError(query.error) || 'Không tải được thông báo'}
                    onRetry={() => query.refetch()}
                />
            ) : items.length === 0 ? (
                <EmptyView icon="notifications-off-outline" message="Chưa có thông báo nào." />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(it) => it.recipientId}
                    renderItem={({ item }) => (
                        <NotificationRow item={item} onPress={handlePress} />
                    )}
                    contentContainerStyle={styles.list}
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
                    ListFooterComponent={
                        query.isFetchingNextPage ? (
                            <View style={styles.footerLoader}>
                                <Loading />
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        padding: spacing.lg,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surfaceContainerLowest,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant,
    },
    tab: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        backgroundColor: colors.surfaceContainerLow,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    tabTextActive: { color: colors.onPrimary, fontFamily: 'DMSans_700Bold' },
    markAllBtn: { paddingHorizontal: spacing.sm },
    markAllText: { color: colors.primary, fontSize: fontSize.xs, fontFamily: 'DMSans_700Bold' },
    list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceContainerLowest,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        alignItems: 'flex-start',
    },
    rowUnread: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    title: { ...typography.bodyMd, color: colors.onSurface },
    titleUnread: { fontFamily: 'DMSans_700Bold' },
    subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
    time: { ...typography.bodySm, fontSize: fontSize.xs, color: colors.onSurfaceVariant, marginTop: 2 },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginTop: 8,
    },
    footerLoader: { paddingVertical: spacing.md },
});
