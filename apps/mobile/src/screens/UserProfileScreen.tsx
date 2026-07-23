import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { fontSize, radius, spacing, typography, type ThemeColors } from '@/theme';
import { useAppTheme } from '@/contexts/theme-context';
import { AuthorsService } from '@/lib/api/authors.service';
import { StoryCover } from '@/components/StoryCover';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { formatNumber } from '@/lib/format';
import { useAuth } from '@/contexts/auth-context';
import type { RootNavigation, RootStackParamList } from '@/navigation/types';

const SCREEN_W = Dimensions.get('window').width;
// Grid 2 cột, content có padding 16 mỗi bên + gap 16 giữa.
const ITEM_W = Math.floor((SCREEN_W - spacing.lg * 2 - spacing.md) / 2);

/**
 * Trang cá nhân /u/[username] phiên bản mobile. Header card kiểu MXH +
 * 2 CTA (Theo dõi · Donate xu) + tab Tác phẩm.
 */
export const UserProfileScreen: React.FC = () => {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const route = useRoute<RouteProp<RootStackParamList, 'UserProfile'>>();
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const { user: me } = useAuth();
    const username = route.params.username;

    const profileQ = useQuery({
        queryKey: ['author', 'profile', username],
        queryFn: () => AuthorsService.getProfileByUsername(username),
    });

    const storiesQ = useQuery({
        queryKey: ['author', 'stories', profileQ.data?.id],
        queryFn: () => AuthorsService.listStories(profileQ.data!.id, 1, 12),
        enabled: !!profileQ.data?.id,
    });

    const [optimisticFollow, setOptimisticFollow] = useState<boolean | null>(null);
    const followMut = useMutation({
        mutationFn: (id: string) => AuthorsService.toggleFollow(id),
        onSuccess: (r) => {
            setOptimisticFollow(r.following);
            qc.invalidateQueries({ queryKey: ['author', 'profile', username] });
        },
        onError: () => setOptimisticFollow(null),
    });

    if (profileQ.isLoading || !profileQ.data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    const profile = profileQ.data;
    const isMe = !!me && me.id === profile.id;
    const following = optimisticFollow ?? profile.isFollowing;

    const onDonate = () => {
        // Donate mở tự do cho mọi tác giả — không gate theo eligibility.
        // TODO: navigate sang DonateAuthorModal/Screen tương ứng khi có.
        Alert.alert('Donate', 'Tính năng đang phát triển trên mobile.');
    };

    // Chia sẻ trang cá nhân qua khay chia sẻ hệ điều hành (đã gồm FB/Zalo/
    // Telegram/copy...). URL trỏ về bản web canonical.
    const onShare = async () => {
        const url = `https://yeuyeu.net/u/${encodeURIComponent(username)}`;
        try {
            await Share.share({
                message: `Trang cá nhân của ${profile.displayName || profile.username} trên YÊU: ${url}`,
                url,
            });
        } catch {
            /* user huỷ — bỏ qua */
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <View style={styles.avatarWrap}>
                        {profile.avatar ? (
                            <Image source={{ uri: profile.avatar }} style={styles.avatarImage} contentFit="cover" />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Ionicons name="person" size={48} color={colors.onSurfaceVariant} />
                            </View>
                        )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.name} numberOfLines={1}>
                                {profile.displayName || profile.username}
                            </Text>
                            <VerifiedBadge show={profile.isVerified} size={18} />
                        </View>
                        <Text style={styles.handle}>@{profile.username}</Text>
                        {profile.bio ? (
                            <Text style={styles.bio} numberOfLines={3}>
                                {profile.bio}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <Stat icon="book" label="truyện" value={profile.publishedStoriesCount} />
                    <Stat icon="eye" label="lượt xem" value={profile.totalViews} />
                    <Stat
                        icon="people"
                        label="followers"
                        value={profile.authorFollowerCount}
                        onPress={isMe ? () => nav.navigate('Followers') : undefined}
                    />
                </View>

                {isMe ? (
                    <View style={styles.ctaRow}>
                        <Pressable
                            onPress={() => nav.navigate('EditProfile')}
                            style={[styles.ctaBtn, styles.ctaBtnPrimary]}
                        >
                            <Ionicons name="create-outline" size={16} color={colors.onPrimary} />
                            <Text style={[styles.ctaText, styles.ctaTextPrimary]}>Sửa hồ sơ</Text>
                        </Pressable>
                        <Pressable onPress={onShare} style={[styles.ctaBtn, styles.ctaBtnGhost]}>
                            <Ionicons name="share-social-outline" size={16} color={colors.onSurface} />
                            <Text style={[styles.ctaText, styles.ctaTextGhost]}>Chia sẻ</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.ctaRow}>
                        <Pressable
                            onPress={() => followMut.mutate(profile.id)}
                            disabled={followMut.isPending}
                            style={[styles.ctaBtn, following ? styles.ctaBtnGhost : styles.ctaBtnPrimary]}
                        >
                            <Ionicons
                                name={following ? 'person' : 'person-add'}
                                size={16}
                                color={following ? colors.onSurface : colors.onPrimary}
                            />
                            <Text style={[styles.ctaText, following ? styles.ctaTextGhost : styles.ctaTextPrimary]}>
                                {following ? 'Đang theo dõi' : 'Theo dõi'}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={onDonate}
                            style={[styles.ctaBtn, styles.ctaBtnGhost]}
                        >
                            <Ionicons name="heart" size={16} color={colors.onSurface} />
                            <Text style={[styles.ctaText, styles.ctaTextGhost]}>Donate xu</Text>
                        </Pressable>

                        <Pressable onPress={onShare} style={[styles.ctaBtn, styles.ctaBtnGhost]}>
                            <Ionicons name="share-social-outline" size={16} color={colors.onSurface} />
                            <Text style={[styles.ctaText, styles.ctaTextGhost]}>Chia sẻ</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            <Text style={styles.sectionTitle}>Tác phẩm đã đăng</Text>

            {storiesQ.isLoading ? (
                <ActivityIndicator color={colors.primary} />
            ) : !storiesQ.data?.data.length ? (
                <Text style={styles.empty}>Tác giả chưa đăng truyện nào.</Text>
            ) : (
                <View style={styles.grid}>
                    {storiesQ.data.data.map((s) => (
                        <Pressable
                            key={s.id}
                            style={[styles.gridItem, { width: ITEM_W }]}
                            onPress={() => nav.navigate('StoryDetail', { slug: s.slug })}
                        >
                            <StoryCover uri={s.coverImage ?? undefined} width={ITEM_W} />
                            <Text style={styles.itemTitle} numberOfLines={2}>{s.title}</Text>
                            <View style={styles.itemMeta}>
                                <Ionicons name="eye-outline" size={12} color={colors.onSurfaceVariant} />
                                <Text style={styles.itemMetaText}>{formatNumber(s.viewCount)}</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

function Stat({ icon, label, value, onPress }: { icon: any; label: string; value: number; onPress?: () => void }) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const content = (
        <>
            <Ionicons name={icon} size={14} color={onPress ? colors.primary : colors.onSurfaceVariant} />
            <Text style={styles.statValue}>{formatNumber(value)}</Text>
            <Text style={[styles.statLabel, onPress && { color: colors.primary }]}>{label}</Text>
            {onPress ? <Ionicons name="chevron-forward" size={12} color={colors.primary} /> : null}
        </>
    );
    return onPress ? (
        <Pressable style={styles.stat} onPress={onPress}>{content}</Pressable>
    ) : (
        <View style={styles.stat}>{content}</View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg, gap: spacing.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    headerCard: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    headerTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    avatarWrap: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: colors.surfaceContainer },
    avatarImage: { width: 96, height: 96 },
    avatarFallback: {
        width: 96,
        height: 96,
        backgroundColor: colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 48,
    },
    name: { ...typography.headlineLg, color: colors.onSurface, fontSize: 22 },
    handle: { ...typography.bodySm, color: colors.onSurfaceVariant },
    bio: { ...typography.bodyMd, color: colors.onSurface, marginTop: spacing.xs },
    statsRow: { flexDirection: 'row', gap: spacing.md },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statValue: { ...typography.bodyMd, color: colors.onSurface, fontFamily: 'DMSans_700Bold' },
    statLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
    ctaRow: { flexDirection: 'row', gap: spacing.sm },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flex: 1,
        paddingVertical: 10,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    ctaBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    ctaBtnGhost: { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
    ctaBtnDisabled: { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, opacity: 0.5 },
    ctaText: { ...typography.labelMd, fontFamily: 'DMSans_500Medium' },
    ctaTextPrimary: { color: colors.onPrimary },
    ctaTextGhost: { color: colors.onSurface },
    sectionTitle: { ...typography.headlineSm, color: colors.onSurface, fontSize: 16, marginTop: spacing.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    gridItem: {},
    itemTitle: { ...typography.bodySm, color: colors.onSurface, marginTop: spacing.xs, fontFamily: 'DMSans_500Medium' },
    itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    itemMetaText: { ...typography.bodySm, fontSize: fontSize.xs, color: colors.onSurfaceVariant },
    empty: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', paddingVertical: spacing.lg },
});
