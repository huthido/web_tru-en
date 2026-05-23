import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSize, radius, spacing } from '@/theme';
import { CategoriesApi } from '@/lib/api/categories.service';
import { StoriesApi, type CreateStoryInput } from '@/lib/api/stories.service';
import type { StoryAccessType } from '@/lib/api/types';
import { describeError } from '@/lib/error';
import { resolveImageUrl } from '@/lib/url';
import {
    COVER_NORMALIZE,
    MAX_UPLOAD_BYTES,
    normalizeImage,
} from '@/lib/image/normalize';

const ACCESS_OPTIONS: Array<{ value: StoryAccessType; label: string; desc: string }> = [
    { value: 'FREE', label: 'Miễn phí', desc: 'Mọi người đọc miễn phí' },
    { value: 'FREEMIUM', label: 'Một phần xu', desc: 'Có chương trả phí trong truyện' },
    { value: 'VIP', label: 'VIP', desc: 'Phải mua truyện để đọc' },
];

const COUNTRY_OPTIONS = [
    { value: 'VN', label: 'Việt Nam' },
    { value: 'CN', label: 'Trung Quốc' },
    { value: 'KR', label: 'Hàn Quốc' },
    { value: 'JP', label: 'Nhật Bản' },
    { value: 'US', label: 'Mỹ' },
    { value: 'OTHER', label: 'Khác' },
];

export interface StoryFormValues {
    title: string;
    description: string;
    coverImage: string;
    categoryIds: string[];
    country: string;
    accessType: StoryAccessType;
    price: string;
}

export interface StoryFormProps {
    initialValues?: Partial<StoryFormValues>;
    submitLabel: string;
    onSubmit: (data: CreateStoryInput) => Promise<void>;
}

