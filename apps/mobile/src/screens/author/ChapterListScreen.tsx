import React, { useCallback } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, radius, spacing } from '@/theme';
import { ChaptersApi } from '@/lib/api/chapters.service';
import { EmptyView, ErrorView, Loading } from '@/components/ui';
import { describeError } from '@/lib/error';
import { formatCount } from '@/lib/format';
import type { RootNavigation, RootStackParamList } from '@/navigation/types';
import type { Chapter } from '@/lib/api/types';

type R = RouteProp<RootStackParamList, 'ChapterList'>;

export const ChapterListScreen: React.FC = () => {
    const route = useRoute<R>();
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const { storyId, storySlug, storyTitle } = route.params;

    const q = useQuery({
        queryKey: ['author', 'chapters', storySlug],
        queryFn: () => ChaptersApi.list(storySlug),
    });

    const invalidate = () =>
        qc.invalidateQueries({ queryKey: ['author', 'chapters', storySlug] });

    const togglePublish = useMutation({
        mutationFn: async (ch: Chapter) =>
            ch.isPublished
                ? ChaptersApi.unpublish(storySlug, ch.id)
                : ChaptersApi.publish(storySlug, ch.id),
        onSuccess: invalidate,
        onError: (err) => Alert.alert('Lỗi', describeError(err)),
    });

    const removeChapter = useMutation({
        mutationFn: (id: string) => ChaptersApi.remove(storySlug, id),
        onSuccess: invalidate,
        onError: (err) => Alert.alert('Lỗi', describeError(err)),
    });

    const onDelete = useCallback(
        (ch: Chapter) => {
            Alert.alert(
                'Xoá chương?',
                `Bạn chắc chắn muốn xoá "${ch.title}"?`,
                [
                    { text: 'Huỷ', style: 'cancel' },
                    {
                        text: 'Xoá',
                        style: 'destructive',
                        onPress: () => removeChapter.mutate(ch.id),
                    },
                ],
            );
        },
        [removeChapter],
    );

    const renderItem = useCallback(
        ({ item }: { item: Chapter }) => (
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.orderBadge}>
                        <Text style={styles.orderText}>C.{item.order}</Text>
                    </View>
                    <View style={styles.info}>
                        <Text numberOfLines={2} style={styles.title}>
                            {item.title}
                        </Text>
                        <View style={styles.metaRow}>
                            <View
                                style={[
                                    styles.statusPill,
                                    {
                                        backgroundColor: item.isPublished
                                            ? '#E8F5E9'
                                            : '#FFF3E0',
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusText,
                                        {
                                            color: item.isPublished
                                                ? '#2E7D32'
                                                : '#EF6C00',
                                        },
                                    ]}
                                >
                                    {item.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                                </Text>
                            </View>
                            <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                            <Text style={styles.meta}>{formatCount(item.viewCount)}</Text>
                            {item.price > 0 ? (
                                <>
                                    <Ionicons name="logo-bitcoin" size={13} color={colors.coin} />
                                    <Text style={styles.meta}>{item.price}</Text>
                                </>
                            ) : null}
                        </View>
                    </View>
                </View>
                <View style={styles.actions}>
                    <Pressable
                        style={styles.actionBtn}
                        onPress={() =>
                            nav.navigate('EditChapter', {
                                storyId,
                                storySlug,
                                chapterId: item.id,
                            })
                        }
                    >
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={styles.actionText}>Sửa</Text>
                    </Pressable>
                    <Pressable
                        style={styles.actionBtn}
                        onPress={() => togglePublish.mutate(item)}
                        disabled={togglePublish.isPending}
                    >
                        <Ionicons
                            name={item.isPublished ? 'eye-off-outline' : 'send-outline'}
                            size={16}
                            color={colors.primary}
                        />
                        <Text style={styles.actionText}>
                            {item.isPublished ? 'Ẩn' : 'Xuất bản'}
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.actionBtn, styles.dangerBtn]}
                        onPress={() => onDelete(item)}
                    >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={styles.dangerText}>Xoá</Text>
                    </Pressable>
                </View>
            </View>
        ),
        [nav, storyId, storySlug, togglePublish, onDelete],
    );

    if (q.isLoading) return <Loading />;
    if (q.isError) return <ErrorView message={describeError(q.error)} onRetry={() => q.refetch()} />;

    const chapters = q.data ?? [];
    const sorted = [...chapters].sort((a, b) => b.order - a.order);

    return (
        <View style={styles.screen}>
            {storyTitle ? (
                <View style={styles.header}>
                    <Text numberOfLines={1} style={styles.headerTitle}>
                        {storyTitle}
                    </Text>
                    <Text style={styles.headerSub}>{chapters.length} chương</Text>
                </View>
            ) : null}
            <FlatList
                data={sorted}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={q.isRefetching}
                        onRefresh={() => q.refetch()}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <EmptyView
                        icon="document-outline"
                        message="Chưa có chương nào. Bấm + để thêm chương đầu tiên."
                    />
                }
            />
            <Pressable
                style={styles.fab}
                onPress={() => nav.navigate('CreateChapter', { storyId, storySlug })}
            >
                <Ionicons name="add" size={28} color={colors.white} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
        backgroundColor: colors.surfaceContainerLowest,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant,
    },
    headerTitle: { fontSize: fontSize.md, fontFamily: 'PlusJakartaSans_700Bold', color: colors.onSurface },
    headerSub: { fontSize: fontSize.xs, color: colors.onSurfaceVariant, marginTop: 2, fontFamily: 'DMSans_400Regular' },
    list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    orderBadge: {
        backgroundColor: colors.primaryContainer,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.sm,
        minWidth: 44,
        alignItems: 'center',
    },
    orderText: { color: colors.onPrimaryContainer, fontFamily: 'DMSans_700Bold', fontSize: fontSize.xs },
    info: { flex: 1, gap: 4 },
    title: { fontSize: fontSize.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: colors.onSurface },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
        flexWrap: 'wrap',
    },
    statusPill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        marginRight: spacing.xs,
    },
    statusText: { fontSize: 10, fontFamily: 'DMSans_700Bold' },
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
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
});
