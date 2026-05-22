import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { Story } from '../lib/api/types';
import { SectionHeader } from './ui';
import { StoryCard } from './StoryCard';

interface Props {
    title: string;
    stories?: Story[];
    loading?: boolean;
    onPressStory: (story: Story) => void;
    onSeeAll?: () => void;
}

/** A titled horizontally-scrolling row of story poster cards. */
export function StoryRow({ title, stories, loading, onPressStory, onSeeAll }: Props) {
    if (!loading && (!stories || stories.length === 0)) return null;

    return (
        <View style={styles.wrap}>
            <SectionHeader title={title} onSeeAll={onSeeAll} />
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    horizontal
                    data={stories}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <StoryCard data={item} onPress={() => onPressStory(item)} />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginBottom: spacing.lg },
    loader: { height: 210, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: spacing.lg, gap: spacing.md },
});
