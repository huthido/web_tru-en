import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fontSize, radius, readerThemes, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { ReaderThemeKey } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { htmlToBlocks } from '@/lib/html';
import { resolveImageUrl } from '@/lib/url';
import { useBuyChapter, useBuyStory, useChapter, useChapters } from '@/lib/hooks/chapters';
import { useChapterProgress, useSaveProgress } from '@/lib/hooks/library';
import { describeError } from '@/lib/error';
import { ErrorView, Loading } from '@/components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

const MIN_FONT = 14;
const MAX_FONT = 28;
const SAVE_DEBOUNCE_MS = 1500;

export const ReaderScreen: React.FC<Props> = ({ route, navigation }) => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const { storySlug, chapterSlug } = route.params;
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const chapter = useChapter(storySlug, chapterSlug);
    const chapters = useChapters(storySlug);
    const chapterId = chapter.data?.id;
    const savedProgress = useChapterProgress(chapterId);
    const saveProgress = useSaveProgress();
    const buyChapter = useBuyChapter(storySlug, chapterSlug);
    const buyStory = useBuyStory(storySlug);

    const [readerFontSize, setReaderFontSize] = useState(18);
    const [themeKey, setThemeKey] = useState<ReaderThemeKey>('light');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const theme = readerThemes[themeKey];

    const scrollRef = useRef<ScrollView>(null);
    const layoutH = useRef(0);
    const contentH = useRef(0);
    const restored = useRef(false);
    const lastSaved = useRef(0);
    const currentProgress = useRef(0);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isLocked = !!chapter.data?.isLocked;

    const blocks = useMemo(
        () => htmlToBlocks(chapter.data?.content),
        [chapter.data?.content],
    );

    const sortedChapters = useMemo(
        () => [...(chapters.data ?? [])].sort((a, b) => a.order - b.order),
        [chapters.data],
    );
    const currentIndex = sortedChapters.findIndex((c) => c.slug === chapterSlug);
    const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : undefined;
    const nextChapter =
        currentIndex >= 0 && currentIndex < sortedChapters.length - 1
            ? sortedChapters[currentIndex + 1]
            : undefined;

    // Reset progress bookkeeping whenever the chapter changes.
    useEffect(() => {
        restored.current = false;
        lastSaved.current = 0;
        currentProgress.current = 0;
    }, [chapterSlug]);

    const flushSave = useCallback(() => {
        if (!chapterId || isLocked) return;
        const p = Math.round(currentProgress.current);
        if (p > lastSaved.current + 1 || (p >= 95 && lastSaved.current < 95)) {
            lastSaved.current = p;
            saveProgress.mutate({ chapterId, progress: p });
        }
    }, [chapterId, isLocked, saveProgress]);

    // Flush remaining progress on unmount / chapter switch.
    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            flushSave();
        };
    }, [flushSave]);

    // Restore the saved scroll position once the content + layout are measured.
    const tryRestore = useCallback(() => {
        if (restored.current || isLocked) return;
        const target = savedProgress.data?.progress ?? 0;
        if (layoutH.current === 0 || contentH.current === 0) return;
        restored.current = true;
        if (target <= 1) return;
        const maxScroll = Math.max(0, contentH.current - layoutH.current);
        if (maxScroll <= 0) return;
        scrollRef.current?.scrollTo({ y: (target / 100) * maxScroll, animated: false });
    }, [isLocked, savedProgress.data?.progress]);

    useEffect(() => {
        tryRestore();
    }, [tryRestore]);

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            layoutH.current = layoutMeasurement.height;
            contentH.current = contentSize.height;
            const maxScroll = Math.max(1, contentSize.height - layoutMeasurement.height);
            currentProgress.current = Math.max(
                0,
                Math.min(100, (contentOffset.y / maxScroll) * 100),
            );
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
        },
        [flushSave],
    );

    const goToChapter = (slug: string) =>
        navigation.replace('Reader', { storySlug, chapterSlug: slug });

    const onUnlock = async () => {
        if (!chapter.data) return;
        try {
            const result =
                chapter.data.lockType === 'STORY'
                    ? await buyStory.mutateAsync()
                    : await buyChapter.mutateAsync(chapter.data.id);
            if (result?.success) {
                Alert.alert('Thành công', result.message || 'Đã mở khoá chương.');
            } else {
                Alert.alert('Không thể mở khoá', result?.message || 'Vui lòng thử lại.');
            }
        } catch (err) {
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            const msg = e.response?.data?.error || e.message || 'Đã có lỗi xảy ra.';
            Alert.alert(
                'Không thể mở khoá',
                `${msg}\n\nNếu số dư xu không đủ, vui lòng nạp xu trên bản web.`,
            );
        }
    };

    if (chapter.isLoading) {
        return (
            <View style={[styles.fill, { backgroundColor: theme.bg }]}>
                <Loading />
            </View>
        );
    }
    if (chapter.isError || !chapter.data) {
        return (
            <View style={[styles.fill, { backgroundColor: theme.bg }]}>
                <ErrorView
                    message={describeError(chapter.error) || 'Không tải được chương'}
                    onRetry={() => chapter.refetch()}
                />
            </View>
        );
    }

    const c = chapter.data;
    const contentWidth = width - spacing.lg * 2;
    const unlocking = buyChapter.isPending || buyStory.isPending;

    return (
        <View style={[styles.fill, { backgroundColor: theme.bg }]}>
            <StatusBar style={themeKey === 'dark' ? 'light' : 'dark'} />

            {/* Header */}
            <View
                style={[
                    styles.header,
                    { paddingTop: insets.top + 6, backgroundColor: theme.bg, borderBottomColor: theme.muted + '33' },
                ]}
            >
                <Pressable hitSlop={8} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={26} color={theme.text} />
                </Pressable>
                <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.text }]}>
                    {c.title}
                </Text>
                <Pressable hitSlop={8} onPress={() => setSettingsOpen(true)}>
                    <Ionicons name="text" size={22} color={theme.text} />
                </Pressable>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.fill}
                contentContainerStyle={styles.content}
                scrollEventThrottle={16}
                onScroll={onScroll}
                onContentSizeChange={(_w, h) => {
                    contentH.current = h;
                    tryRestore();
                }}
                onLayout={(e) => {
                    layoutH.current = e.nativeEvent.layout.height;
                    tryRestore();
                }}
            >
                <Text style={[styles.chapterTitle, { color: theme.text }]}>{c.title}</Text>

                {blocks.map((block, i) =>
                    block.type === 'text' ? (
                        <Text
                            key={i}
                            style={{
                                fontSize: readerFontSize,
                                lineHeight: readerFontSize * 1.7,
                                color: theme.text,
                                marginBottom: spacing.md,
                            }}
                        >
                            {block.text}
                        </Text>
                    ) : (
                        <Image
                            key={i}
                            source={resolveImageUrl(block.uri)}
                            style={{
                                width: contentWidth,
                                height: contentWidth * 1.1,
                                marginBottom: spacing.md,
                            }}
                            contentFit="contain"
                        />
                    ),
                )}

                {isLocked ? (
                    <View style={styles.paywall}>
                        <Ionicons name="lock-closed" size={36} color={colors.primary} />
                        <Text style={styles.paywallTitle}>Nội dung bị khoá</Text>
                        <Text style={styles.paywallText}>
                            {c.lockType === 'STORY'
                                ? 'Truyện này cần mua trọn bộ để đọc.'
                                : 'Chương này cần mở khoá để đọc tiếp.'}
                        </Text>
                        <Pressable
                            style={[styles.unlockBtn, unlocking && styles.unlockBtnDisabled]}
                            disabled={unlocking}
                            onPress={onUnlock}
                        >
                            <Ionicons name="key" size={16} color={colors.white} />
                            <Text style={styles.unlockText}>
                                {unlocking
                                    ? 'Đang xử lý...'
                                    : c.lockType === 'STORY'
                                      ? `Mua trọn bộ (${c.lockPrice ?? 0} xu)`
                                      : `Mở khoá chương (${c.lockPrice ?? c.price} xu)`}
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.navRow}>
                        <Pressable
                            style={[styles.navBtn, !prevChapter && styles.navBtnDisabled]}
                            disabled={!prevChapter}
                            onPress={() => prevChapter && goToChapter(prevChapter.slug)}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={16}
                                color={prevChapter ? colors.primary : colors.border}
                            />
                            <Text
                                style={[
                                    styles.navText,
                                    !prevChapter && styles.navTextDisabled,
                                ]}
                            >
                                Chương trước
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.navBtn, !nextChapter && styles.navBtnDisabled]}
                            disabled={!nextChapter}
                            onPress={() => nextChapter && goToChapter(nextChapter.slug)}
                        >
                            <Text
                                style={[
                                    styles.navText,
                                    !nextChapter && styles.navTextDisabled,
                                ]}
                            >
                                Chương sau
                            </Text>
                            <Ionicons
                                name="chevron-forward"
                                size={16}
                                color={nextChapter ? colors.primary : colors.border}
                            />
                        </Pressable>
                    </View>
                )}
            </ScrollView>

            {/* Reading settings */}
            <Modal
                visible={settingsOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setSettingsOpen(false)}
            >
                <Pressable style={styles.sheetBackdrop} onPress={() => setSettingsOpen(false)}>
                    <Pressable style={styles.sheet}>
                        <Text style={styles.sheetTitle}>Tuỳ chỉnh đọc</Text>

                        <Text style={styles.sheetLabel}>Cỡ chữ</Text>
                        <View style={styles.fontRow}>
                            <Pressable
                                style={styles.fontBtn}
                                onPress={() =>
                                    setReaderFontSize((v) => Math.max(MIN_FONT, v - 2))
                                }
                            >
                                <Text style={styles.fontBtnSmall}>A</Text>
                            </Pressable>
                            <Text style={styles.fontValue}>{readerFontSize}</Text>
                            <Pressable
                                style={styles.fontBtn}
                                onPress={() =>
                                    setReaderFontSize((v) => Math.min(MAX_FONT, v + 2))
                                }
                            >
                                <Text style={styles.fontBtnLarge}>A</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.sheetLabel}>Nền</Text>
                        <View style={styles.themeRow}>
                            {(Object.keys(readerThemes) as ReaderThemeKey[]).map((key) => (
                                <Pressable
                                    key={key}
                                    style={[
                                        styles.themeSwatch,
                                        { backgroundColor: readerThemes[key].bg },
                                        themeKey === key && styles.themeSwatchActive,
                                    ]}
                                    onPress={() => setThemeKey(key)}
                                >
                                    <Text style={{ color: readerThemes[key].text, fontWeight: '700' }}>
                                        Aa
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            style={styles.sheetClose}
                            onPress={() => setSettingsOpen(false)}
                        >
                            <Text style={styles.sheetCloseText}>Xong</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    fill: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    // Header title — Plus Jakarta SemiBold mid-size, dùng `theme.text` để
    // theo dõi sepia/dark mode.
    headerTitle: { flex: 1, fontSize: fontSize.md, fontFamily: 'PlusJakartaSans_600SemiBold' },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    chapterTitle: {
        fontSize: 26,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: spacing.lg,
        letterSpacing: -0.3,
    },
    paywall: {
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        padding: spacing.xl,
        backgroundColor: colors.primaryContainer,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    paywallTitle: { fontSize: fontSize.lg, fontFamily: 'PlusJakartaSans_700Bold', color: colors.onSurface },
    paywallText: {
        fontSize: fontSize.sm,
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        fontFamily: 'DMSans_400Regular',
        lineHeight: 20,
    },
    unlockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.pill,
        marginTop: spacing.sm,
    },
    unlockBtnDisabled: { opacity: 0.6 },
    unlockText: { color: colors.onPrimary, fontFamily: 'DMSans_700Bold', fontSize: fontSize.md },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    // Pill-shaped nav buttons theo Stitch — radius pill thay vì md.
    navBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    navBtnDisabled: { borderColor: colors.outlineVariant },
    navText: { color: colors.primary, fontFamily: 'DMSans_700Bold', fontSize: fontSize.sm },
    navTextDisabled: { color: colors.outlineVariant },
    sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.surfaceContainerLowest,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.xl,
        gap: spacing.sm,
    },
    sheetTitle: {
        fontSize: fontSize.lg,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: colors.onSurface,
        marginBottom: spacing.sm,
    },
    sheetLabel: {
        fontSize: fontSize.sm,
        color: colors.onSurfaceVariant,
        marginTop: spacing.md,
        fontFamily: 'DMSans_500Medium',
    },
    fontRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    fontBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: radius.md,
    },
    fontBtnSmall: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: colors.onSurface },
    fontBtnLarge: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', color: colors.onSurface },
    fontValue: { fontSize: fontSize.lg, fontFamily: 'PlusJakartaSans_700Bold', color: colors.onSurface, width: 40, textAlign: 'center' },
    themeRow: { flexDirection: 'row', gap: spacing.md },
    themeSwatch: {
        flex: 1,
        height: 56,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.outlineVariant,
    },
    themeSwatchActive: { borderColor: colors.primary },
    sheetClose: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: radius.pill,
        alignItems: 'center',
    },
    sheetCloseText: { color: colors.onPrimary, fontFamily: 'DMSans_700Bold', fontSize: fontSize.md },
});
