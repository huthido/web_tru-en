import React from 'react';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '@/theme';
import type { RootNavigation } from '@/navigation/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Row {
    icon: IoniconName;
    label: string;
    sub?: string;
    onPress: () => void;
    danger?: boolean;
}

interface Section {
    title: string;
    rows: Row[];
}

async function openExternal(url: string) {
    try {
        await Linking.openURL(url);
    } catch {
        Alert.alert('Không mở được', 'Hãy kiểm tra kết nối mạng và thử lại.');
    }
}

export const SettingsScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();
    const appVersion =
        (Constants?.expoConfig?.version as string | undefined) ||
        (Constants?.manifest as { version?: string } | undefined)?.version ||
        '0.1.0';

    const sections: Section[] = [
        {
            title: 'Tài khoản',
            rows: [
                {
                    icon: 'notifications-outline',
                    label: 'Thông báo',
                    sub: 'Xem thông báo và đánh dấu đã đọc',
                    onPress: () => nav.navigate('Notifications'),
                },
                {
                    icon: 'wallet-outline',
                    label: 'Lịch sử giao dịch',
                    sub: 'Nạp / rút / mua chương / nhận xu',
                    onPress: () => nav.navigate('Transactions'),
                },
            ],
        },
        {
            title: 'Hỗ trợ',
            rows: [
                {
                    icon: 'shield-checkmark-outline',
                    label: 'Chính sách bảo mật',
                    onPress: () => openExternal('https://yeuyeu.net/privacy'),
                },
                {
                    icon: 'document-text-outline',
                    label: 'Điều khoản sử dụng',
                    onPress: () => openExternal('https://yeuyeu.net/terms'),
                },
                {
                    icon: 'mail-outline',
                    label: 'Hỗ trợ & Phản ánh',
                    onPress: () => openExternal('https://yeuyeu.net/gop-y-phan-anh'),
                },
            ],
        },
    ];

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {sections.map((sec) => (
                <View key={sec.title} style={styles.section}>
                    <Text style={styles.sectionLabel}>{sec.title.toUpperCase()}</Text>
                    <View style={styles.group}>
                        {sec.rows.map((row, idx) => (
                            <Pressable
                                key={row.label}
                                onPress={row.onPress}
                                style={[
                                    styles.row,
                                    idx !== sec.rows.length - 1 && styles.rowDivider,
                                ]}
                            >
                                <Ionicons
                                    name={row.icon}
                                    size={20}
                                    color={row.danger ? colors.error : colors.onSurfaceVariant}
                                />
                                <View style={styles.rowBody}>
                                    <Text
                                        style={[
                                            styles.rowLabel,
                                            row.danger && { color: colors.error },
                                        ]}
                                    >
                                        {row.label}
                                    </Text>
                                    {row.sub ? (
                                        <Text style={styles.rowSub} numberOfLines={1}>
                                            {row.sub}
                                        </Text>
                                    ) : null}
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color={colors.onSurfaceVariant}
                                />
                            </Pressable>
                        ))}
                    </View>
                </View>
            ))}

            <View style={styles.footer}>
                <Text style={styles.footerText}>Yêu · phiên bản {appVersion}</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.lg },
    section: { gap: spacing.sm },
    sectionLabel: {
        ...typography.labelSm,
        color: colors.onSurfaceVariant,
        paddingHorizontal: spacing.xs,
    },
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
    rowLabel: { ...typography.bodyMd, color: colors.onSurface },
    rowSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    footerText: { ...typography.bodySm, color: colors.onSurfaceVariant },
});
