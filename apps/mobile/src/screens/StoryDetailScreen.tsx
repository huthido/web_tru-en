import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { Chapter } from '@/lib/api/types';
import { formatCount, storyStatusLabel } from '@/lib/format';
import { htmlToPlainText } from '@/lib/html';
import { useStory } from '@/lib/hooks/stories';
import { useChapters } from '@/lib/hooks/chapters';
import { useStoryLiked, useToggleLike } from '@/lib/hooks/stories';
import { useFollowStatus, useToggleFollow } from '@/lib/hooks/library';
import { describeError } from '@/lib/error';
import { REPORT_REASONS, ReportsApi, type ReportReason } from '@/lib/api/reports.service';
import { UserBlocksApi } from '@/lib/api/user-blocks.service';
import { EmptyView, ErrorView, Loading, Stars } from '@/components/ui';
import { StoryCover } from '@/components/StoryCover';
import { AdBanner } from '@/components/AdBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryDetail'>;

const ACCESS_LABEL: Record<string, string> = {
    FREE: 'Miễn phí',
    FREEMIUM: 'Mua chương',
    VIP: 'VIP',
};

function ChapterRow({ chapter, onPress }: { chapter: Chapter; onPress: () => void }) {
    return (
        <Pressable style={styles.chapterRow} onPress={onPress}>
            <View style={styles.chapterMain}>
                <Text numberOfLines={1} style={styles.chapterTitle}>
                    {chapter.title}
                </Text>
                <Text style={styles.chapterMeta}>
                    {formatCount(chapter.viewCount)} lượt xem
                </Text>
            </View>
            {chapter.price > 0 ? (
                <View style={styles.coinBadge}>
                    <Ionicons name="lock-closed" size={11} color={colors.coin} />
                    <Text style={styles.coinText}>{chapter.price}</Text>
                </View>
            ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.border} />
            )}
        </Pressable>
    );
}

