import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import { ProgressBar } from './ui';
import { StoryCover } from './StoryCover';

interface Props {
    title: string;
    coverImage?: string | null;
    /** Secondary line — author name or current chapter. */
    line2?: string;
    /** Tertiary line — meta (views, rating, updated time). */
    line3?: string;
    /** When set (0-100), renders a progress bar below the text. */
    progress?: number;
    onPress: () => void;
}

/** Horizontal list row: small cover + up to three text lines. */
export function StoryListItem({ title, coverImage, line2, line3, progress, onPress }: Props) {
    return (
        <Pressable style={styles.row} onPress={onPress}>
            <StoryCover uri={coverImage} width={54} rounded={radius.sm} />
            <View style={styles.body}>
                <Text numberOfLines={2} style={styles.title}>
                    {title}
                </Text>
                {line2 ? (
                    <Text numberOfLines={1} style={styles.line2}>
                        {line2}
                    </Text>
                ) : null}
                {line3 ? (
                    <Text numberOfLines={1} style={styles.line3}>
                        {line3}
                    </Text>
                ) : null}
                {typeof progress === 'number' ? (
                    <View style={styles.progress}>
                        <ProgressBar value={progress} />
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
    },
    body: { flex: 1, justifyContent: 'center', gap: 2 },
    title: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, lineHeight: 20 },
    line2: { fontSize: fontSize.sm, color: colors.textMuted },
    line3: { fontSize: fontSize.xs, color: colors.textMuted },
    progress: { marginTop: 4 },
});
