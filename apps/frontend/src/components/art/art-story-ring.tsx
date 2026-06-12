'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { X, Plus } from 'lucide-react';
import { ArtStory } from '@/lib/api/art.service';
import { useCreateArtStory } from '@/lib/api/hooks/use-art';
import { artService } from '@/lib/api/art.service';
import { useQueryClient } from '@tanstack/react-query';
import { artKeys } from '@/lib/api/hooks/use-art';

interface Props {
  stories: ArtStory[];
  isLoggedIn: boolean;
}

function Avatar({ src, name }: { src?: string | null; name: string }) {
  return src ? (
    <Image src={src} alt={name} width={40} height={40} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-primary text-surface text-sm font-bold">
      {name[0]?.toUpperCase()}
    </div>
  );
}

export function ArtStoryRing({ stories, isLoggedIn }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutate: createStory, isPending } = useCreateArtStory();
  const [viewing, setViewing] = useState<ArtStory | null>(null);
  const qc = useQueryClient();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    createStory(file);
    e.target.value = '';
  };

  const handleView = (story: ArtStory) => {
    setViewing(story);
    artService.viewStory(story.id).catch(() => {});
    qc.setQueryData(artKeys.stories, (old: ArtStory[] | undefined) =>
      old?.map((s) => s.id === story.id ? { ...s, seenByMe: true } : s),
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* Nút thêm story (chỉ khi đăng nhập) */}
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center bg-surface-container hover:bg-surface-variant transition-colors">
              <Plus className="w-5 h-5 text-on-surface-variant" />
            </div>
            <span className="text-[10px] text-on-surface-variant whitespace-nowrap">Thêm</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </button>
        )}

        {/* Story bubbles */}
        {stories.map((story) => {
          const name = story.user.displayName || story.user.username;
          const seen = story.seenByMe;
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => handleView(story)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div
                className={`w-14 h-14 rounded-full p-[2px] ${seen ? 'bg-outline-variant' : 'bg-gradient-to-tr from-primary to-amber-400'}`}
              >
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-surface">
                  <Avatar src={story.user.avatar} name={name} />
                </div>
              </div>
              <span className="text-[10px] text-on-surface-variant truncate w-14 text-center">{name}</span>
            </button>
          );
        })}
      </div>

      {/* Story viewer overlay */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setViewing(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10"
            onClick={() => setViewing(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Progress bar — story 24h, tính % còn lại */}
            <div className="h-1 bg-white/20 rounded-full mb-3">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, ((new Date(viewing.expiresAt).getTime() - Date.now()) / (24 * 3600_000)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container">
                <Avatar src={viewing.user.avatar} name={viewing.user.displayName || viewing.user.username} />
              </div>
              <span className="text-white text-sm font-medium">
                {viewing.user.displayName || viewing.user.username}
              </span>
            </div>
            <img
              src={viewing.imageUrl}
              alt="story"
              className="w-full rounded-2xl object-contain max-h-[70vh]"
            />
          </div>
        </div>
      )}
    </>
  );
}