export const StoryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { slug } = route.params;
    const story = useStory(slug);
    const chapters = useChapters(slug);
    const storyId = story.data?.id;

    const followStatus = useFollowStatus(storyId);
    const liked = useStoryLiked(storyId);
    const toggleFollow = useToggleFollow(storyId ?? '');
    const toggleLike = useToggleLike(storyId ?? '', slug);

    const [descExpanded, setDescExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [reportNote, setReportNote] = useState('');

    const reportMutation = useMutation({
        mutationFn: async () => {
            if (!storyId || !selectedReason) throw new Error('Thiếu thông tin báo cáo');
            await ReportsApi.create({
                targetType: 'STORY',
                targetId: storyId,
                reason: selectedReason,
                note: reportNote.trim() || undefined,
            });
        },
        onSuccess: () => {
            setReportOpen(false);
            setSelectedReason(null);
            setReportNote('');
            Alert.alert(
                'Đã gửi báo cáo',
                'Cảm ơn bạn — quản trị viên sẽ xem xét nội dung này.',
            );
        },
        onError: (err) => Alert.alert('Không gửi được', describeError(err)),
    });

    const blockMutation = useMutation({
        mutationFn: async () => {
            const authorId = story.data?.author?.id ?? story.data?.authorId;
            if (!authorId) throw new Error('Không tìm thấy tác giả');
            await UserBlocksApi.block(authorId);
        },
        onSuccess: () =>
            Alert.alert(
                'Đã chặn tác giả',
                'Bạn sẽ không thấy bình luận hoặc thông báo từ tác giả này nữa. Có thể bỏ chặn trong Cài đặt sau.',
            ),
        onError: (err) => Alert.alert('Không chặn được', describeError(err)),
    });

    useEffect(() => {
        navigation.setOptions({
            ...(story.data?.title ? { title: story.data.title } : {}),
            headerRight: () => (
                <Pressable hitSlop={8} onPress={() => setMenuOpen(true)}>
                    <Ionicons
                        name="ellipsis-vertical"
                        size={22}
                        color={colors.white}
                    />
                </Pressable>
            ),
        });
    }, [story.data?.title, navigation]);

    const chapterList = useMemo(
        () => [...(chapters.data ?? [])].sort((a, b) => a.order - b.order),
        [chapters.data],
    );

    if (story.isLoading) return <Loading />;
    if (story.isError || !story.data) {
        return (
            <ErrorView
                message={describeError(story.error) || 'Không tải được truyện'}
                onRetry={() => story.refetch()}
            />
        );
    }

    const s = story.data;
    const author =
        s.authorName || s.author?.displayName || s.author?.username || 'Đang cập nhật';
    const description = htmlToPlainText(s.description, 4000) || 'Chưa có giới thiệu.';
    const categories = s.storyCategories?.map((sc) => sc.category) ?? [];
    const isFollowing = followStatus.data ?? false;
    const isLiked = liked.data ?? false;
    const firstChapter = chapterList[0];

    const openChapter = (chapterSlug: string) =>
        navigation.navigate('Reader', { storySlug: slug, chapterSlug });

    const header = (
        <View>
            <View style={styles.hero}>
                <StoryCover uri={s.coverImage} width={132} />
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.author}>{author}</Text>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{storyStatusLabel(s.status)}</Text>
                    </View>
                    <View style={[styles.badge, styles.badgeAccent]}>
                        <Text style={[styles.badgeText, styles.badgeAccentText]}>
                            {ACCESS_LABEL[s.accessType] ?? s.accessType}
                        </Text>
                    </View>
                </View>
                <View style={styles.ratingRow}>
                    <Stars rating={s.rating} size={15} />
                    <Text style={styles.ratingText}>
                        {(s.rating ?? 0).toFixed(1)} ({formatCount(s.ratingCount)})
                    </Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <Stat icon="eye-outline" label="Lượt xem" value={formatCount(s.viewCount)} />
                <Stat
                    icon="bookmark-outline"
                    label="Theo dõi"
                    value={formatCount(s.followCount)}
                />
                <Stat
                    icon="list-outline"
                    label="Chương"
                    value={formatCount(s._count?.chapters ?? chapterList.length)}
                />
            </View>

            <View style={styles.actions}>
                <Pressable
                    style={[styles.actionBtn, isFollowing && styles.actionBtnActive]}
                    disabled={!storyId || toggleFollow.isPending}
                    onPress={() => toggleFollow.mutate(isFollowing)}
                >
                    <Ionicons
                        name={isFollowing ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={isFollowing ? colors.white : colors.primary}
                    />
                    <Text style={[styles.actionText, isFollowing && styles.actionTextActive]}>
                        {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.actionBtn, isLiked && styles.actionBtnActive]}
                    disabled={!storyId || toggleLike.isPending}
                    onPress={() => toggleLike.mutate(isLiked)}
                >
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isLiked ? colors.white : colors.primary}
                    />
                    <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                        Thích
                    </Text>
                </Pressable>
            </View>

            {firstChapter ? (
                <Pressable
                    style={styles.readBtn}
                    onPress={() => openChapter(firstChapter.slug)}
                >
                    <Ionicons name="book" size={18} color={colors.white} />
                    <Text style={styles.readBtnText}>Đọc từ chương đầu</Text>
                </Pressable>
            ) : null}

            <View style={styles.block}>
                <Text style={styles.blockTitle}>Giới thiệu</Text>
                <Text
                    style={styles.description}
                    numberOfLines={descExpanded ? undefined : 5}
                >
                    {description}
                </Text>
                {description.length > 220 ? (
                    <Pressable onPress={() => setDescExpanded((v) => !v)}>
                        <Text style={styles.moreText}>
                            {descExpanded ? 'Thu gọn' : 'Xem thêm'}
                        </Text>
                    </Pressable>
                ) : null}
            </View>

            {categories.length > 0 ? (
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Thể loại</Text>
                    <View style={styles.tagWrap}>
                        {categories.map((c) => (
                            <View key={c.id} style={styles.tag}>
                                <Text style={styles.tagText}>{c.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}

            <AdBanner position="INLINE" />

            <Text style={[styles.blockTitle, styles.chapterHeading]}>
                Danh sách chương ({chapterList.length})
            </Text>
        </View>
    );

    const onBlockTap = () => {
        setMenuOpen(false);
        const authorId = story.data?.author?.id ?? story.data?.authorId;
        const authorName =
            story.data?.author?.displayName ||
            story.data?.author?.username ||
            'tác giả';
        if (!authorId) {
            Alert.alert('Không tìm thấy tác giả', 'Không thể chặn — thiếu id tác giả.');
            return;
        }
        Alert.alert(
            'Chặn tác giả?',
            `Bạn sẽ không thấy bình luận hoặc nhận thông báo từ ${authorName}. Có thể bỏ chặn sau.`,
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Chặn',
                    style: 'destructive',
                    onPress: () => blockMutation.mutate(),
                },
            ],
        );
    };

    return (
        <>
            <FlatList
                style={styles.screen}
                data={chapterList}
                keyExtractor={(c) => c.id}
                ListHeaderComponent={header}
                renderItem={({ item }) => (
                    <ChapterRow chapter={item} onPress={() => openChapter(item.slug)} />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    chapters.isLoading ? (
                        <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} />
                    ) : (
                        <EmptyView icon="document-outline" message="Chưa có chương nào" />
                    )
                }
                contentContainerStyle={styles.content}
            />

            {/* Menu sheet — Báo cáo / Chặn tác giả */}
            <Modal
                visible={menuOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setMenuOpen(false)}
            >
                <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)}>
                    <Pressable style={styles.sheetCard}>
                        <View style={styles.sheetHandle} />
                        <Pressable
                            style={styles.sheetItem}
                            onPress={() => {
                                setMenuOpen(false);
                                setReportOpen(true);
                            }}
                        >
                            <Ionicons name="flag-outline" size={20} color={colors.danger} />
                            <Text style={styles.sheetItemText}>Báo cáo truyện</Text>
                        </Pressable>
                        {story.data?.author?.id || story.data?.authorId ? (
                            <Pressable
                                style={styles.sheetItem}
                                onPress={onBlockTap}
                            >
                                <Ionicons name="ban-outline" size={20} color={colors.danger} />
                                <Text style={styles.sheetItemText}>Chặn tác giả</Text>
                            </Pressable>
                        ) : null}
                        <Pressable
                            style={[styles.sheetItem, styles.sheetCancel]}
                            onPress={() => setMenuOpen(false)}
                        >
                            <Text style={styles.sheetCancelText}>Huỷ</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Report modal */}
            <Modal
                visible={reportOpen}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    !reportMutation.isPending && setReportOpen(false)
                }
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.reportCard}>
                        <Text style={styles.reportTitle}>Báo cáo truyện</Text>
                        <Text style={styles.reportSubtitle}>Chọn lý do</Text>
                        <View style={styles.reasonList}>
                            {REPORT_REASONS.map((r) => {
                                const active = selectedReason === r.value;
                                return (
                                    <Pressable
                                        key={r.value}
                                        style={styles.reasonRow}
                                        onPress={() => setSelectedReason(r.value)}
                                    >
                                        <Ionicons
                                            name={
                                                active ? 'radio-button-on' : 'radio-button-off'
                                            }
                                            size={20}
                                            color={active ? colors.primary : colors.textMuted}
                                        />
                                        <Text style={styles.reasonLabel}>{r.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        <TextInput
                            placeholder="Mô tả thêm (tuỳ chọn)"
                            placeholderTextColor={colors.textMuted}
                            value={reportNote}
                            onChangeText={setReportNote}
                            multiline
                            style={styles.reportInput}
                            maxLength={2000}
                            editable={!reportMutation.isPending}
                        />
                        <View style={styles.reportActions}>
                            <Pressable
                                style={[styles.reportBtn, styles.reportCancelBtn]}
                                onPress={() => {
                                    setReportOpen(false);
                                    setSelectedReason(null);
                                    setReportNote('');
                                }}
                                disabled={reportMutation.isPending}
                            >
                                <Text style={styles.reportCancelText}>Huỷ</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.reportBtn,
                                    styles.reportSubmitBtn,
                                    (!selectedReason || reportMutation.isPending) && {
                                        opacity: 0.5,
                                    },
                                ]}
                                disabled={!selectedReason || reportMutation.isPending}
                                onPress={() => reportMutation.mutate()}
                            >
                                {reportMutation.isPending ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.reportSubmitText}>Gửi báo cáo</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

function Stat({
    icon,
    label,
    value,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.stat}>
            <Ionicons name={icon} size={18} color={colors.primary} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: spacing.xl },
    hero: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primarySoft,
        paddingBottom: spacing.lg,
        gap: spacing.xs,
    },
    title: {
        marginTop: spacing.md,
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    author: { fontSize: fontSize.sm, color: colors.textMuted },
    badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    badge: {
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 3,
    },
    badgeAccent: { backgroundColor: colors.primary },
    badgeText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
    badgeAccentText: { color: colors.white },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    ratingText: { fontSize: fontSize.sm, color: colors.textMuted },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
    },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
    statLabel: { fontSize: fontSize.xs, color: colors.textMuted },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    actionBtnActive: { backgroundColor: colors.primary },
    actionText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
    actionTextActive: { color: colors.white },
    readBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
    },
    readBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
    block: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
    blockTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    description: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
    moreText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tag: {
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tagText: { fontSize: fontSize.xs, color: colors.textMuted },
    chapterHeading: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    chapterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
    },
    chapterMain: { flex: 1, gap: 2 },
    chapterTitle: { fontSize: fontSize.md, color: colors.text },
    chapterMeta: { fontSize: fontSize.xs, color: colors.textMuted },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFF6E0',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.pill,
    },
    coinText: { fontSize: fontSize.xs, color: colors.coin, fontWeight: '700' },
    separator: { height: 1, backgroundColor: colors.bg },
    /* menu sheet (báo cáo / chặn) */
    sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheetCard: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        paddingBottom: spacing.xl,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    sheetItemText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
    sheetCancel: { justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs },
    sheetCancelText: { color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center', flex: 1 },
    /* report modal */
    modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
    reportCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    reportTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    reportSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
    reasonList: { gap: 2 },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    reasonLabel: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
    reportInput: {
        minHeight: 70,
        backgroundColor: colors.bg,
        borderRadius: radius.md,
        padding: spacing.sm,
        fontSize: fontSize.sm,
        color: colors.text,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.sm,
    },
    reportActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    reportBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
    reportCancelBtn: { backgroundColor: colors.bg },
    reportCancelText: { color: colors.text, fontWeight: '600' },
    reportSubmitBtn: { backgroundColor: colors.primary },
    reportSubmitText: { color: colors.white, fontWeight: '700' },
});
