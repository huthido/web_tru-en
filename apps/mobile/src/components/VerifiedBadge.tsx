import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface Props {
    show?: boolean;
    size?: number;
}

/** Tick xanh ✓ cho tác giả đã mở khoá tính năng nâng cao. */
export function VerifiedBadge({ show = true, size = 16 }: Props) {
    if (!show) return null;
    return <Ionicons name="checkmark-circle" size={size} color={colors.primary} />;
}
