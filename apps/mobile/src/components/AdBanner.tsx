import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { fontSize, radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { resolveImageUrl } from '@/lib/url';
import { AdsApi, type Ad, type AdPosition, type AdType } from '@/lib/api/ads.service';
import { useActiveAds } from '@/lib/hooks/ads';

interface Props {
    position: AdPosition;
    /** Optional ad type. Default BANNER. */
    type?: AdType;
    /** Override container style (margins, etc). */
    height?: number;
}

/**
 * Banner ad slot — router theo `sourceType`:
 * - SELF_SERVED → Image của expo-image + manual tracking (logic cũ).
 * - GOOGLE_ADMOB → `<AdmobBanner />` stub. Khi user đã EAS build với
 *   `react-native-google-mobile-ads`, uncomment block init + render BannerAd.
 * - GOOGLE_ADSENSE / CUSTOM_SCRIPT → bỏ qua (đã filter server-side với
 *   platform=mobile; check thêm phòng race).
 * - FAN → tương tự AdMob, defer (Facebook Audience Network SDK).
 *
 * Mobile backend gọi `/ads/active?platform=mobile` đã loại web-only types.
 */
export function AdBanner({ position, type = 'BANNER', height = 100 }: Props) {
    const { data: ads = [] } = useActiveAds(type, position);
    const valid = useMemo(
        () =>
            ads.filter(
                (a) =>
                    a.isActive &&
                    a.sourceType !== 'GOOGLE_ADSENSE' &&
                    a.sourceType !== 'CUSTOM_SCRIPT',
            ),
        [ads],
    );

    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (valid.length <= 1) return;
        const id = setInterval(() => setIndex((i) => (i + 1) % valid.length), 30_000);
        return () => clearInterval(id);
    }, [valid.length]);

    useEffect(() => {
        setIndex(0);
    }, [valid.length]);

    const current = valid[index];
    if (!current) return null;

    switch (current.sourceType) {
        case 'GOOGLE_ADMOB':
            return <AdmobBannerStub ad={current} height={height} />;
        case 'FAN':
            return <FanBannerStub ad={current} height={height} />;
        case 'SELF_SERVED':
        default:
            return (
                <SelfServedBanner
                    ad={current}
                    height={height}
                    rotationCount={valid.length}
                    rotationIndex={index}
                />
            );
    }
}

function SelfServedBanner({
    ad,
    height,
    rotationCount,
    rotationIndex,
}: {
    ad: Ad;
    height: number;
    rotationCount: number;
    rotationIndex: number;
}) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const trackedIdsRef = useRef<Set<string>>(new Set());

    const handleImpression = useCallback(() => {
        if (!ad.id) return;
        if (trackedIdsRef.current.has(ad.id)) return;
        trackedIdsRef.current.add(ad.id);
        AdsApi.trackImpression(ad.id);
    }, [ad.id]);

    const handlePress = useCallback(async () => {
        if (!ad.id) return;
        AdsApi.trackClick(ad.id);
        if (ad.linkUrl) {
            try {
                await Linking.openURL(ad.linkUrl);
            } catch {
                // Ignore — invalid URL or no handler.
            }
        }
    }, [ad.id, ad.linkUrl]);

    const resolved = resolveImageUrl(ad.imageUrl);
    if (!resolved) return null;

    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>Quảng cáo</Text>
            <Pressable onPress={handlePress} disabled={!ad.linkUrl} style={[styles.box, { height }]}>
                <Image
                    source={resolved}
                    style={styles.image}
                    contentFit="cover"
                    transition={180}
                    onLoad={handleImpression}
                />
                {ad.title ? (
                    <View style={styles.titleOverlay}>
                        <Text numberOfLines={1} style={styles.title}>
                            {ad.title}
                        </Text>
                    </View>
                ) : null}
                {rotationCount > 1 ? (
                    <View style={styles.counter}>
                        <Text style={styles.counterText}>
                            {rotationIndex + 1}/{rotationCount}
                        </Text>
                    </View>
                ) : null}
            </Pressable>
        </View>
    );
}

/**
 * AdMob banner render bằng `react-native-google-mobile-ads`. SDK được init
 * trong App.tsx sau khi ATT permission (iOS 14.5+) đã được hỏi.
 *
 * `__DEV__` (Metro dev mode) tự dùng `TestIds.BANNER` để khỏi vi phạm AdMob
 * policy khi develop. Prod build dùng `adUnitId` thật từ admin form.
 */
function AdmobBannerStub({ ad, height }: { ad: Ad; height: number }) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const realUnitId = ad.networkConfig?.adUnitId;
    if (!realUnitId) return null;

    const unitId = __DEV__ ? TestIds.BANNER : realUnitId;

    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>Quảng cáo</Text>
            <View style={[styles.box, { height, justifyContent: 'center', alignItems: 'center' }]}>
                <BannerAd
                    unitId={unitId}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    requestOptions={{
                        // Tôn trọng ATT — nếu user từ chối tracking, gửi ad non-personalized.
                        // Tạm thời để false (personalized) ở placeholder; khi mobile có consent
                        // sheet sẽ đọc state đó để tinh chỉnh.
                        requestNonPersonalizedAdsOnly: false,
                    }}
                />
            </View>
        </View>
    );
}

/** FAN stub — Facebook Audience Network. Cần `react-native-fbads` + Facebook SDK config. */
function FanBannerStub({ ad, height }: { ad: Ad; height: number }) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const placementId = ad.networkConfig?.placementId;
    if (!placementId) return null;
    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>Quảng cáo</Text>
            <View style={[styles.stubBox, { height }]}>
                <Text style={styles.stubText}>FAN placement: {placementId}</Text>
                <Text style={styles.stubHint}>Chưa cài react-native-fbads</Text>
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    wrapper: {
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
    },
    label: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    box: {
        width: '100%',
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.primarySoft,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    titleOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    title: {
        color: colors.white,
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
    counter: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    counterText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: '600',
    },
    stubBox: {
        width: '100%',
        borderRadius: radius.md,
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
    },
    stubText: {
        fontSize: fontSize.xs,
        color: colors.text,
        fontWeight: '600',
        textAlign: 'center',
    },
    stubHint: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 4,
        textAlign: 'center',
    },
});
