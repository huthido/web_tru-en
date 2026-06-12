import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import * as ImagePicker from 'expo-image-picker';
import { radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useCreateArtPost } from '@/lib/hooks/art';

interface Props {
    onClose: () => void;
}

export function ArtUploadModal({ onClose }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [caption, setCaption] = useState('');

    const { mutate: createPost, isPending } = useCreateArtPost();

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh trong Cài đặt.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
            setImage(result.assets[0]);
        }
    };

    const handlePost = () => {
        if (!image) return;
        createPost(
            {
                file: { uri: image.uri, name: 'art.jpg', type: image.mimeType ?? 'image/jpeg' },
                caption: caption.trim() || undefined,
                width: image.width,
                height: image.height,
            },
            { onSuccess: onClose },
        );
    };

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.sheet}
            >
                <View style={styles.handle} />
                <View style={styles.header}>
                    <Text style={styles.title}>Đăng ảnh nghệ thuật</Text>
                    <Pressable onPress={onClose} hitSlop={10}>
                        <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
                    </Pressable>
                </View>

                <View style={styles.body}>
                    {/* Image picker */}
                    {image ? (
                        <View style={styles.previewWrap}>
                            <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
                            <Pressable
                                style={styles.removeBtn}
                                onPress={() => setImage(null)}
                            >
                                <Ionicons name="close-circle" size={24} color="#fff" />
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable style={styles.pickZone} onPress={pickImage}>
                            <Ionicons name="image-outline" size={40} color={colors.onSurfaceVariant} />
                            <Text style={styles.pickText}>Chọn ảnh từ thư viện</Text>
                            <Text style={styles.pickHint}>PNG · JPG · WEBP</Text>
                        </Pressable>
                    )}

                    {/* Caption */}
                    <TextInput
                        style={styles.captionInput}
                        value={caption}
                        onChangeText={setCaption}
                        placeholder="Viết mô tả... (tuỳ chọn)"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        maxLength={500}
                        numberOfLines={3}
                    />
                    <Text style={styles.charCount}>{caption.length}/500</Text>

                    {/* Submit */}
                    <Pressable
                        style={[styles.postBtn, (!image || isPending) && { opacity: 0.4 }]}
                        disabled={!image || isPending}
                        onPress={handlePost}
                    >
                        {isPending ? (
                            <ActivityIndicator color={colors.onSurface} />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={18} color={colors.onSurface} />
                                <Text style={styles.postBtnText}>Đăng bài</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
        sheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        },
        handle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.outlineVariant,
            alignSelf: 'center',
            marginTop: spacing.sm,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outlineVariant,
        },
        title: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: colors.onSurface },
        body: { padding: spacing.lg, gap: spacing.md },
        pickZone: {
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.outlineVariant,
            borderRadius: radius.lg,
            paddingVertical: spacing.xxl,
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surfaceContainerLow,
        },
        pickText: { fontSize: 14, color: colors.onSurfaceVariant, fontFamily: 'DMSans_500Medium' },
        pickHint: { fontSize: 12, color: colors.onSurfaceVariant, fontFamily: 'DMSans_400Regular', opacity: 0.6 },
        previewWrap: { position: 'relative', borderRadius: radius.lg, overflow: 'hidden' },
        preview: { width: '100%', height: 220, borderRadius: radius.lg },
        removeBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm },
        captionInput: {
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontSize: 14,
            fontFamily: 'DMSans_400Regular',
            color: colors.onSurface,
            minHeight: 80,
            textAlignVertical: 'top',
        },
        charCount: { fontSize: 11, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: -spacing.sm },
        postBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: radius.lg,
            paddingVertical: spacing.md,
        },
        postBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: colors.onSurface },
    });
