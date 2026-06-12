'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useArtStories } from '@/lib/api/hooks/use-art';
import { ArtStoryRing } from './art-story-ring';
import { ArtMasonryFeed } from './art-masonry-feed';
import { ArtUploadModal } from './art-upload-modal';
import { AdSlot } from '@/components/ads/ad-slot';

interface Props {
  currentUserId?: string;
  isLoggedIn: boolean;
}

export function ArtTab({ currentUserId, isLoggedIn }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const { data: stories = [] } = useArtStories();

  return (
    <div className="relative">
      {/* Stories 24h */}
      {(isLoggedIn || stories.length > 0) && (
        <div className="mb-5">
          <ArtStoryRing stories={stories} isLoggedIn={isLoggedIn} />
        </div>
      )}

      <AdSlot slotKey="stories.list.top" />

      {/* Header hàng */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-on-surface">Cộng đồng nghệ thuật</h2>
        {isLoggedIn && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-on-surface text-surface text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Đăng ảnh
          </button>
        )}
      </div>

      {/* Masonry feed */}
      <ArtMasonryFeed currentUserId={currentUserId} />

      {/* FAB mobile — chỉ hiện khi đã đăng nhập */}
      {isLoggedIn && (
        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-20 right-4 md:hidden z-30 w-14 h-14 rounded-full bg-on-surface text-surface shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Đăng ảnh nghệ thuật"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {showUpload && <ArtUploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
