'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useAuthorProfile } from '@/lib/api/hooks/use-authors';
import { ProfilePaintingsGrid } from '@/components/users/profile-paintings-grid';

/** Trang "Tranh" của tác giả — gian hàng tranh của riêng người này. */
export default function ProfilePaintingsPage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const { user: me } = useAuth();
  const { data: profile } = useAuthorProfile(username);

  if (!profile) return null;
  const isMe = !!me && me.id === profile.id;

  return <ProfilePaintingsGrid authorId={profile.id} currentUserId={me?.id} isMe={isMe} />;
}
