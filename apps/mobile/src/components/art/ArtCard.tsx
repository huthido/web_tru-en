import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { ArtPost } from '@/lib/api/art.service';
import type { RootNavigation } from '@/navigation/types';
import { useToggleArtLike, useDeleteArtPost } from '@/lib/hooks/art';

interface Props {
    post: ArtPost;
    currentUserId?: string;
    onComment: (post: ArtPost) => void;
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} ngày trước`;
    return new Date(iso).toLocaleDateString('vi-VN');
}

function formatNum(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

export function ArtCard({ post, currentUserId, onComment }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const nav = useNavigation<RootNavigation>();

    const screenWidth = Dimensions.get('window').width;
    const aspectRatio = post.width && post.height ? post.width / post.height : 1;
    const imgHeight = Math.min(screenWidth / aspectRatio, 500);

    const { mutate: toggleLike } = useToggleArtLike();
    const { mutate: deletePost } = useDeleteArtPost();

    const isOwner = currentUserId === post.user.id;
    const authorName = post.user.displayName || post.user.username;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    style={styles.authorRow}
                    onPress={() => nav.navigate('UserProfile', { username: post.user.username })}
                >
                    {post.user.avatar ? (
                        <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                                {authorName[0]?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.authorInfo}>
                        <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
                        <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
                    </View>
                </Pressable>

                {isOwner && (
                    <Pressable
                        onPress={() => deletePost(post.id)}
                        hitSlop={10}
                        style={styles.menuBtn}
                    >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                )}
            </View>

            {/* Image — double tap to like */}
            <Pressable onPress={() => currentUserId && toggleLike(post.id)}>
                <Image
                    source={{ uri: post.imageUrl }}
                    style={{ width: screenWidth, height: imgHeight }}
                    resizeMode="cover"
                />
            </Pressable>

            {/* Actions */}
            <View style={styles.actions}>
                <Pressable
                    style={styles.actionBtn}
                    onPress={() => currentUserId && toggleLike(post.id)}
                >
                    <Ionicons
                        name={post.likedByMe ? 'heart' : 'heart-outline'}
                        size={24}
                        color={post.likedByMe ? '#e05080' : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.actionCount, post.likedByMe && { color: '#e05080' }]}>
                        {formatNum(post.likeCount)}
                    </Text>
                </Pressable>

                <Pressable style={styles.actionBtn} onPress={() => onComment(post)}>
                    <Ionicons name="chatbubble-outline" size={22} color={colors.onSurfaceVariant} />
                    <Text style={styles.actionCount}>{formatNum(post.commentCount)}</Text>
                </Pressable>
            </View>

            {/* Caption */}
            <View style={styles.captionWrap}>
                {post.caption ? (
                    <Text style={styles.caption}>
                        <Text style={styles.captionAuthor}>{authorName} </Text>
                        {post.caption}
                    </Text>
                ) : null}

                {post.commentCount > 0 && (
                    <Pressable onPress={() => onComment(post)}>
                        <Text style={styles.commentLink}>
                            Xem tất cả {formatNum(post.commentCount)} bình luận
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            backgroundColor: colors.surface,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outlineVariant,
            marginBottom: spacing.sm,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
        },
        authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
        avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
        avatarFallback: {
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarLetter: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
        authorInfo: { flex: 1 },
        authorName: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: colors.onSurface },
        timeAgo: { fontSize: 11, color: colors.onSurfaceVariant, fontFamily: 'DMSans_400Regular' },
        menuBtn: { padding: spacing.xs },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
        },
        actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
        actionCount: { fontSize: 14, color: colors.onSurfaceVariant, fontFamily: 'DMSans_500Medium' },
        captionWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 4 },
        caption: { fontSize: 13, color: colors.onSurface, fontFamily: 'DMSans_400Regular', lineHeight: 19 },
        captionAuthor: { fontFamily: 'DMSans_700Bold' },
        commentLink: { fontSize: 13, color: colors.onSurfaceVariant, fontFamily: 'DMSans_400Regular' },
    });
