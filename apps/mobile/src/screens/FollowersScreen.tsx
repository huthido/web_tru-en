import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { AuthorsService, type AuthorFollowerItem } from '@/lib/api/authors.service';
import { formatNumber } from '@/lib/format';
import type { RootNavigation } from '@/navigation/types';

function formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const FollowersScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const nav = useNavigation<RootNavigation>();
    const { user } = useAuth();

    const q = useInfiniteQuery({
        queryKey: ['author', 'followers', user?.id],
        queryFn: ({ pageParam }) => AuthorsService.listFollowers(user!.id, pageParam, 20),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
        enabled: !!user?.id,
    });

    const items = q.data?.pages.flatMap((p) => p.data) ?? [];
    const total = q.data?.pages[0]?.meta.total ?? 0;

    const renderItem = ({ item }: { item: AuthorFollowerItem }) => {
        const name = item.displayName || item.username;
        return (
            <Pressable
                style={styles.row}
                onPress={() => nav.navigate('UserProfile', { username: item.username })}
            >
                <View style={styles.avatarWrap}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Ionicons name="person" size={22} color={colors.onSurfaceVariant} />
                        </View>
                    )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <Text style={styles.handle} numberOfLines={1}>@{item.username}</Text>
                </View>
                <Text style={styles.date}>Theo dõi {formatDate(item.followedAt)}</Text>
            </Pressable>
        );
    };

    if (q.isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (q.isError) {
        return (
            <View style={styles.center}>
                <Text style={styles.empty}>Không tải được danh sách người theo dõi.</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.screen}
            contentContainerStyle={styles.content}
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            ListHeaderComponent={
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="people" size={22} color={colors.onPrimary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Người theo dõi</Text>
                        <Text style={styles.headerSub}>
                            {formatNumber(total)} người đang theo dõi bạn
                        </Text>
                    </View>
                </View>
            }
            ListEmptyComponent={
                <View style={styles.emptyWrap}>
                    <Ionicons name="people-outline" size={48} color={colors.onSurfaceVariant} />
                    <Text style={styles.emptyTitle}>Chưa có người theo dõi</Text>
                    <Text style={styles.empty}>
                        Chia sẻ trang cá nhân của bạn để thu hút thêm người theo dõi nhé!
                    </Text>
                </View>
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => {
                if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
            }}
            ListFooterComponent={
                q.isFetchingNextPage ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
                ) : null
            }
        />
    );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    headerIcon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { ...typography.headlineSm, color: colors.onSurface, fontSize: 20 },
    headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg, padding: spacing.md,
        borderWidth: 1, borderColor: colors.outlineVariant,
    },
    avatarWrap: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surfaceContainer },
    avatar: { width: 44, height: 44 },
    avatarFallback: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    name: { ...typography.bodyMd, color: colors.onSurface, fontFamily: 'DMSans_700Bold' },
    handle: { ...typography.bodySm, color: colors.onSurfaceVariant },
    date: { ...typography.bodySm, fontSize: fontSize.xs, color: colors.onSurfaceVariant },
    emptyWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
    emptyTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface, marginTop: spacing.sm },
    empty: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
});
