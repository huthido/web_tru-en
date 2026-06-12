import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import type { ArtStory } from '@/lib/api/art.service';

interface Props {
    stories: ArtStory[];
    isLoggedIn: boolean;
    onAddStory?: () => void;
}

export function ArtStoryRing({ stories, isLoggedIn, onAddStory }: Props) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [viewing, setViewing] = useState<ArtStory | null>(null);

    const { width } = Dimensions.get('window');

    const renderItem = ({ item }: { item: ArtStory }) => (
        <Pressable onPress={() => setViewing(item)} style={styles.storySlot}>
            <View style={[styles.ring, item.seenByMe ? styles.ringSeen : styles.ringUnseen]}>
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.avatar}
                    resizeMode="cover"
                />
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
                {item.user.displayName || item.user.username}
            </Text>
        </Pressable>
    );

    if (!isLoggedIn && stories.length === 0) return null;

    return (
        <>
            <FlatList
                horizontal
                data={stories}
                keyExtractor={(s) => s.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                ListHeaderComponent={
                    isLoggedIn ? (
                        <Pressable onPress={onAddStory} style={styles.storySlot}>
                            <View style={[styles.ring, styles.addRing]}>
                                <Ionicons name="add" size={26} color={colors.primary} />
                            </View>
                            <Text style={styles.storyName} numberOfLines={1}>
                                Thêm story
                            </Text>
                        </Pressable>
                    ) : null
                }
                renderItem={renderItem}
            />

            <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
                <Pressable style={styles.overlay} onPress={() => setViewing(null)}>
                    {viewing && (
                        <View style={[styles.storyViewer, { width: width - 32 }]}>
                            <Image
                                source={{ uri: viewing.imageUrl }}
                                style={[styles.storyImg, { width: width - 32, height: (width - 32) * 1.5 }]}
                                resizeMode="cover"
                            />
                            <View style={styles.storyInfo}>
                                <View style={styles.storyUserRow}>
                                    <Ionicons name="person-circle" size={28} color={colors.onSurface} />
                                    <Text style={[styles.storyUsername, { color: colors.onSurface }]}>
                                        {viewing.user.displayName || viewing.user.username}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </Pressable>
            </Modal>
        </>
    );
}

const makeStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        row: { paddingHorizontal: spacing.lg, gap: spacing.md },
        storySlot: { alignItems: 'center', gap: 4, width: 64 },
        ring: {
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            overflow: 'hidden',
        },
        ringUnseen: { borderColor: '#e05080' },
        ringSeen: { borderColor: colors.outlineVariant },
        addRing: { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow },
        avatar: { width: 54, height: 54, borderRadius: 27 },
        storyName: { fontSize: 10, color: colors.onSurfaceVariant, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
        storyViewer: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
        storyImg: { borderRadius: radius.lg },
        storyInfo: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md },
        storyUserRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        storyUsername: { fontFamily: 'DMSans_700Bold', fontSize: 14 },
    });
