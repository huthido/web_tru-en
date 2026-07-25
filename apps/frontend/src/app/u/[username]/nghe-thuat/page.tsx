'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useAuthorProfile } from '@/lib/api/hooks/use-authors';
import { ProfileArtGrid } from '@/components/users/profile-art-grid';

/** Trang "Nghệ thuật" của tác giả — ảnh đăng ở Cộng đồng nghệ thuật. */
export default function ProfileArtPage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const { user: me } = useAuth();
  const { data: profile } = useAuthorProfile(username);

  if (!profile) return null;
  const isMe = !!me && me.id === profile.id;

  return <ProfileArtGrid userId={profile.id} currentUserId={me?.id} isMe={isMe} />;
}
