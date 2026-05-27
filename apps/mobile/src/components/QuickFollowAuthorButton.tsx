import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, radius, spacing, typography } from '@/theme';
import { AuthorsService } from '@/lib/api/authors.service';
import { useAuth } from '@/contexts/auth-context';

interface Props {
    authorId: string;
    compact?: boolean;
}

/** Nút "Theo dõi tác giả" tự fetch state — nhúng cạnh tên tác giả ở mọi screen. */
export function QuickFollowAuthorButton({ authorId, compact = false }: Props) {
    const qc = useQueryClient();
    const { user, isAuthenticated } = useAuth();
    const isMe = isAuthenticated && user?.id === authorId;

    const statusQ = useQuery({
        queryKey: ['author', 'is-following', authorId],
        queryFn: () => AuthorsService.isFollowing(authorId),
        enabled: isAuthenticated && !isMe,
        staleTime: 60 * 1000,
    });

    const mut = useMutation({
        mutationFn: () => AuthorsService.toggleFollow(authorId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['author', 'is-following', authorId] });
            qc.invalidateQueries({ queryKey: ['author', 'profile'] });
        },
    });

    const [optimistic, setOptimistic] = useState<boolean | null>(null);

    if (isMe) return null;
    const following = optimistic ?? !!statusQ.data?.following;

    const onPress = async () => {
        if (!isAuthenticated) {
            Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để theo dõi tác giả.');
            return;
        }
        setOptimistic(!following);
        try {
            const r = await mut.mutateAsync();
            setOptimistic(r.following);
        } catch {
            setOptimistic(following);
        }
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={mut.isPending}
            style={[
                compact ? styles.compactBtn : styles.btn,
                following ? styles.ghost : styles.primary,
            ]}
        >
            <Ionicons
                name={following ? 'checkmark' : 'add'}
                size={compact ? 12 : 14}
                color={following ? colors.onSurface : colors.onPrimary}
            />
            <Text
                style={[
                    compact ? styles.compactText : styles.text,
                    { color: following ? colors.onSurface : colors.onPrimary },
                ]}
            >
                {following ? 'Đang theo dõi' : 'Theo dõi'}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    compactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.sm,
    },
    primary: { backgroundColor: colors.primary },
    ghost: { backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.outlineVariant },
    text: { ...typography.labelMd, fontFamily: 'DMSans_500Medium' },
    compactText: { ...typography.labelSm, fontFamily: 'DMSans_500Medium', fontSize: fontSize.xs },
});
