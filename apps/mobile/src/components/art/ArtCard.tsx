import React, { useMemo } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { ArtPost } from '@/lib/api/art.service';
import type { RootNavigation } from '@/navigation/types';
import { useToggleArtLike, useDeleteArtPost } from '@/lib/hooks/art';

const COLUMN_GAP = spacing.sm;
const H_PADDING = spacing.lg * 2;

interface Props {
    post: ArtPost;
    currentUserId?: string;
    onComment: (post: ArtPost) => void;
}

export function ArtCard({ post, currentUserId, onComment }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const nav = useNavigation<RootNavigation>();

    const colWidth = (Dimensions.get('window').width - H_PADDING - COLUMN_GAP) / 2;
    const aspectRatio = post.width && post.height ? post.width / post.height : 3 / 4;
    const imgHeight = colWidth / aspectRatio;

    const { mutate: toggleLike } = useToggleArtLike();
    const { mutate: deletePost } = useDeleteArtPost();

    const isOwner = currentUserId === post.user.id;

    return (
        <View style={styles.card}>
            <Image
                source={{ uri: post.imageUrl }}
                style={[styles.image, { width: colWidth, height: imgHeight }]}
                resizeMode="cover"
            />

            {/* Caption */}
            {post.caption ? (
                <Text style={styles.caption} numberOfLines={2}>
                    {post.caption}
                </Text>
            ) : null}

            {/* Author row */}
            <Pressable
                style={styles.authorRow}
                onPress={() => nav.navigate('UserProfile', { username: post.user.username })}
            >
                <Ionicons name="person-circle-outline" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.authorName} numberOfLines={1}>
                    {post.user.displayName || post.user.username}
                </Text>
            </Pressable>

            {/* Action row */}
            <View style={styles.actionRow}>
                <Pressable style={styles.actionBtn} onPress={() => toggleLike(post.id)}>
                    <Ionicons
                        name={post.likedByMe ? 'heart' : 'heart-outline'}
                        size={16}
                        color={post.likedByMe ? '#e05080' : colors.onSurfaceVariant}
                    />
                    <Text style={styles.actionCount}>{post.likeCount}</Text>
                </Pressable>

                <Pressable style={styles.actionBtn} onPress={() => onComment(post)}>
                    <Ionicons name="chatbubble-outline" size={15} color={colors.onSurfaceVariant} />
                    <Text style={styles.actionCount}>{post.commentCount}</Text>
                </Pressable>

                {isOwner && (
                    <Pressable
                        style={[styles.actionBtn, { marginLeft: 'auto' }]}
                        onPress={() => deletePost(post.id)}
                    >
                        <Ionicons name="trash-outline" size={15} color={colors.error} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radius.md,
            overflow: 'hidden',
            marginBottom: COLUMN_GAP,
        },
        image: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
        caption: {
            fontSize: 12,
            color: colors.onSurface,
            fontFamily: 'DMSans_400Regular',
            paddingHorizontal: spacing.sm,
            paddingTop: spacing.xs,
            lineHeight: 17,
        },
        authorRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing.sm,
            paddingTop: 4,
        },
        authorName: {
            fontSize: 11,
            color: colors.onSurfaceVariant,
            fontFamily: 'DMSans_500Medium',
            flex: 1,
        },
        actionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        actionCount: { fontSize: 11, color: colors.onSurfaceVariant, fontFamily: 'DMSans_400Regular' },
    });
