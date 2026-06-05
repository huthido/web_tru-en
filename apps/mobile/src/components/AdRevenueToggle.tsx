import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { StoriesApi } from '@/lib/api/stories.service';
import { MonetizationService } from '@/lib/api/monetization.service';
import { describeError } from '@/lib/error';
import type { RootNavigation } from '@/navigation/types';

interface Props {
    storyId: string;
    initialEnabled: boolean;
}

/**
 * Toggle "Nhận xu từ quảng cáo" mobile — Phase B2.1. Backend tự
 * assert eligibility khi bật (tắt thì không gate).
 */
export function AdRevenueToggle({ storyId, initialEnabled }: Props) {
    const nav = useNavigation<RootNavigation>();
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [enabled, setEnabled] = useState(initialEnabled);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEnabled(initialEnabled);
    }, [initialEnabled]);

    const eligibilityQ = useQuery({
        queryKey: ['monetization', 'eligibility', 'me'],
        queryFn: () => MonetizationService.getMyEligibility(),
        staleTime: 5 * 60 * 1000,
    });
    const monetizationLocked = !!eligibilityQ.data && !eligibilityQ.data.eligible;
    const lockedOn = !enabled && monetizationLocked;

    const onToggle = async (next: boolean) => {
        if (saving) return;
        setSaving(true);
        setEnabled(next);
        try {
            const r = await StoriesApi.setAdRevenue(storyId, next);
            setEnabled(r.adRevenueEnabled);
        } catch (err: any) {
            setEnabled(!next);
            const msg = describeError(err);
            const code = err?.response?.data?.code;
            Alert.alert(
                code === 'ELIGIBILITY_REQUIRED' ? 'Chưa đủ điều kiện' : 'Không lưu được',
                code === 'ELIGIBILITY_REQUIRED'
                    ? 'Bạn cần mở khoá tính năng nâng cao trước khi bật nhận xu quảng cáo.'
                    : msg,
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.wrap}>
            <View style={styles.row}>
                <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
                <Text style={styles.label}>Nhận xu từ quảng cáo</Text>
                <View style={{ flex: 1 }} />
                {saving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                <Switch
                    value={enabled}
                    onValueChange={onToggle}
                    disabled={saving || lockedOn}
                    trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                    thumbColor={colors.onPrimary}
                />
            </View>
            <Text style={styles.help}>
                Khi bật, hệ thống ghi nhận impression / click ads trên truyện này và chia xu vào ví đã kiếm hằng ngày.
            </Text>
            {monetizationLocked && !enabled && (
                <Pressable style={styles.lockedNotice} onPress={() => nav.navigate('Eligibility')}>
                    <Ionicons name="lock-closed-outline" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.lockedText}>
                        Cần mở khoá tính năng nâng cao — bấm để xem điều kiện
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    wrap: { marginTop: spacing.md, gap: spacing.xs },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    label: { ...typography.labelMd, color: colors.onSurface, fontFamily: 'DMSans_500Medium' },
    help: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: fontSize.xs },
    lockedNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceContainer,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    lockedText: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: fontSize.xs, flex: 1 },
});
