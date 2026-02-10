import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { storyService, Story } from '../../src/services';
import { Ionicons } from '@expo/vector-icons';
import { useDebouncedCallback } from 'use-debounce';

export default function SearchScreen() {
    const [query, setQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        setSearchQuery(value);
    }, 300);

    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        debouncedSearch(text);
    }, []);

    const { data: results, isLoading } = useQuery({
        queryKey: ['search', searchQuery],
        queryFn: () => storyService.search(searchQuery),
        enabled: searchQuery.length >= 2,
    });

    const renderStoryItem = ({ item }: { item: Story }) => (
        <TouchableOpacity
            style={styles.storyItem}
            onPress={() => router.push(`/story/${item.slug}`)}
        >
            <Image
                source={{
                    uri: item.cover || 'https://via.placeholder.com/80x120?text=No+Cover',
                }}
                style={styles.storyCover}
                resizeMode="cover"
            />
            <View style={styles.storyInfo}>
                <Text style={styles.storyTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                <Text style={styles.storyAuthor} numberOfLines={1}>
                    {item.author?.displayName || 'Unknown'}
                </Text>
                <View style={styles.storyStats}>
                    <Text style={styles.storyStat}>👁 {item.viewCount || 0}</Text>
                    <Text style={styles.storyStat}>📖 {item._count?.chapters || 0} chương</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tìm kiếm</Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm truyện theo tên..."
                    placeholderTextColor="#64748b"
                    value={query}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={20} color="#64748b" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Results */}
            {isLoading ? (
                <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
            ) : searchQuery.length < 2 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={64} color="#334155" />
                    <Text style={styles.emptyText}>Nhập ít nhất 2 ký tự để tìm kiếm</Text>
                </View>
            ) : results?.data?.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="sad-outline" size={64} color="#334155" />
                    <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                </View>
            ) : (
                <FlatList
                    data={results?.data || []}
                    renderItem={renderStoryItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#f8fafc',
    },
    loader: {
        marginTop: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 16,
        marginTop: 16,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    storyItem: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    storyCover: {
        width: 80,
        height: 120,
        borderRadius: 8,
        backgroundColor: '#334155',
    },
    storyInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    storyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 4,
    },
    storyAuthor: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 8,
    },
    storyStats: {
        flexDirection: 'row',
        gap: 16,
    },
    storyStat: {
        fontSize: 12,
        color: '#64748b',
    },
});
