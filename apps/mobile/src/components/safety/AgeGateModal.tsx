import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { useSafety } from '@/contexts/safety-context';

/**
 * Blocking age & online-safety gate shown on first launch (Google Play
 * Families Policy). The user must confirm they are 18+ OR a responsible
 * parent/guardian of a child using the app, and must acknowledge the in-app
 * safety reminder, before any content/social feature is accessible.
 */
export function AgeGateModal() {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const { acknowledged, loading, acknowledge } = useSafety();

    if (loading || acknowledged) return null;

    return (
        <Modal visible animationType="fade" statusBarTranslucent transparent>
            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>Chào mừng đến với YÊU</Text>

                    <View style={styles.reminder}>
                        <Text style={styles.reminderTitle}>An toàn trực tuyến</Text>
                        <Text style={styles.reminderText}>
                            Ứng dụng có nội dung do người dùng tạo và các tính năng tương tác
                            (bình luận, đăng ảnh, theo dõi). Khi giao tiếp với người khác trên
                            mạng, hãy luôn{'\n'}· không chia sẻ thông tin cá nhân như địa chỉ, số điện thoại, trường học{'\n'}· báo cáo ngay nội dung hoặc người khiến bạn thấy không an toàn{'\n'}· cẩn trọng với người lạ — ngoài đời thực họ có thể không như bạn nghĩ
                        </Text>
                    </View>

                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmText}>
                            Tôi xác nhận tôi từ 18 tuổi trở lên, hoặc là phụ huynh / người giám
                            hộ của trẻ em đang sử dụng ứng dụng này, và tôi đã đọc kỹ lời nhắc an
                            toàn trực tuyến ở trên. Người giám hộ có thể quản lý tính năng xã hội
                            cho trẻ tại Cài đặt → An toàn & Quyền.
                        </Text>
                    </View>

                    <Pressable style={styles.cta} onPress={acknowledge}>
                        <Text style={styles.ctaText}>Tôi đã 18+ hoặc là phụ huynh · Đồng ý</Text>
                    </Pressable>
                </ScrollView>
            </View>
        </Modal>
    );
}

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            width: '100%',
            maxWidth: 480,
            gap: spacing.lg,
        },
        iconWrap: {
            width: 72,
            height: 72,
            borderRadius: radius.pill,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
        },
        title: { ...typography.headlineSm, color: colors.onSurface, textAlign: 'center' },
        reminder: {
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.xs,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
        },
        reminderTitle: { ...typography.labelMd, color: colors.primary },
        reminderText: {
            ...typography.bodySm,
            color: colors.onSurfaceVariant,
            lineHeight: 21,
        },
        confirmBox: {
            borderRadius: radius.md,
            padding: spacing.md,
            backgroundColor: colors.secondaryContainer,
        },
        confirmText: {
            ...typography.bodySm,
            color: colors.onSecondaryContainer,
            lineHeight: 21,
        },
        cta: {
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            paddingVertical: spacing.md,
            alignItems: 'center',
        },
        ctaText: { ...typography.labelMd, color: colors.onPrimary },
    });
