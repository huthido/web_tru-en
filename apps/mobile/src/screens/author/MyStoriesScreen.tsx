import React, { useCallback, useMemo } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fontSize, radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { RootNavigation } from '@/navigation/types';
import { StoriesApi } from '@/lib/api/stories.service';
import { ApprovalsApi } from '@/lib/api/approvals.service';
import { StoryCover } from '@/components/StoryCover';
import { EmptyView, ErrorView, Loading } from '@/components/ui';
import { describeError } from '@/lib/error';
import { formatCount } from '@/lib/format';
import type { Story } from '@/lib/api/types';

const PAGE_SIZE = 30;

function statusLabel(s: Story, colors: ThemeColors): { text: string; bg: string; fg: string } {
    if (s.isPublished) return { text: 'Đã xuất bản', bg: '#E8F5E9', fg: '#2E7D32' };
    if (s.status === 'DRAFT') return { text: 'Bản nháp', bg: '#FFF3E0', fg: '#EF6C00' };
    return { text: s.status, bg: colors.primarySoft, fg: colors.primaryDark };
}

export const MyStoriesScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();

    const query = useQuery({
        queryKey: ['author', 'my-stories'],
        queryFn: () => StoriesApi.myList({ page: 1, limit: PAGE_SIZE }),
        staleTime: 30_000,
    });

    const sendApproval = useMutation({
        mutationFn: (storyId: string) =>
            ApprovalsApi.createStoryRequest(storyId, 'STORY_PUBLISH', 'Yêu cầu xuất bản'),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['author', 'my-stories'] });
            Alert.alert('Đã gửi', 'Yêu cầu xuất bản đã được gửi. Vui lòng đợi admin duyệt.');
        },
        onError: (err) => Alert.alert('Lỗi', describeError(err)),
    });

    const deleteStory = useMutation({
        mutationFn: (id: string) => StoriesApi.remove(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['author', 'my-stories'] });
            Alert.alert('Đã xoá', 'Truyện đã được xoá.');
        },
        onError: (err) => Alert.alert('Lỗi', describeError(err)),
    });

    const onDelete = useCallback(
        (story: Story) => {
            Alert.alert(
                'Xoá truyện?',
                `Bạn chắc chắn muốn xoá "${story.title}"? Hành động này không thể hoàn tác.`,
                [
                    { text: 'Huỷ', style: 'cancel' },
                    {
                        text: 'Xoá',
                        style: 'destructive',
                        onPress: () => deleteStory.mutate(story.id),
                    },
                ],
            );
        },
        [deleteStory],
    );

    const renderItem = useCallback(
        ({ item }: { item: Story }) => {
            const status = statusLabel(item, colors);
            return (
                <View style={styles.card}>
                    <View style={styles.row}>
                        <StoryCover uri={item.coverImage} width={72} />
                        <View style={styles.info}>
                            <Text numberOfLines={2} style={styles.title}>
                                {item.title}
                            </Text>
                            <View
                                style={[styles.statusPill, { backgroundColor: status.bg }]}
                            >
                                <Text
                                    style={[styles.statusText, { color: status.fg }]}
                                >
                                    {status.text}
                                </Text>
                            </View>
                            <View style={styles.metaRow}>
                                <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                                <Text style={styles.meta}>{formatCount(item.viewCount)}</Text>
                                <Ionicons name="list-outline" size={13} color={colors.textMuted} />
                                <Text style={styles.meta}>{item._count?.chapters ?? 0} chương</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <Pressable
                            style={styles.actionBtn}
                            onPress={() =>
                                nav.navigate('ChapterList', {
                                    storyId: item.id,
                                    storySlug: item.slug,
                                    storyTitle: item.title,
                                })
                            }
                        >
                            <Ionicons name="list" size={16} color={colors.primary} />
                            <Text style={styles.actionText}>Chương</Text>
                        </Pressable>
                        <Pressable
                            style={styles.actionBtn}
                            onPress={() => nav.navigate('EditStory', { storyId: item.id })}
                        >
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                            <Text style={styles.actionText}>Sửa</Text>
                        </Pressable>
                        <Pressable
                            style={styles.actionBtn}
                            onPress={() =>
                                nav.navigate('StoryAnalytics', {
                                    storyId: item.id,
                                    storyTitle: item.title,
                                })
                            }
                        >
                            <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                            <Text style={styles.actionText}>Stats</Text>
                        </Pressable>
                    </View>

                    <View style={styles.actions}>
                        {!item.isPublished ? (
                            <Pressable
                                style={[styles.actionBtn, styles.primaryBtn]}
                                onPress={() => sendApproval.mutate(item.id)}
                                disabled={sendApproval.isPending}
                            >
                                <Ionicons name="send" size={14} color={colors.white} />
                                <Text style={styles.primaryText}>
                                    {sendApproval.isPending ? 'Đang gửi...' : 'Gửi duyệt'}
                                </Text>
                            </Pressable>
                        ) : null}
                        <Pressable
                            style={[styles.actionBtn, styles.dangerBtn]}
                            onPress={() => onDelete(item)}
                        >
                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
                            <Text style={styles.dangerText}>Xoá</Text>
                        </Pressable>
                    </View>
                </View>
            );
        },
        [nav, onDelete, sendApproval, styles, colors],
    );

    if (query.isLoading && !query.data) return <Loading />;
    if (query.isError) return <ErrorView onRetry={() => query.refetch()} message={describeError(query.error)} />;

    const stories = query.data?.data ?? [];

    return (
        <View style={styles.screen}>
            <FlatList
                data={stories}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={query.isRefetching}
                        onRefresh={() => query.refetch()}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <EmptyView
                        icon="document-text-outline"
                        message="Bạn chưa có truyện nào. Bấm + để bắt đầu đăng truyện đầu tiên."
                    />
                }
            />
            <Pressable
                style={styles.fab}
                onPress={() => nav.navigate('CreateStory')}
            >
                <Ionicons name="add" size={28} color={colors.white} />
            </Pressable>
        </View>
    );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    row: { flexDirection: 'row', gap: spacing.md },
    info: { flex: 1, gap: spacing.xs },
    title: { fontSize: fontSize.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: colors.onSurface },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
    },
    statusText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
    metaRow: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    meta: { color: colors.onSurfaceVariant, fontSize: fontSize.xs, marginRight: spacing.sm, fontFamily: 'DMSans_400Regular' },
    actions: { flexDirection: 'row', gap: spacing.sm },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceContainerLow,
    },
    actionText: { fontSize: fontSize.xs, color: colors.primary, fontFamily: 'DMSans_700Bold' },
    primaryBtn: { backgroundColor: colors.primary },
    primaryText: { color: colors.onPrimary, fontSize: fontSize.xs, fontFamily: 'DMSans_700Bold' },
    dangerBtn: { backgroundColor: colors.errorContainer },
    dangerText: { color: colors.error, fontSize: fontSize.xs, fontFamily: 'DMSans_700Bold' },
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
    },
});
