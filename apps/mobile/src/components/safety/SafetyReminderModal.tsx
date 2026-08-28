import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';

interface Props {
    visible: boolean;
    /** Short label describing the interaction, e.g. "gửi bình luận", "đăng ảnh". */
    action: string;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Prominent in-app safety reminder shown BEFORE the user shares freeform
 * content or interacts with others (Google Play Families Policy). Blocks the
 * action until confirmed.
 */
export function SafetyReminderModal({ visible, action, onCancel, onConfirm }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="warning-outline" size={34} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>Nhắc nhở an toàn</Text>
                    <Text style={styles.body}>
                        Trước khi {action}, hãy nhớ: hãy an toàn trên mạng và cẩn thận với rủi ro
                        thực tế khi giao tiếp trực tuyến. Không chia sẻ thông tin cá nhân (địa chỉ,
                        số điện thoại, trường học…) với người lạ và hãy báo cáo ngay nội dung hoặc
                        người khiến bạn thấy không an toàn.
                    </Text>
                    <Text style={styles.body}>
                        Nếu bạn dưới 18 tuổi, vui lòng hỏi ý kiến phụ huynh hoặc người giám hộ
                        trước khi tiếp tục.
                    </Text>
                    <View style={styles.actions}>
                        <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
                            <Text style={[styles.btnText, { color: colors.onSurfaceVariant }]}>
                                Huỷ
                            </Text>
                        </Pressable>
                        <Pressable style={[styles.btn, styles.confirmBtn]} onPress={onConfirm}>
                            <Text style={[styles.btnText, { color: colors.onPrimary }]}>Tôi hiểu</Text>
                        </Pressable>
                    </View>
                </View>
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
            maxWidth: 420,
            gap: spacing.md,
        },
        iconWrap: {
            width: 60,
            height: 60,
            borderRadius: radius.pill,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
        },
        title: { ...typography.headlineSm, color: colors.onSurface, textAlign: 'center' },
        body: {
            ...typography.bodySm,
            color: colors.onSurfaceVariant,
            lineHeight: 21,
        },
        actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
        btn: {
            flex: 1,
            borderRadius: radius.lg,
            paddingVertical: spacing.md,
            alignItems: 'center',
        },
        cancelBtn: { backgroundColor: colors.surfaceContainerHigh },
        confirmBtn: { backgroundColor: colors.primary },
        btnText: { ...typography.labelMd },
    });
