import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useArtFeed, useArtStories, useCreateArtStory } from '@/lib/hooks/art';
import type { ArtPost } from '@/lib/api/art.service';
import { ArtCard } from '@/components/art/ArtCard';
import { ArtStoryRing } from '@/components/art/ArtStoryRing';
import { ArtCommentModal } from '@/components/art/ArtCommentModal';
import { ArtUploadModal } from '@/components/art/ArtUploadModal';

interface Props {
    currentUserId?: string;
    isLoggedIn: boolean;
}

function SkeletonPost() {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={[styles.skeletonCard, { backgroundColor: colors.surface }]}>
            <View style={styles.skeletonHeader}>
                <View style={[styles.skeletonAvatar, { backgroundColor: colors.surfaceVariant }]} />
                <View style={{ gap: 6, flex: 1 }}>
                    <View style={[styles.skeletonLine, { width: 100, backgroundColor: colors.surfaceVariant }]} />
                    <View style={[styles.skeletonLine, { width: 60, backgroundColor: colors.surfaceVariant }]} />
                </View>
            </View>
            <View style={[styles.skeletonImg, { backgroundColor: colors.surfaceVariant }]} />
            <View style={[styles.skeletonLine, { margin: spacing.lg, width: 140, backgroundColor: colors.surfaceVariant }]} />
        </View>
    );
}

export function ArtFeedScreen({ currentUserId, isLoggedIn }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [commentPost, setCommentPost] = useState<ArtPost | null>(null);
    const [showUpload, setShowUpload] = useState(false);

    const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useArtFeed();
    const { data: stories = [] } = useArtStories();
    const { mutate: createStory } = useCreateArtStory();

    const posts = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

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

    const renderHeader = () => (
        <>
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
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
        return (
            <View style={styles.empty}>
                <Ionicons name="image-outline" size={56} color={colors.outlineVariant} />
                <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>Chưa có bài đăng nào</Text>
                {isLoggedIn && (
                    <Text style={[styles.emptyHint, { color: colors.onSurfaceVariant }]}>Hãy là người đăng ảnh đầu tiên!</Text>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {isLoading ? (
                <>
                    {renderHeader()}
                    <SkeletonPost />
                    <SkeletonPost />
                </>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(p) => p.id}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    renderItem={({ item }) => (
                        <ArtCard
                            post={item}
                            currentUserId={currentUserId}
                            onComment={setCommentPost}
                        />
                    )}
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                    }}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <ActivityIndicator color={colors.primary} style={styles.loadMore} />
                        ) : null
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB đăng ảnh */}
            {isLoggedIn && (
                <Pressable style={[styles.fab, { backgroundColor: colors.surfaceContainerHighest }]} onPress={() => setShowUpload(true)}>
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
        container: { flex: 1 },
        listContent: { paddingBottom: 120 },
        storySection: { paddingVertical: spacing.md },
        divider: { height: StyleSheet.hairlineWidth, marginBottom: spacing.xs },
        center: { paddingVertical: spacing.xxl * 2, alignItems: 'center' },
        empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
        emptyText: { fontSize: 15, fontFamily: 'DMSans_500Medium' },
        emptyHint: { fontSize: 13, fontFamily: 'DMSans_400Regular', opacity: 0.7 },
        loadMore: { marginVertical: spacing.lg },
        fab: {
            position: 'absolute',
            bottom: 90,
            right: spacing.lg,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
        },
        skeletonCard: { marginBottom: spacing.sm },
        skeletonHeader: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, alignItems: 'center' },
        skeletonAvatar: { width: 36, height: 36, borderRadius: 18 },
        skeletonImg: { height: 280 },
        skeletonLine: { height: 12, borderRadius: radius.sm },
    });
