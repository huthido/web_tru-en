import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { radius, spacing, type ThemeColors } from '../theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { Story } from '../lib/api/types';
import { SectionHeader } from './ui';
import { StoryCard } from './StoryCard';

const H_PAD = spacing.lg;
const GAP = spacing.md;
/** Bề rộng card "đẹp nhất" — dùng để suy ra số cột theo bề ngang màn hình. */
const TARGET_CARD_W = 190;

interface Props {
    title: string;
    stories?: Story[];
    loading?: boolean;
    onPressStory: (story: Story) => void;
    onSeeAll?: () => void;
    /** Số card tối đa (mặc định 4). Trang chủ chip-mode dùng limit lớn hơn. */
    limit?: number;
}

/**
 * Grid card truyện — 2 cột trên điện thoại dọc, tự tăng cột khi xoay ngang hoặc
 * chạy trên tablet / cửa sổ chia đôi (Android 16 bỏ qua khoá hướng ở màn lớn).
 */
export function StoryRow({ title, stories, loading, onPressStory, onSeeAll, limit = 4 }: Props) {
    const { colors } = useAppTheme();
    const { width } = useWindowDimensions();

    const { columns, cardWidth } = useMemo(() => {
        const available = width - H_PAD * 2;
        const cols = Math.max(2, Math.floor((available + GAP) / (TARGET_CARD_W + GAP)));
        return { columns: cols, cardWidth: (available - GAP * (cols - 1)) / cols };
    }, [width]);

    const styles = useMemo(() => makeStyles(colors, cardWidth), [colors, cardWidth]);

    if (!loading && (!stories || stories.length === 0)) return null;

    const displayed = stories?.slice(0, limit) ?? [];

    return (
        <View style={styles.wrap}>
            {/* title rỗng = danh mục đã chọn bằng chip phía trên, bỏ heading */}
            {title ? <SectionHeader title={title} onSeeAll={onSeeAll} /> : null}
            <View style={styles.grid}>
                {loading
                    ? [...Array(columns)].map((_, i) => (
                          <View key={i} style={styles.skeleton} />
                      ))
                    : displayed.map((item) => (
                          <StoryCard
                              key={item.id}
                              data={item}
                              width={cardWidth}
                              onPress={() => onPressStory(item)}
                          />
                      ))}
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, cardWidth: number) => StyleSheet.create({
    wrap: { marginBottom: spacing.xl, paddingHorizontal: H_PAD },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    skeleton: {
        width: cardWidth,
        height: Math.round((cardWidth * 4) / 3) + 56,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceVariant,
    },
});
