import React, { useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { UsersApi } from '@/lib/api/users.service';
import { normalizeImageToTarget } from '@/lib/image/normalize';
import { describeError } from '@/lib/error';
import type { RootNavigation } from '@/navigation/types';

const AVATAR_TARGET_BYTES = 500 * 1024;
const BIO_MAX = 500;

export const EditProfileScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const { user, refreshUser } = useAuth();

    const [displayName, setDisplayName] = useState(user?.displayName ?? '');
    const [bio, setBio] = useState(user?.bio ?? '');
    const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const pickAvatar = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Thiếu quyền', 'App cần truy cập thư viện ảnh để đổi ảnh đại diện.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (result.canceled || !result.assets[0]) return;
            const asset = result.assets[0];
            setUploading(true);
            const normalized = await normalizeImageToTarget(
                asset.uri,
                { maxWidth: 512, compress: 0.85 },
                AVATAR_TARGET_BYTES,
            );
            const { avatar: url } = await UsersApi.uploadAvatar({
                uri: normalized.uri,
                name: asset.fileName ?? 'avatar.jpg',
                type: 'image/jpeg',
            });
            setAvatar(url);
        } catch (err) {
            Alert.alert('Lỗi upload', describeError(err));
        } finally {
            setUploading(false);
        }
    };

    const onSave = async () => {
        const name = displayName.trim();
        if (!name) {
            Alert.alert('Thiếu thông tin', 'Tên hiển thị không được để trống.');
            return;
        }
        setSaving(true);
        try {
            await UsersApi.updateProfile({
                displayName: name,
                bio: bio.trim(),
                avatar: avatar ?? undefined,
            });
            await refreshUser();
            // Làm mới trang cá nhân công khai đang cache.
            qc.invalidateQueries({ queryKey: ['author', 'profile'] });
            Alert.alert('Đã lưu', 'Hồ sơ của bạn đã được cập nhật.');
            nav.goBack();
        } catch (err) {
            Alert.alert('Không lưu được', describeError(err));
        } finally {
            setSaving(false);
        }
    };

    const initial = (displayName || user?.username || '?').trim().charAt(0).toUpperCase();

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
                <Pressable style={styles.avatarWrap} onPress={pickAvatar} disabled={uploading}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Text style={styles.avatarInitial}>{initial}</Text>
                        </View>
                    )}
                    <View style={styles.avatarBadge}>
                        {uploading ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                            <Ionicons name="camera" size={16} color={colors.onPrimary} />
                        )}
                    </View>
                </Pressable>
                <Pressable onPress={pickAvatar} disabled={uploading}>
                    <Text style={styles.avatarHint}>Đổi ảnh đại diện</Text>
                </Pressable>
            </View>

            {/* Tên hiển thị */}
            <View style={styles.field}>
                <Text style={styles.label}>Tên hiển thị</Text>
                <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Tên hiển thị của bạn"
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={styles.input}
                    maxLength={100}
                />
            </View>

            {/* Bio */}
            <View style={styles.field}>
                <Text style={styles.label}>Giới thiệu</Text>
                <TextInput
                    value={bio}
                    onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                    placeholder="Vài dòng giới thiệu — hiển thị trên trang cá nhân công khai."
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={[styles.input, styles.textarea]}
                    multiline
                    maxLength={BIO_MAX}
                />
                <Text style={styles.counter}>{bio.length}/{BIO_MAX}</Text>
            </View>

            <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={onSave}
                disabled={saving || uploading}
            >
                {saving ? (
                    <ActivityIndicator color={colors.onPrimary} />
                ) : (
                    <>
                        <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                        <Text style={styles.saveText}>Lưu thay đổi</Text>
                    </>
                )}
            </Pressable>
        </ScrollView>
    );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 },
    avatarSection: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    avatarWrap: {
        width: 104, height: 104, borderRadius: 52,
        backgroundColor: colors.surfaceContainer, overflow: 'visible',
    },
    avatar: { width: 104, height: 104, borderRadius: 52 },
    avatarFallback: {
        width: 104, height: 104, borderRadius: 52,
        backgroundColor: colors.tertiaryContainer,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitial: { color: colors.tertiary, fontSize: 40, fontFamily: 'PlusJakartaSans_700Bold' },
    avatarBadge: {
        position: 'absolute', right: 0, bottom: 0,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.background,
    },
    avatarHint: { ...typography.labelMd, color: colors.primary, fontFamily: 'DMSans_500Medium' },
    field: { gap: spacing.xs },
    label: { ...typography.labelMd, color: colors.onSurfaceVariant },
    input: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.outlineVariant,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        color: colors.onSurface, fontSize: fontSize.md,
        fontFamily: 'DMSans_400Regular',
    },
    textarea: { minHeight: 110, textAlignVertical: 'top' },
    counter: { ...typography.bodySm, fontSize: fontSize.xs, color: colors.onSurfaceVariant, textAlign: 'right' },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: colors.primary,
        borderRadius: radius.md, paddingVertical: spacing.md,
        marginTop: spacing.sm,
    },
    saveText: { ...typography.labelMd, color: colors.onPrimary, fontFamily: 'DMSans_700Bold' },
});
