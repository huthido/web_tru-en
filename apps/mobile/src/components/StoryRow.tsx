import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
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
}

/** 2-column grid of story cards — matches web mobile BookSection layout. */
export function StoryRow({ title, stories, loading, onPressStory, onSeeAll }: Props) {
    if (!loading && (!stories || stories.length === 0)) return null;

    const displayed = stories?.slice(0, 4) ?? [];

    return (
        <View style={styles.wrap}>
            <SectionHeader title={title} onSeeAll={onSeeAll} />
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

const styles = StyleSheet.create({
    wrap: { marginBottom: spacing.xl, paddingHorizontal: H_PAD },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    skeleton: {
        width: CARD_WIDTH,
        height: SKELETON_H,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceVariant,
    },
});
