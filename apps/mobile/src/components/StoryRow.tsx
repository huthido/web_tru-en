import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { radius, spacing, type ThemeColors } from '../theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { Story } from '../lib/api/types';
import { SectionHeader } from './ui';
import { StoryCard } from './StoryCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD = spacing.lg;
const GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GAP) / 2;

interface Props {
    title: string;
    stories?: Story[];
    loading?: boolean;
    onPressStory: (story: Story) => void;
    onSeeAll?: () => void;
    /** Số card tối đa (mặc định 4). Trang chủ chip-mode dùng limit lớn hơn. */
    limit?: number;
}

/** 2-column grid of story cards — matches web mobile BookSection layout. */
export function StoryRow({ title, stories, loading, onPressStory, onSeeAll, limit = 4 }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    if (!loading && (!stories || stories.length === 0)) return null;

    const displayed = stories?.slice(0, limit) ?? [];

    return (
        <View style={styles.wrap}>
            {/* title rỗng = danh mục đã chọn bằng chip phía trên, bỏ heading */}
            {title ? <SectionHeader title={title} onSeeAll={onSeeAll} /> : null}
            <View style={styles.grid}>
                {loading
                    ? [...Array(4)].map((_, i) => (
                          <View key={i} style={styles.skeleton} />
                      ))
                    : displayed.map((item) => (
                          <StoryCard
                              key={item.id}
                              data={item}
                              width={CARD_WIDTH}
                              onPress={() => onPressStory(item)}
                          />
                      ))}
            </View>
        </View>
    );
}

const SKELETON_H = Math.round((CARD_WIDTH * 4) / 3) + 56;

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    wrap: { marginBottom: spacing.xl, paddingHorizontal: H_PAD },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    skeleton: {
        width: CARD_WIDTH,
        height: SKELETON_H,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceVariant,
    },
});
