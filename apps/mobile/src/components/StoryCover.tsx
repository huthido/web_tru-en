import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { resolveImageUrl } from '../lib/url';

interface Props {
    uri?: string | null;
    width: number;
    rounded?: number;
    style?: ViewStyle;
}

/** Story cover thumbnail at a fixed 3:4 portrait ratio, with a fallback. */
export function StoryCover({ uri, width, rounded = radius.md, style }: Props) {
    const height = (width * 4) / 3;
    const resolved = resolveImageUrl(uri);
    return (
        <View
            style={[
                { width, height, borderRadius: rounded, backgroundColor: colors.primarySoft },
                styles.box,
                style,
            ]}
        >
            {resolved ? (
                <Image
                    source={resolved}
                    style={{ width, height }}
                    contentFit="cover"
                    transition={180}
                />
            ) : (
                <View style={styles.fallback}>
                    <Ionicons name="book" size={width * 0.34} color={colors.primary} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    box: { overflow: 'hidden' },
    fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
