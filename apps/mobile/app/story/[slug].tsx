import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    FlatList,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { storyService, Story, ChapterListItem } from '../../src/services';
import { useAuth } from '../../src/contexts';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function StoryDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const { user } = useAuth();
    const [showAllChapters, setShowAllChapters] = useState(false);

    const {
        data: story,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['story', slug],
        queryFn: () => storyService.getBySlug(slug!),
        enabled: !!slug,
    });

    const { data: chapters = [] } = useQuery({
        queryKey: ['chapters', story?.id],
        queryFn: () => storyService.getChapters(story!.id),
        enabled: !!story?.id,
    });

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (error || !story) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Không tìm thấy truyện</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const displayedChapters = showAllChapters ? chapters : chapters.slice(0, 10);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTransparent: true,
                    headerTitle: '',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ),
                }}
            />
            <ScrollView style={styles.container}>
                {/* Cover Image */}
                <View style={styles.coverContainer}>
                    <Image
                        source={{
                            uri: story.cover || 'https://via.placeholder.com/400x600?text=No+Cover',
                        }}
                        style={styles.coverImage}
                        resizeMode="cover"
                    />
                    <View style={styles.coverOverlay} />
                </View>

                {/* Story Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.title}>{story.title}</Text>
                    <Text style={styles.author}>✍️ {story.author?.displayName || 'Unknown'}</Text>

                    {/* Genres */}
                    <View style={styles.genresContainer}>
                        {story.genres?.map((genre) => (
                            <View key={genre.id} style={styles.genreTag}>
                                <Text style={styles.genreText}>{genre.name}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{story.viewCount || 0}</Text>
                            <Text style={styles.statLabel}>Lượt xem</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{story.likeCount || 0}</Text>
                            <Text style={styles.statLabel}>Lượt thích</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{story._count?.chapters || 0}</Text>
                            <Text style={styles.statLabel}>Chương</Text>
                        </View>
                    </View>

                    {/* Description */}
                    {story.description && (
                        <View style={styles.descriptionContainer}>
                            <Text style={styles.sectionTitle}>Giới thiệu</Text>
                            <Text style={styles.description}>{story.description}</Text>
                        </View>
                    )}

                    {/* Chapters List */}
                    <View style={styles.chaptersContainer}>
                        <Text style={styles.sectionTitle}>Danh sách chương</Text>
                        {displayedChapters.map((chapter) => (
                            <TouchableOpacity
                                key={chapter.id}
                                style={styles.chapterItem}
                                onPress={() => router.push(`/chapter/${chapter.id}`)}
                            >
                                <Text style={styles.chapterNumber}>Chương {chapter.chapterNumber}</Text>
                                <Text style={styles.chapterTitle} numberOfLines={1}>
                                    {chapter.title}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#64748b" />
                            </TouchableOpacity>
                        ))}

                        {chapters.length > 10 && !showAllChapters && (
                            <TouchableOpacity
                                style={styles.showMoreButton}
                                onPress={() => setShowAllChapters(true)}
                            >
                                <Text style={styles.showMoreText}>
                                    Xem tất cả {chapters.length} chương
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Fixed Bottom Button */}
            {chapters.length > 0 && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={styles.readButton}
                        onPress={() => router.push(`/chapter/${chapters[0].id}`)}
                    >
                        <Text style={styles.readButtonText}>Bắt đầu đọc</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 20,
    },
    errorText: {
        color: '#f87171',
        fontSize: 18,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    headerButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    coverContainer: {
        height: 400,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
        backgroundColor: 'transparent',
        // Gradient effect
    },
    infoContainer: {
        padding: 20,
        marginTop: -50,
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
    },
    author: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 16,
    },
    genresContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    genreTag: {
        backgroundColor: '#334155',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    genreText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    statLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    descriptionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#94a3b8',
        lineHeight: 22,
    },
    chaptersContainer: {
        marginBottom: 24,
    },
    chapterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    chapterNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3b82f6',
        width: 80,
    },
    chapterTitle: {
        flex: 1,
        fontSize: 14,
        color: '#e2e8f0',
    },
    showMoreButton: {
        alignItems: 'center',
        padding: 16,
    },
    showMoreText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    bottomPadding: {
        height: 100,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f172a',
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
    },
    readButton: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    readButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
