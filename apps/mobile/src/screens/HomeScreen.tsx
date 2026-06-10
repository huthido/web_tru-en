import React, { useCallback, useMemo, useState } from 'react';
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
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { RootNavigation } from '@/navigation/types';
import type { Story } from '@/lib/api/types';
import { useHomeStories } from '@/lib/hooks/stories';
import { useContinueReading } from '@/lib/hooks/library';
import { ProgressBar, SectionHeader } from '@/components/ui';
import { StoryCover } from '@/components/StoryCover';
import { StoryRow } from '@/components/StoryRow';
import { AdBanner } from '@/components/AdBanner';

// Danh mục trang chủ dạng chip (docs/Fix vài điểm trên app web.pdf) —
// chọn 1 chip hiển thị 1 lưới truyện thay vì 5 section xếp chồng.
const HOME_TABS = [
    { key: 'newest', label: 'Mới nhất' },
    { key: 'bestOfMonth', label: 'Hay nhất tháng' },
    { key: 'topRated', label: 'Đánh giá cao' },
    { key: 'recommended', label: 'Đề xuất' },
    { key: 'mostLiked', label: 'Yêu thích' },
] as const;

type HomeTabKey = (typeof HOME_TABS)[number]['key'];

export const HomeScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<HomeTabKey>('newest');

    const sections: Record<HomeTabKey, ReturnType<typeof useHomeStories>> = {
        newest: useHomeStories('newest'),
        recommended: useHomeStories('recommended'),
        bestOfMonth: useHomeStories('bestOfMonth'),
        topRated: useHomeStories('topRated'),
        mostLiked: useHomeStories('mostLiked'),
    };
    const activeSection = sections[activeTab];
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

            <AdBanner position="TOP" />

            {/* Chip danh mục — pill, active = filled tối (mock PDF) */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
            >
                {HOME_TABS.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                        <Pressable
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            style={[styles.chip, isActive && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Lưới truyện của danh mục đang chọn */}
            <StoryRow
                title=""
                stories={activeSection.data}
                loading={activeSection.isLoading}
                onPressStory={openStory}
                limit={12}
            />

            <AdBanner position="INLINE" />
        </ScrollView>
    );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    // Bottom padding lớn để không bị MainTabBar (~70px absolute) che — tab bar
    // floating phía dưới, content cuối ScrollView cần buffer.
    content: { paddingTop: spacing.lg, paddingBottom: 100 },
    section: { marginBottom: spacing.lg },
    crList: { paddingHorizontal: spacing.lg, gap: spacing.md },
    crCard: { width: 108 },
    crTitle: {
        marginTop: spacing.sm,
        ...typography.bodySm,
        fontFamily: 'DMSans_500Medium',
        color: colors.onSurface,
    },
    crChapter: { marginTop: 2, ...typography.bodySm, fontSize: fontSize.xs, color: colors.onSurfaceVariant },
    crProgress: { marginTop: spacing.xs },
    /* chip danh mục */
    chipScroll: { marginBottom: spacing.lg },
    chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    chip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    chipActive: {
        backgroundColor: colors.onSurface,
        borderColor: colors.onSurface,
    },
    chipText: {
        ...typography.labelMd,
        color: colors.onSurfaceVariant,
    },
    chipTextActive: {
        color: colors.background,
        fontFamily: 'DMSans_700Bold',
    },
});
