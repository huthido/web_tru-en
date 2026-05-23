import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CreateChapterInput } from '@/lib/api/chapters.service';
import { describeError } from '@/lib/error';

export interface ChapterFormValues {
    title: string;
    content: string;
    order?: number;
    price: string;
    publishImmediately: boolean;
}

export interface ChapterFormProps {
    initialValues?: Partial<ChapterFormValues>;
    submitLabel: string;
    /** When true (edit mode), the toggle "Xuất bản ngay" is hidden. */
    hidePublishToggle?: boolean;
    onSubmit: (data: CreateChapterInput, opts: { publishImmediately: boolean }) => Promise<void>;
}

const TOOLBAR_ACTIONS = [
    actions.setBold,
    actions.setItalic,
    actions.setUnderline,
    actions.setStrikethrough,
    actions.heading1,
    actions.heading2,
    actions.insertBulletsList,
    actions.insertOrderedList,
    actions.blockquote,
    actions.alignLeft,
    actions.alignCenter,
    actions.undo,
    actions.redo,
];

export function ChapterForm({
    initialValues,
    submitLabel,
    hidePublishToggle = false,
    onSubmit,
}: ChapterFormProps) {
    const richRef = useRef<RichEditor>(null);

    const [title, setTitle] = useState(initialValues?.title ?? '');
    const [content, setContent] = useState(initialValues?.content ?? '');
    const [price, setPrice] = useState(initialValues?.price ?? '');
    const [publishImmediately, setPublishImmediately] = useState(
        initialValues?.publishImmediately ?? false,
    );
    const [submitting, setSubmitting] = useState(false);

    const onPressSubmit = async () => {
        const t = title.trim();
        if (t.length < 1) {
            Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề chương.');
            return;
        }
        const plain = content.replace(/<[^>]+>/g, '').trim();
        if (plain.length < 100) {
            Alert.alert(
                'Nội dung quá ngắn',
                'Nội dung chương phải có ít nhất 100 ký tự (đếm không tính HTML tag).',
            );
            return;
        }
        const p = price.trim() === '' ? 0 : Number(price);
        if (!Number.isFinite(p) || p < 0) {
            Alert.alert('Giá không hợp lệ', 'Giá phải là số ≥ 0.');
            return;
        }
        const payload: CreateChapterInput = {
            title: t,
            content,
            price: p,
        };
        try {
            setSubmitting(true);
            await onSubmit(payload, { publishImmediately });
        } catch (err) {
            Alert.alert('Không lưu được', describeError(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.label}>Tiêu đề *</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Chương 1: Mở đầu"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    maxLength={200}
                />

                <Text style={styles.label}>Nội dung * (tối thiểu 100 ký tự)</Text>
                <View style={styles.editorWrap}>
                    <RichEditor
                        ref={richRef}
                        initialContentHTML={initialValues?.content ?? ''}
                        onChange={setContent}
                        placeholder="Nhập nội dung chương..."
                        editorStyle={{
                            backgroundColor: colors.surface,
                            color: colors.text,
                            placeholderColor: colors.textMuted,
                        }}
                        style={styles.editor}
                        useContainer
                        initialHeight={400}
                    />
                </View>

                <Text style={styles.label}>Giá xu (0 = miễn phí)</Text>
                <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={styles.input}
                />
                <Text style={styles.hint}>
                    Đặt giá để biến chương này thành chương trả phí (chỉ dùng cho truyện
                    FREEMIUM). Truyện FREE/VIP không lấy giá từ chương.
                </Text>

                {!hidePublishToggle ? (
                    <Pressable
                        style={styles.toggleRow}
                        onPress={() => setPublishImmediately((v) => !v)}
                    >
                        <View
                            style={[
                                styles.checkbox,
                                publishImmediately && styles.checkboxOn,
                            ]}
                        >
                            {publishImmediately ? (
                                <Text style={styles.checkmark}>✓</Text>
                            ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>Xuất bản ngay</Text>
                            <Text style={styles.toggleHint}>
                                Chỉ áp dụng khi truyện đã được duyệt. Nếu truyện chưa
                                xuất bản, chương sẽ ở dạng nháp.
                            </Text>
                        </View>
                    </Pressable>
                ) : null}

                <Pressable
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={onPressSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.submitText}>{submitLabel}</Text>
                    )}
                </Pressable>
            </ScrollView>

            <RichToolbar
                editor={richRef}
                actions={TOOLBAR_ACTIONS}
                iconTint={colors.textMuted}
                selectedIconTint={colors.primary}
                style={styles.toolbar}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.md,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    hint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    editorWrap: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        minHeight: 400,
        backgroundColor: colors.surface,
    },
    editor: { flex: 1, minHeight: 400 },
    toolbar: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: radius.sm,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkmark: { color: colors.white, fontWeight: '900', fontSize: 14 },
    toggleLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
    toggleHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    submitBtn: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    submitText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
