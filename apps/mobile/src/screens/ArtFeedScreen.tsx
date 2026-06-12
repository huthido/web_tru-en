import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useArtFeed, useArtStories, useCreateArtStory } from '@/lib/hooks/art';
import type { ArtPost } from '@/lib/api/art.service';
import { ArtCard } from '@/components/art/ArtCard';
import { ArtStoryRing } from '@/components/art/ArtStoryRing';
import { ArtCommentModal } from '@/components/art/ArtCommentModal';
import { ArtUploadModal } from '@/components/art/ArtUploadModal';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

interface Props {
    currentUserId?: string;
    isLoggedIn: boolean;
}

const GAP = spacing.sm;
const H_PAD = spacing.lg;

export function ArtFeedScreen({ currentUserId, isLoggedIn }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [commentPost, setCommentPost] = useState<ArtPost | null>(null);
    const [showUpload, setShowUpload] = useState(false);

    const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useArtFeed();
    const { data: stories = [] } = useArtStories();
    const { mutate: createStory } = useCreateArtStory();

    const posts = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

    // Split posts into 2 columns (true masonry)
    const [leftPosts, rightPosts] = useMemo(() => {
        const left: ArtPost[] = [];
        const right: ArtPost[] = [];
        posts.forEach((p, i) => (i % 2 === 0 ? left : right).push(p));
        return [left, right];
    }, [posts]);

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 400;
        if (nearBottom && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const handleAddStory = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh trong Cài đặt.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            createStory({ uri: asset.uri, name: 'story.jpg', type: asset.mimeType ?? 'image/jpeg' });
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                onScroll={handleScroll}
                scrollEventThrottle={200}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Story ring */}
                {(isLoggedIn || stories.length > 0) && (
                    <View style={styles.storySection}>
                        <ArtStoryRing
                            stories={stories}
                            isLoggedIn={isLoggedIn}
                            onAddStory={isLoggedIn ? handleAddStory : undefined}
                        />
                    </View>
                )}

                {/* Header */}
                <View style={styles.feedHeader}>
                    <Text style={styles.feedTitle}>Cộng đồng nghệ thuật</Text>
                    {isLoggedIn && (
                        <Pressable style={styles.uploadBtn} onPress={() => setShowUpload(true)}>
                            <Ionicons name="add" size={16} color={colors.onSurface} />
                            <Text style={styles.uploadBtnText}>Đăng ảnh</Text>
                        </Pressable>
                    )}
                </View>

                {/* Loading state */}
                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                ) : posts.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Ionicons name="image-outline" size={56} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>Chưa có bài đăng nào</Text>
                        {isLoggedIn && (
                            <Text style={styles.emptyHint}>Hãy là người đăng ảnh đầu tiên!</Text>
                        )}
                    </View>
                ) : (
                    /* Masonry 2 columns */
                    <View style={styles.masonryRow}>
                        <View style={styles.col}>
                            {leftPosts.map((p) => (
                                <ArtCard
                                    key={p.id}
                                    post={p}
                                    currentUserId={currentUserId}
                                    onComment={setCommentPost}
                                />
                            ))}
                        </View>
                        <View style={styles.col}>
                            {rightPosts.map((p) => (
                                <ArtCard
                                    key={p.id}
                                    post={p}
                                    currentUserId={currentUserId}
                                    onComment={setCommentPost}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {isFetchingNextPage && (
                    <ActivityIndicator color={colors.primary} style={styles.loadMore} />
                )}
            </ScrollView>

            {/* FAB */}
            {isLoggedIn && (
                <Pressable style={styles.fab} onPress={() => setShowUpload(true)}>
                    <Ionicons name="add" size={28} color={colors.onSurface} />
                </Pressable>
            )}

            <ArtCommentModal
                post={commentPost}
                onClose={() => setCommentPost(null)}
                isLoggedIn={isLoggedIn}
            />

            {showUpload && <ArtUploadModal onClose={() => setShowUpload(false)} />}
        </View>
    );
}

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollContent: { paddingBottom: 120 },
        storySection: { paddingVertical: spacing.md },
        feedHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: H_PAD,
            paddingBottom: spacing.md,
        },
        feedTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: colors.onSurface },
        uploadBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceContainerHighest,
        },
        uploadBtnText: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: colors.onSurface },
        loadingWrap: { alignItems: 'center', paddingVertical: spacing.xxl * 2 },
        emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl * 2, gap: spacing.sm },
        emptyText: { fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.onSurfaceVariant },
        emptyHint: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: colors.onSurfaceVariant },
        masonryRow: {
            flexDirection: 'row',
            paddingHorizontal: H_PAD,
            gap: GAP,
        },
        col: { flex: 1 },
        loadMore: { marginVertical: spacing.lg },
        fab: {
            position: 'absolute',
            bottom: 90,
            right: spacing.lg,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.surfaceContainerHighest,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
        },
    });
