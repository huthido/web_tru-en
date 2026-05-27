'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useToggleAuthorFollow } from '@/lib/api/hooks/use-authors';

interface FollowAuthorButtonProps {
  authorId: string;
  initialFollowing: boolean;
  className?: string;
}

/**
 * Nút "Theo dõi tác giả" cho trang cá nhân /u/[username]. Optimistic UI:
 * đổi nhãn ngay, hook tự invalidate cache profile khi server trả về.
 *
 * Khác với `<FollowButton>` trong components/stories/ — cái đó theo dõi
 * *truyện* (bảng Follow). Cái này theo dõi *tác giả* (bảng AuthorFollow),
 * phục vụ điều kiện ≥100 followers để mở Trung tâm Kiếm tiền.
 */
export function FollowAuthorButton({
  authorId,
  initialFollowing,
  className = '',
}: FollowAuthorButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const toggle = useToggleAuthorFollow();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const following = optimistic ?? initialFollowing;

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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
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
