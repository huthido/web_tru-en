'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, Send, Trash2 } from 'lucide-react';
import { useArtComments, useAddArtComment } from '@/lib/api/hooks/use-art';
import { artService } from '@/lib/api/art.service';
import { useQueryClient } from '@tanstack/react-query';
import { artKeys } from '@/lib/api/hooks/use-art';

interface Props {
  postId: string;
  currentUserId?: string;
  onClose: () => void;
}

function UserAvatar({ src, name }: { src?: string | null; name: string }) {
  return src ? (
    <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-surface text-xs font-bold">
      {name[0]?.toUpperCase()}
    </div>
  );
}

export function ArtCommentDrawer({ postId, currentUserId, onClose }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useArtComments(postId);
  const { mutate: addComment, isPending } = useAddArtComment(postId);

  const comments = data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    addComment(trimmed, {
      onSuccess: () => {
        setText('');
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      },
    });
  };

  const handleDeleteComment = async (id: string) => {
    await artService.deleteComment(id);
    qc.invalidateQueries({ queryKey: artKeys.comments(postId) });
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ`;
    return `${Math.floor(h / 24)} ngày`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-surface rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
          <span className="font-semibold text-on-surface">Bình luận</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-variant">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {comments.length === 0 && !isFetchingNextPage && (
            <p className="text-center text-sm text-on-surface-variant py-8">Chưa có bình luận nào</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <UserAvatar src={c.user.avatar} name={c.user.displayName || c.user.username} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-on-surface mr-2">
                  {c.user.displayName || c.user.username}
                </span>
                <span className="text-xs text-on-surface-variant">{formatTime(c.createdAt)}</span>
                <p className="text-sm text-on-surface mt-0.5 break-words">{c.content}</p>
              </div>
              {currentUserId === c.user.id && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="p-1 rounded hover:bg-surface-variant text-on-surface-variant/50 hover:text-error flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full text-xs text-primary py-2"
            >
              {isFetchingNextPage ? 'Đang tải...' : 'Xem thêm'}
            </button>
          )}
        </div>

        {/* Input */}
        {currentUserId ? (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/20"
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Viết bình luận..."
              className="flex-1 bg-surface-container rounded-full px-4 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!text.trim() || isPending}
              className="p-2 rounded-full bg-primary text-surface disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <p className="text-center text-xs text-on-surface-variant py-3 border-t border-outline-variant/20">
            Đăng nhập để bình luận
          </p>
        )}
      </div>
    </div>
  );
}
