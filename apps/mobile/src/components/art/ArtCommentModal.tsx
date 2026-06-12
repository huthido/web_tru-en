import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useArtComments, useAddArtComment } from '@/lib/hooks/art';
import type { ArtPost } from '@/lib/api/art.service';

interface Props {
    post: ArtPost | null;
    onClose: () => void;
    isLoggedIn: boolean;
}

export function ArtCommentModal({ post, onClose, isLoggedIn }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [text, setText] = useState('');

    const query = useArtComments(post?.id ?? '', !!post);
    const { mutate: addComment, isPending } = useAddArtComment(post?.id ?? '');

    const comments = useMemo(
        () => query.data?.pages.flatMap((p) => p.items) ?? [],
        [query.data],
    );

    const handleSend = () => {
        if (!text.trim() || !post) return;
        addComment(text.trim(), {
            onSuccess: () => setText(''),
        });
    };

    return (
        <Modal visible={!!post} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.sheet}
            >
                <View style={styles.handle} />
                <View style={styles.header}>
                    <Text style={styles.title}>Bình luận</Text>
                    <Pressable onPress={onClose} hitSlop={10}>
                        <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
                    </Pressable>
                </View>

                <FlatList
                    data={comments}
                    keyExtractor={(c) => c.id}
                    style={styles.list}
                    contentContainerStyle={{ paddingBottom: spacing.lg }}
                    onEndReachedThreshold={0.3}
                    onEndReached={() => {
                        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
                    }}
                    ListEmptyComponent={
                        query.isLoading ? (
                            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
                        ) : (
                            <Text style={styles.empty}>Chưa có bình luận nào</Text>
                        )
                    }
                    renderItem={({ item }) => (
                        <View style={styles.commentItem}>
                            <Ionicons name="person-circle" size={32} color={colors.outlineVariant} />
                            <View style={styles.commentBody}>
                                <Text style={styles.commentUser}>
                                    {item.user.displayName || item.user.username}
                                </Text>
                                <Text style={styles.commentText}>{item.content}</Text>
                            </View>
                        </View>
                    )}
                />

                {isLoggedIn ? (
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={text}
                            onChangeText={setText}
                            placeholder="Viết bình luận..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            maxLength={500}
                        />
                        <Pressable
                            onPress={handleSend}
                            disabled={!text.trim() || isPending}
                            style={[styles.sendBtn, (!text.trim() || isPending) && { opacity: 0.4 }]}
                        >
                            {isPending ? (
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                            ) : (
                                <Ionicons name="send" size={18} color={colors.onSurface} />
                            )}
                        </Pressable>
                    </View>
                ) : (
                    <Text style={styles.loginHint}>Đăng nhập để bình luận</Text>
                )}
            </KeyboardAvoidingView>
        </Modal>
    );
}

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        backdrop: { flex: 1 },
        sheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '70%',
            paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        },
        handle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.outlineVariant,
            alignSelf: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing.md,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outlineVariant,
        },
        title: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: colors.onSurface },
        list: { flex: 1, paddingHorizontal: spacing.lg },
        empty: {
            textAlign: 'center',
            marginTop: spacing.xl,
            color: colors.onSurfaceVariant,
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
        },
        commentItem: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
        commentBody: { flex: 1, gap: 2 },
        commentUser: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: colors.onSurface },
        commentText: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: colors.onSurface, lineHeight: 20 },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.outlineVariant,
        },
        input: {
            flex: 1,
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontSize: 14,
            fontFamily: 'DMSans_400Regular',
            color: colors.onSurface,
            maxHeight: 100,
        },
        sendBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
        },
        loginHint: {
            textAlign: 'center',
            padding: spacing.md,
            color: colors.onSurfaceVariant,
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
        },
    });
