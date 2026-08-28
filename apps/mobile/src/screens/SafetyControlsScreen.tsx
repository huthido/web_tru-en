import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useSafety } from '@/contexts/safety-context';
import { useAuth } from '@/contexts/auth-context';
import { UsersApi } from '@/lib/api/users.service';
import type { SocialControls } from '@/lib/safety';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ControlRow {
    key: keyof SocialControls;
    icon: IoniconName;
    title: string;
    desc: string;
}

const ROWS: ControlRow[] = [
    {
        key: 'comments',
        icon: 'chatbubbles-outline',
        title: 'Bình luận',
        desc: 'Cho phép xem và gửi bình luận dưới bài viết / truyện.',
    },
    {
        key: 'artUpload',
        icon: 'image-outline',
        title: 'Đăng ảnh nghệ thuật',
        desc: 'Cho phép chia sẻ ảnh và câu chuyện (feed nghệ thuật).',
    },
    {
        key: 'follow',
        icon: 'person-add-outline',
        title: 'Theo dõi tác giả',
        desc: 'Cho phép theo dõi và kết nối với người dùng khác.',
    },
];

/**
 * Adult / parent controls for social features — Google Play Families Policy
 * ("a method for adults to manage social features for child users").
 *
 * An adult can enable/disable each social capability in one place. The flags
 * gate the corresponding client UIs.
 */
export const SafetyControlsScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const { controls, setControl, allowAdultContent, setAllowAdultContent } = useSafety();
    const { isAuthenticated } = useAuth();
    const [didChange, setDidChange] = useState(false);

    const toggleAdult = (value: boolean) => {
        setAllowAdultContent(value);
        setDidChange(true);
        // Đồng bộ lên tài khoản (nếu đã đăng nhập) để API xác thực biết.
        if (isAuthenticated) {
            UsersApi.setAllowAdultContent(value).catch(() => {
                /* best-effort — local flag vẫn có hiệu lực cho request ?adult=1 */
            });
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.notice}>
                <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
                <Text style={styles.noticeText}>
                    Phần này dành cho phụ huynh / người giám hộ. Bạn có thể bật hoặc tắt từng tính
                    năng xã hội cho trẻ sử dụng ứng dụng. Vô hiệu hoá tính năng sẽ ẩn công cụ tương
                    ứng trong ứng dụng.
                </Text>
            </View>

            <View style={styles.group}>
                {ROWS.map((row, idx) => {
                    const value = controls[row.key];
                    return (
                        <View
                            key={row.key}
                            style={[
                                styles.row,
                                idx !== ROWS.length - 1 && styles.rowDivider,
                            ]}
                        >
                            <Ionicons name={row.icon} size={22} color={colors.onSurfaceVariant} />
                            <View style={styles.rowBody}>
                                <Text style={styles.rowTitle}>{row.title}</Text>
                                <Text style={styles.rowDesc}>{row.desc}</Text>
                            </View>
                            <Switch
                                value={value}
                                onValueChange={(v) => {
                                    setControl(row.key, v);
                                    setDidChange(true);
                                }}
                                trackColor={{ false: colors.outlineVariant, true: colors.primary }}
                                thumbColor={colors.surfaceBright}
                            />
                        </View>
                    );
                })}
            </View>

            {/* Nội dung người lớn — 18+. */}
            <View style={styles.adultGroup}>
                <View style={styles.row}>
                    <Ionicons name="warning-outline" size={22} color={colors.error} />
                    <View style={styles.rowBody}>
                        <Text style={styles.adultTitle}>Xem nội dung người lớn (18+)</Text>
                        <Text style={styles.rowDesc}>
                            Bật để hiển thị truyện người lớn (MATURE). Quyền này do phụ huynh / người
                            giám hộ cấp cho tài khoản trẻ, hoặc bạn xác nhận đã đủ 18 tuổi.
                        </Text>
                    </View>
                    <Switch
                        value={allowAdultContent}
                        onValueChange={(v) => toggleAdult(v)}
                        trackColor={{ false: colors.outlineVariant, true: colors.error }}
                        thumbColor={colors.surfaceBright}
                    />
                </View>
            </View>

            {didChange ? (
                <View style={styles.saved}>
                    <Text style={styles.savedText}>Đã lưu thay đổi trên thiết bị này.</Text>
                </View>
            ) : null}
        </ScrollView>
    );
};

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: spacing.lg, gap: spacing.lg },
        notice: {
            flexDirection: 'row',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: colors.primaryContainer,
        },
        noticeText: { ...typography.bodySm, color: colors.onPrimaryContainer, flex: 1, lineHeight: 21 },
        group: {
            backgroundColor: colors.surfaceContainerLowest,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            overflow: 'hidden',
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
        },
        rowDivider: {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outlineVariant,
        },
        rowBody: { flex: 1, gap: 2 },
        rowTitle: { ...typography.bodyMd, color: colors.onSurface },
        rowDesc: { ...typography.bodySm, color: colors.onSurfaceVariant },
        adultGroup: {
            backgroundColor: colors.errorContainer,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.error,
            overflow: 'hidden',
        },
        adultTitle: { ...typography.bodyMd, color: colors.onErrorContainer },
        saved: {
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.secondaryContainer,
        },
        savedText: { ...typography.bodySm, color: colors.onSecondaryContainer },
    });
