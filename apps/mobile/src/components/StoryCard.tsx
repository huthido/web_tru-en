import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, typography } from '../theme';
import { formatRating } from '../lib/format';
import { StoryCover } from './StoryCover';

/** Minimal shape a poster card needs — satisfied by Story and StoryRef. */
export interface StoryCardData {
    title: string;
    coverImage?: string | null;
    authorName?: string | null;
    author?: { displayName?: string | null; username?: string } | null;
    rating?: number;
}

interface Props {
    data: StoryCardData;
    width?: number;
    onPress: () => void;
}

/** Vertical poster card used in horizontal rows and grids. */
export function StoryCard({ data, width = 118, onPress }: Props) {
    const author =
        data.authorName ||
        data.author?.displayName ||
        data.author?.username ||
        'Đang cập nhật';
    return (
        <Pressable style={{ width }} onPress={onPress}>
            <StoryCover uri={data.coverImage} width={width} />
            <Text numberOfLines={2} style={styles.title}>
                {data.title}
            </Text>
            <Text numberOfLines={1} style={styles.author}>
                {author}
            </Text>
            <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color={colors.star} />
                <Text style={styles.rating}>{formatRating(data.rating)}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    title: {
        marginTop: spacing.sm,
        ...typography.bodySm,
        fontFamily: 'DMSans_500Medium',
        color: colors.onSurface,
    },
    author: {
        marginTop: 2,
        ...typography.bodySm,
        fontSize: fontSize.xs,
        color: colors.onSurfaceVariant,
    },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    rating: { ...typography.bodySm, fontSize: fontSize.xs, color: colors.onSurfaceVariant },
});
