'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { ArtPost } from '@/lib/api/art.service';
import { useToggleArtLike, useDeleteArtPost } from '@/lib/api/hooks/use-art';
import { ArtCommentDrawer } from './art-comment-drawer';

interface Props {
  post: ArtPost;
  currentUserId?: string;
}

function formatNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function ArtCard({ post, currentUserId }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { mutate: toggleLike } = useToggleArtLike();
  const { mutate: deletePost } = useDeleteArtPost();

  const authorName = post.user.displayName || post.user.username;
  const isOwner = currentUserId === post.user.id;

  return (
    <>
      <article className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/u/${post.user.username}`} className="flex-shrink-0">
            {post.user.avatar ? (
              <img src={post.user.avatar} alt={authorName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                {authorName[0]?.toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/u/${post.user.username}`} className="text-sm font-semibold text-on-surface hover:underline block truncate">
              {authorName}
            </Link>
            <p className="text-xs text-on-surface-variant">{timeAgo(post.createdAt)}</p>
          </div>
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-20 bg-surface border border-outline-variant/30 rounded-xl shadow-lg py-1 min-w-[120px]">
                  <button
                    onClick={() => { setShowMenu(false); if (confirm('Xóa bài đăng này?')) deletePost(post.id); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa bài
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image */}
        <div className="w-full bg-surface-container">
          <img
            src={post.imageUrl}
            alt={post.caption || 'Art post'}
            className="w-full block object-cover"
            style={{ maxHeight: '600px' }}
            loading="lazy"
            onDoubleClick={() => currentUserId && toggleLike(post.id)}
          />
        </div>

        {/* Actions */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-4">
          <button
            onClick={() => currentUserId && toggleLike(post.id)}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              post.likedByMe ? 'text-rose-500' : 'text-on-surface-variant hover:text-rose-500'
            }`}
          >
            <Heart className="w-5 h-5" fill={post.likedByMe ? 'currentColor' : 'none'} />
            <span>{formatNum(post.likeCount)}</span>
          </button>
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{formatNum(post.commentCount)}</span>
          </button>
        </div>

        {/* Caption + comment link */}
        <div className="px-4 pb-4 space-y-1">
          {post.caption && (
            <p className="text-sm text-on-surface leading-relaxed">
              <span className="font-semibold mr-1">{authorName}</span>
              {post.caption}
            </p>
          )}
          {post.commentCount > 0 && (
            <button
              onClick={() => setShowComments(true)}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Xem tất cả {formatNum(post.commentCount)} bình luận
            </button>
          )}
        </div>
      </article>

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
