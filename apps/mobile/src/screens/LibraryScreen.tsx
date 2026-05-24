import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { RootNavigation } from '@/navigation/types';
import { timeAgo } from '@/lib/format';
import {
    useClearHistory,
    useMyFollows,
    useReadingHistory,
} from '@/lib/hooks/library';
import { describeError } from '@/lib/error';
import { EmptyView, ErrorView, Loading } from '@/components/ui';
import { StoryListItem } from '@/components/StoryListItem';

type Tab = 'follows' | 'history';

function SegButton({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable style={[styles.seg, active && styles.segActive]} onPress={onPress}>
            <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
        </Pressable>
    );
}

export const LibraryScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();
    const [tab, setTab] = useState<Tab>('follows');

    const follows = useMyFollows();
    const history = useReadingHistory();
    const clearHistory = useClearHistory();

    const followItems = useMemo(
        () => follows.data?.pages.flatMap((p) => p.data) ?? [],
        [follows.data],
    );
    const historyItems = useMemo(
        () => history.data?.pages.flatMap((p) => p.data) ?? [],
        [history.data],
    );

    const confirmClear = () => {
        Alert.alert('Xoá lịch sử đọc', 'Toàn bộ lịch sử đọc sẽ bị xoá. Tiếp tục?', [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Xoá', style: 'destructive', onPress: () => clearHistory.mutate() },
        ]);
    };

    return (
        <View style={styles.screen}>
            <View style={styles.tabs}>
                <SegButton
                    label="Đang theo dõi"
                    active={tab === 'follows'}
                    onPress={() => setTab('follows')}
                />
                <SegButton
                    label="Lịch sử đọc"
                    active={tab === 'history'}
                    onPress={() => setTab('history')}
                />
            </View>

            {tab === 'follows' ? (
                <FlatList
                    data={followItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <StoryListItem
                            title={item.story?.title ?? 'Truyện'}
                            coverImage={item.story?.coverImage}
                            line2={item.story?.authorName ?? undefined}
                            line3={
                                item.story?.lastChapterAt
                                    ? `Cập nhật ${timeAgo(item.story.lastChapterAt)}`
                                    : undefined
                            }
                            onPress={() =>
                                item.story?.slug &&
                                nav.navigate('StoryDetail', { slug: item.story.slug })
                            }
                        />
                    )}
                    onEndReachedThreshold={0.5}
                    onEndReached={() => {
                        if (follows.hasNextPage && !follows.isFetchingNextPage) {
                            follows.fetchNextPage();
                        }
                    }}
                    ListEmptyComponent={
                        follows.isLoading ? (
                            <Loading />
                        ) : follows.isError ? (
                            <ErrorView
                                message={describeError(follows.error)}
                                onRetry={() => follows.refetch()}
                            />
                        ) : (
                            <EmptyView
                                icon="bookmark-outline"
                                message="Bạn chưa theo dõi truyện nào"
                            />
                        )
                    }
                    ListFooterComponent={
                        follows.isFetchingNextPage ? (
                            <ActivityIndicator color={colors.primary} style={styles.footer} />
                        ) : null
                    }
                    contentContainerStyle={
                        followItems.length === 0 ? styles.emptyContent : styles.listContent
                    }
                />
            ) : (
                <FlatList
                    data={historyItems}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        historyItems.length > 0 ? (
                            <Pressable style={styles.clearBtn} onPress={confirmClear}>
                                <Ionicons
                                    name="trash-outline"
                                    size={15}
                                    color={colors.danger}
                                />
                                <Text style={styles.clearText}>Xoá lịch sử</Text>
                            </Pressable>
                        ) : null
                    }
                    renderItem={({ item }) => {
                        const storySlug = item.story?.slug;
                        const chapterSlug = item.chapter?.slug;
                        return (
                            <StoryListItem
                                title={item.story?.title ?? 'Truyện'}
                                coverImage={item.story?.coverImage}
                                line2={
                                    item.chapter?.title
                                        ? `Đang đọc: ${item.chapter.title}`
                                        : undefined
                                }
                                line3={timeAgo(item.lastRead)}
                                progress={item.storyProgress ?? item.progress}
                                onPress={() =>
                                    storySlug &&
                                    chapterSlug &&
                                    nav.navigate('Reader', { storySlug, chapterSlug })
                                }
                            />
                        );
                    }}
                    onEndReachedThreshold={0.5}
                    onEndReached={() => {
                        if (history.hasNextPage && !history.isFetchingNextPage) {
                            history.fetchNextPage();
                        }
                    }}
                    ListEmptyComponent={
                        history.isLoading ? (
                            <Loading />
                        ) : history.isError ? (
                            <ErrorView
                                message={describeError(history.error)}
                                onRetry={() => history.refetch()}
                            />
                        ) : (
                            <EmptyView icon="time-outline" message="Chưa có lịch sử đọc" />
                        )
                    }
                    ListFooterComponent={
                        history.isFetchingNextPage ? (
                            <ActivityIndicator color={colors.primary} style={styles.footer} />
                        ) : null
                    }
                    contentContainerStyle={
                        historyItems.length === 0 ? styles.emptyContent : styles.listContent
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    tabs: {
        flexDirection: 'row',
        gap: spacing.sm,
        padding: spacing.lg,
        paddingBottom: spacing.sm,
    },
    seg: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceContainerLowest,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    segActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    segText: { fontSize: fontSize.sm, fontFamily: 'DMSans_500Medium', color: colors.onSurfaceVariant },
    segTextActive: { color: colors.onPrimary, fontFamily: 'DMSans_700Bold' },
    // PaddingBottom 100 chừa MainTabBar floating.
    listContent: { paddingVertical: spacing.sm, paddingBottom: 100 },
    emptyContent: { flexGrow: 1 },
    footer: { marginVertical: spacing.lg },
    clearBtn: {
        flexDirection: 'row',
        alignSelf: 'flex-end',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    clearText: { color: colors.error, fontSize: fontSize.sm, fontFamily: 'DMSans_700Bold' },
});
