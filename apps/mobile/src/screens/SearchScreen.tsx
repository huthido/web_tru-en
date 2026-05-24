import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { RootNavigation } from '@/navigation/types';
import type { Story } from '@/lib/api/types';
import { useCategories } from '@/lib/hooks/categories';
import { useStorySearch } from '@/lib/hooks/search';
import { describeError } from '@/lib/error';
import { formatCount, formatRating } from '@/lib/format';
import { EmptyView, ErrorView, Loading } from '@/components/ui';
import { StoryListItem } from '@/components/StoryListItem';

export const SearchScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [category, setCategory] = useState<string | undefined>(undefined);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(query), 350);
        return () => clearTimeout(t);
    }, [query]);

    const categories = useCategories();
    const search = useStorySearch(debounced, category);

    const stories: Story[] = useMemo(
        () => search.data?.pages.flatMap((p) => p.data) ?? [],
        [search.data],
    );
    const active = debounced.trim().length >= 2 || !!category;

    const onChangeQuery = (text: string) => {
        setQuery(text);
        if (text.trim().length > 0) setCategory(undefined);
    };

    const onPickCategory = (slug: string) => {
        setCategory((cur) => (cur === slug ? undefined : slug));
        setQuery('');
        setDebounced('');
    };

    return (
        <View style={styles.screen}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                    style={styles.input}
                    placeholder="Tìm truyện, tác giả..."
                    placeholderTextColor={colors.textMuted}
                    value={query}
                    onChangeText={onChangeQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                />
                {query.length > 0 ? (
                    <Pressable hitSlop={8} onPress={() => onChangeQuery('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                ) : null}
            </View>

            {categories.data && categories.data.length > 0 ? (
                <View>
                    <FlatList
                        horizontal
                        data={categories.data}
                        keyExtractor={(c) => c.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsContent}
                        renderItem={({ item }) => {
                            const selected = category === item.slug;
                            return (
                                <Pressable
                                    style={[styles.chip, selected && styles.chipActive]}
                                    onPress={() => onPickCategory(item.slug)}
                                >
                                    <Text
                                        style={[styles.chipText, selected && styles.chipTextActive]}
                                    >
                                        {item.name}
                                    </Text>
                                </Pressable>
                            );
                        }}
                    />
                </View>
            ) : null}

            <FlatList
                data={stories}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                    <StoryListItem
                        title={item.title}
                        coverImage={item.coverImage}
                        line2={
                            item.authorName ||
                            item.author?.displayName ||
                            item.author?.username ||
                            'Đang cập nhật'
                        }
                        line3={`${formatRating(item.rating)} sao  ·  ${formatCount(item.viewCount)} lượt xem`}
                        onPress={() => nav.navigate('StoryDetail', { slug: item.slug })}
                    />
                )}
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
                }}
                ListEmptyComponent={
                    !active ? (
                        <EmptyView
                            icon="search-outline"
                            message="Nhập từ khoá hoặc chọn thể loại để bắt đầu"
                        />
                    ) : search.isLoading ? (
                        <Loading />
                    ) : search.isError ? (
                        <ErrorView
                            message={describeError(search.error)}
                            onRetry={() => search.refetch()}
                        />
                    ) : (
                        <EmptyView icon="sad-outline" message="Không tìm thấy truyện phù hợp" />
                    )
                }
                ListFooterComponent={
                    search.isFetchingNextPage ? (
                        <ActivityIndicator color={colors.primary} style={styles.footer} />
                    ) : null
                }
                contentContainerStyle={
                    stories.length === 0 ? styles.emptyContent : styles.listContent
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceContainerLowest,
        margin: spacing.lg,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    input: { flex: 1, fontSize: fontSize.md, color: colors.onSurface, padding: 0, fontFamily: 'DMSans_400Regular' },
    chipsContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceContainerLowest,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: fontSize.sm, color: colors.onSurfaceVariant, fontFamily: 'DMSans_500Medium' },
    chipTextActive: { color: colors.onPrimary, fontFamily: 'DMSans_700Bold' },
    // PaddingBottom 100 chừa MainTabBar floating.
    listContent: { paddingVertical: spacing.sm, paddingBottom: 100 },
    emptyContent: { flexGrow: 1 },
    footer: { marginVertical: spacing.lg },
});
