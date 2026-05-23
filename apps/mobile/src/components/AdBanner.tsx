import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fontSize, radius, spacing } from '@/theme';
import { resolveImageUrl } from '@/lib/url';
import { AdsApi, type AdPosition, type AdType } from '@/lib/api/ads.service';
import { useActiveAds } from '@/lib/hooks/ads';

interface Props {
    position: AdPosition;
    /** Optional ad type. Default BANNER. */
    type?: AdType;
    /** Override container style (margins, etc). */
    height?: number;
}

/**
 * Banner ad slot for mobile.
 *
 * - Fetches active ads matching {type, position} from the public endpoint.
 * - Tracks ONE impression per ad-render lifecycle (when image first loads).
 * - Rotates through multiple ads every 30s.
 * - Tapping the banner records a click and opens linkUrl in the system browser.
 */
export function AdBanner({ position, type = 'BANNER', height = 100 }: Props) {
    const { data: ads = [] } = useActiveAds(type, position);
    const valid = useMemo(() => ads.filter((a) => !!a.imageUrl && a.isActive), [ads]);

    const [index, setIndex] = useState(0);
    const trackedIdsRef = useRef<Set<string>>(new Set());

    // Rotate every 30s when multiple ads exist.
    useEffect(() => {
        if (valid.length <= 1) return;
        const id = setInterval(() => setIndex((i) => (i + 1) % valid.length), 30_000);
        return () => clearInterval(id);
    }, [valid.length]);

    // Reset index if ads list changes shape.
    useEffect(() => {
        setIndex(0);
    }, [valid.length]);

    const current = valid[index];

    const handleImpression = useCallback(() => {
        if (!current?.id) return;
        if (trackedIdsRef.current.has(current.id)) return;
        trackedIdsRef.current.add(current.id);
        AdsApi.trackImpression(current.id);
    }, [current?.id]);

    const handlePress = useCallback(async () => {
        if (!current?.id) return;
        AdsApi.trackClick(current.id);
        if (current.linkUrl) {
            try {
                await Linking.openURL(current.linkUrl);
            } catch {
                // Ignore — invalid URL or no handler.
            }
        }
    }, [current?.id, current?.linkUrl]);

    if (!current) return null;

    const resolved = resolveImageUrl(current.imageUrl);
    if (!resolved) return null;

    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>Quảng cáo</Text>
            <Pressable
                onPress={handlePress}
                disabled={!current.linkUrl}
                style={[styles.box, { height }]}
            >
                <Image
                    source={resolved}
                    style={styles.image}
                    contentFit="cover"
                    transition={180}
                    onLoad={handleImpression}
                />
                {current.title ? (
                    <View style={styles.titleOverlay}>
                        <Text numberOfLines={1} style={styles.title}>
                            {current.title}
                        </Text>
                    </View>
                ) : null}
                {valid.length > 1 ? (
                    <View style={styles.counter}>
                        <Text style={styles.counterText}>
                            {index + 1}/{valid.length}
                        </Text>
                    </View>
                ) : null}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
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
});
