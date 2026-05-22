import React, { useCallback, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, spacing } from '@/theme';
import type { RootNavigation } from '@/navigation/types';
import type { Story } from '@/lib/api/types';
import { useHomeStories } from '@/lib/hooks/stories';
import { useContinueReading } from '@/lib/hooks/library';
import { ProgressBar, SectionHeader } from '@/components/ui';
import { StoryCover } from '@/components/StoryCover';
import { StoryRow } from '@/components/StoryRow';

export const HomeScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

    const newest = useHomeStories('newest');
    const recommended = useHomeStories('recommended');
    const bestOfMonth = useHomeStories('bestOfMonth');
    const topRated = useHomeStories('topRated');
    const mostLiked = useHomeStories('mostLiked');
    const continueReading = useContinueReading(10);

    const openStory = useCallback(
        (story: Story) => nav.navigate('StoryDetail', { slug: story.slug }),
        [nav],
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            qc.invalidateQueries({ queryKey: ['stories', 'home'] }),
            qc.invalidateQueries({ queryKey: ['continue-reading'] }),
        ]);
        setRefreshing(false);
    }, [qc]);

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
            {continueReading.data && continueReading.data.length > 0 ? (
                <View style={styles.section}>
                    <SectionHeader title="Đọc tiếp" />
                    <FlatList
                        horizontal
                        data={continueReading.data}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.crList}
                        renderItem={({ item }) => {
                            const storySlug = item.story?.slug;
                            const chapterSlug = item.chapter?.slug;
                            return (
                                <Pressable
                                    style={styles.crCard}
                                    disabled={!storySlug || !chapterSlug}
                                    onPress={() =>
                                        storySlug &&
                                        chapterSlug &&
                                        nav.navigate('Reader', { storySlug, chapterSlug })
                                    }
                                >
                                    <StoryCover uri={item.story?.coverImage} width={108} />
                                    <Text numberOfLines={2} style={styles.crTitle}>
                                        {item.story?.title ?? 'Truyện'}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.crChapter}>
                                        {item.chapter?.title ?? ''}
                                    </Text>
                                    <View style={styles.crProgress}>
                                        <ProgressBar
                                            value={item.storyProgress ?? item.progress ?? 0}
                                        />
                                    </View>
                                </Pressable>
                            );
                        }}
                    />
                </View>
            ) : null}

            <StoryRow
                title="Mới cập nhật"
                stories={newest.data}
                loading={newest.isLoading}
                onPressStory={openStory}
            />
            <StoryRow
                title="Đề xuất cho bạn"
                stories={recommended.data}
                loading={recommended.isLoading}
                onPressStory={openStory}
            />
            <StoryRow
                title="Hay nhất tháng"
                stories={bestOfMonth.data}
                loading={bestOfMonth.isLoading}
                onPressStory={openStory}
            />
            <StoryRow
                title="Đánh giá cao"
                stories={topRated.data}
                loading={topRated.isLoading}
                onPressStory={openStory}
            />
            <StoryRow
                title="Được yêu thích"
                stories={mostLiked.data}
                loading={mostLiked.isLoading}
                onPressStory={openStory}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
    section: { marginBottom: spacing.lg },
    crList: { paddingHorizontal: spacing.lg, gap: spacing.md },
    crCard: { width: 108 },
    crTitle: {
        marginTop: spacing.sm,
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 18,
    },
    crChapter: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
    crProgress: { marginTop: spacing.xs },
});
