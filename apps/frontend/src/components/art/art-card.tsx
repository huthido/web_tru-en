'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { ArtPost } from '@/lib/api/art.service';
import { useToggleArtLike, useDeleteArtPost } from '@/lib/api/hooks/use-art';
import { ArtCommentDrawer } from './art-comment-drawer';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface Props {
  post: ArtPost;
  currentUserId?: string;
}

function formatNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function ArtCard({ post, currentUserId }: Props) {
  const [showComments, setShowComments] = useState(false);
  const { mutate: toggleLike } = useToggleArtLike();
  const { mutate: deletePost } = useDeleteArtPost();

  const authorName = post.user.displayName || post.user.username;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    toggleLike(post.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Xóa bài đăng này?')) deletePost(post.id);
  };

  return (
    <>
      <div className="group relative break-inside-avoid mb-3 rounded-2xl overflow-hidden bg-surface-container shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow">
        {/* Ảnh */}
        <div className="relative w-full">
          <img
            src={post.imageUrl}
            alt={post.caption || 'Art post'}
            className="w-full block"
            style={{
              aspectRatio: post.width && post.height ? `${post.width}/${post.height}` : 'auto',
            }}
            loading="lazy"
          />

          {/* Overlay khi hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

          {/* Actions overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center gap-3">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                  post.likedByMe ? 'text-red-400' : 'text-white hover:text-red-400'
                }`}
              >
                <Heart
                  className="w-4 h-4"
                  fill={post.likedByMe ? 'currentColor' : 'none'}
                />
                <span>{formatNum(post.likeCount)}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="flex items-center gap-1 text-sm font-medium text-white hover:text-blue-300 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{formatNum(post.commentCount)}</span>
              </button>
            </div>
            {currentUserId === post.user.id && (
              <button onClick={handleDelete} className="text-white/70 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-3 py-2">
          {post.caption && (
            <p className="text-xs text-on-surface line-clamp-2 mb-1.5">{post.caption}</p>
          )}
          <div className="flex items-center justify-between">
            <Link
              href={`/u/${post.user.username}`}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {post.user.avatar ? (
                <img src={post.user.avatar} alt={authorName} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-surface text-[9px] font-bold">
                  {authorName[0]?.toUpperCase()}
                </div>
              )}
              <span className="truncate">{authorName}</span>
            </Link>
            {/* Like + comment counts (always visible) */}
            <div className="flex items-center gap-2 text-xs text-on-surface-variant flex-shrink-0">
              <span className="flex items-center gap-0.5">
                <Heart
                  className="w-3 h-3"
                  fill={post.likedByMe ? '#ef4444' : 'none'}
                  stroke={post.likedByMe ? '#ef4444' : 'currentColor'}
                />
                {formatNum(post.likeCount)}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" />
                {formatNum(post.commentCount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showComments && (
        <ArtCommentDrawer
          postId={post.id}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}
