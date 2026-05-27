'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/api/hooks/use-auth';
import {
  useIsFollowingAuthor,
  useToggleAuthorFollow,
} from '@/lib/api/hooks/use-authors';

interface QuickFollowAuthorButtonProps {
  authorId: string;
  /** Compact variant — chỉ icon + nhãn ngắn, để nhúng cạnh tên tác giả. */
  compact?: boolean;
  className?: string;
}

/**
 * Khác với `<FollowAuthorButton>` (cần `initialFollowing` prop): cái này
 * tự fetch trạng thái follow → dùng được ở mọi chỗ chỉ biết `authorId`
 * (story detail, donate modal, search result, ...).
 *
 * Ẩn nút khi user đang xem chính mình (không tự follow). Nếu chưa login,
 * tap → redirect `/login?redirect=<current>`.
 */
export function QuickFollowAuthorButton({
  authorId,
  compact = false,
  className = '',
}: QuickFollowAuthorButtonProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const isMe = isAuthenticated && user?.id === authorId;

  const { data } = useIsFollowingAuthor(authorId, isAuthenticated && !isMe);
  const toggle = useToggleAuthorFollow();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  if (isMe) return null;

  const following = optimistic ?? !!data?.following;

  const onClick = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setOptimistic(!following);
    try {
      const r = await toggle.mutateAsync(authorId);
      setOptimistic(r.following);
    } catch {
      setOptimistic(following);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={toggle.isPending}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          following
            ? 'bg-surface-variant text-on-surface-variant'
            : 'bg-primary text-on-primary hover:bg-primary/90'
        } ${className}`}
      >
        {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
        {following ? 'Đang theo dõi' : 'Theo dõi'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        following
          ? 'bg-surface-variant hover:bg-surface-container-high text-on-surface'
          : 'bg-primary hover:bg-primary/90 text-on-primary'
      } ${className}`}
    >
      {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
      {following ? 'Đang theo dõi' : 'Theo dõi'}
    </button>
  );
}