export function StoryForm({ initialValues, submitLabel, onSubmit }: StoryFormProps) {
    const [title, setTitle] = useState(initialValues?.title ?? '');
    const [description, setDescription] = useState(initialValues?.description ?? '');
    const [coverImage, setCoverImage] = useState(initialValues?.coverImage ?? '');
    const [categoryIds, setCategoryIds] = useState<string[]>(initialValues?.categoryIds ?? []);
    const [country, setCountry] = useState<string>(initialValues?.country ?? 'VN');
    const [accessType, setAccessType] = useState<StoryAccessType>(initialValues?.accessType ?? 'FREE');
    const [price, setPrice] = useState<string>(initialValues?.price ?? '');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: () => CategoriesApi.list(),
        staleTime: 30 * 60_000,
    });

    const toggleCategory = (id: string) => {
        setCategoryIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const pickCover = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert(
                    'Thiếu quyền',
                    'App cần truy cập thư viện ảnh để chọn bìa truyện.',
                );
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [3, 4],
                quality: 1,
            });
            if (result.canceled || !result.assets[0]) return;
            const asset = result.assets[0];
            setUploading(true);
            const normalized = await normalizeImage(asset.uri, COVER_NORMALIZE);
            if (normalized.sizeBytes && normalized.sizeBytes > MAX_UPLOAD_BYTES) {
                Alert.alert(
                    'Ảnh quá lớn',
                    'Sau khi nén ảnh vẫn vượt 2MB. Vui lòng chọn ảnh khác.',
                );
                return;
            }
            const { coverImage: url } = await StoriesApi.uploadCover({
                uri: normalized.uri,
                name: asset.fileName ?? 'cover.jpg',
                type: 'image/jpeg',
            });
            setCoverImage(url);
        } catch (err) {
            Alert.alert('Lỗi upload', describeError(err));
        } finally {
            setUploading(false);
        }
    };

    const onPressSubmit = async () => {
        const t = title.trim();
        if (t.length < 3) {
            Alert.alert('Thiếu thông tin', 'Tiêu đề phải có ít nhất 3 ký tự.');
            return;
        }
        if (accessType === 'VIP') {
            const p = Number(price);
            if (!Number.isFinite(p) || p < 0) {
                Alert.alert('Giá không hợp lệ', 'Truyện VIP phải có giá ≥ 0 xu.');
                return;
            }
        }
        const payload: CreateStoryInput = {
            title: t,
            description: description.trim() || undefined,
            coverImage: coverImage.trim() || undefined,
            categoryIds: categoryIds.length ? categoryIds : undefined,
            country,
            accessType,
            price: accessType === 'VIP' ? Number(price) : undefined,
        };
        try {
            setSubmitting(true);
            await onSubmit(payload);
        } catch (err) {
            Alert.alert('Không lưu được', describeError(err));
        } finally {
            setSubmitting(false);
        }
    };

    const coverPreview = resolveImageUrl(coverImage);

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {/* Cover */}
            <Text style={styles.label}>Ảnh bìa</Text>
            <Pressable
                style={styles.coverBox}
                onPress={uploading ? undefined : pickCover}
                disabled={uploading}
            >
                {coverPreview ? (
                    <Image source={coverPreview} style={styles.coverImg} contentFit="cover" />
                ) : (
                    <View style={styles.coverPlaceholder}>
                        <Ionicons name="image-outline" size={36} color={colors.textMuted} />
                        <Text style={styles.coverHint}>Chọn ảnh bìa từ thư viện</Text>
                    </View>
                )}
                {uploading ? (
                    <View style={styles.coverOverlay}>
                        <ActivityIndicator color={colors.white} />
                        <Text style={styles.coverOverlayText}>Đang tải lên...</Text>
                    </View>
                ) : null}
            </Pressable>
            {coverImage ? (
                <Pressable onPress={() => setCoverImage('')}>
                    <Text style={styles.removeLink}>Xoá ảnh bìa</Text>
                </Pressable>
            ) : null}

            {/* Title */}
            <Text style={styles.label}>Tiêu đề *</Text>
            <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Nhập tiêu đề truyện"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={200}
            />

            {/* Description */}
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Giới thiệu nội dung, thể loại, đối tượng độc giả..."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.textarea]}
                multiline
                maxLength={5000}
            />

            {/* Categories */}
            <Text style={styles.label}>Thể loại</Text>
            <View style={styles.chipRow}>
                {(categoriesQuery.data ?? []).map((c) => {
                    const selected = categoryIds.includes(c.id);
                    return (
                        <Pressable
                            key={c.id}
                            style={[styles.chip, selected && styles.chipActive]}
                            onPress={() => toggleCategory(c.id)}
                        >
                            <Text
                                style={[styles.chipText, selected && styles.chipTextActive]}
                            >
                                {c.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Country */}
            <Text style={styles.label}>Quốc gia</Text>
            <View style={styles.chipRow}>
                {COUNTRY_OPTIONS.map((o) => (
                    <Pressable
                        key={o.value}
                        style={[styles.chip, country === o.value && styles.chipActive]}
                        onPress={() => setCountry(o.value)}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                country === o.value && styles.chipTextActive,
                            ]}
                        >
                            {o.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Access type */}
            <Text style={styles.label}>Loại truy cập</Text>
            <View style={styles.optionStack}>
                {ACCESS_OPTIONS.map((o) => {
                    const selected = accessType === o.value;
                    return (
                        <Pressable
                            key={o.value}
                            style={[styles.optionRow, selected && styles.optionRowActive]}
                            onPress={() => setAccessType(o.value)}
                        >
                            <Ionicons
                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={selected ? colors.primary : colors.textMuted}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionLabel}>{o.label}</Text>
                                <Text style={styles.optionDesc}>{o.desc}</Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {accessType === 'VIP' ? (
                <>
                    <Text style={styles.label}>Giá truyện (xu) *</Text>
                    <TextInput
                        value={price}
                        onChangeText={setPrice}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={styles.input}
                    />
                </>
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
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
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
    textarea: { minHeight: 120, textAlignVertical: 'top' },
    coverBox: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        height: 200,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    coverImg: { width: '100%', height: '100%' },
    coverPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    coverHint: { color: colors.textMuted, fontSize: fontSize.sm },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    coverOverlayText: { color: colors.white, fontSize: fontSize.sm },
    removeLink: {
        color: colors.danger,
        fontSize: fontSize.xs,
        textDecorationLine: 'underline',
        marginTop: spacing.xs,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text, fontSize: fontSize.sm },
    chipTextActive: { color: colors.white, fontWeight: '700' },
    optionStack: { gap: spacing.sm },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    optionRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    optionLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
    optionDesc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    submitBtn: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    submitText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
