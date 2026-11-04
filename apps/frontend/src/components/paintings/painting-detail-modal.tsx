'use client';

import { useEffect, useState } from 'react';
import { X, Phone, MessageCircle, Facebook, MessageSquare, CheckCheck, Flag, Heart, Eye } from 'lucide-react';
import { ReportModal } from '@/components/reports/report-modal';
import { Painting, paintingsService } from '@/lib/api/paintings.service';
import { ShareButton } from '@/components/common/share-button';
import { useToastContext } from '@/components/providers/toast-provider';
import { useMarkPaintingSold, useTogglePaintingLike } from '@/lib/api/hooks/use-paintings';

const safeUrl = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : '#';

/** Tranh đã đếm lượt xem trong phiên này. */
const viewedPaintings = new Set<string>();

interface Props {
  painting: Painting;
  currentUserId?: string;
  onClose: () => void;
}

export function PaintingDetailModal({ painting, currentUserId, onClose }: Props) {
  const isOwner = currentUserId === painting.author.id;
  const [showReport, setShowReport] = useState(false);
  const { showToast } = useToastContext();
  const [liked, setLiked] = useState(!!painting.likedByMe);
  const [likeCount, setLikeCount] = useState(painting.likeCount);
  const [viewCount, setViewCount] = useState(painting.viewCount);
  const { mutate: toggleLike } = useTogglePaintingLike();

  useEffect(() => {
    if (viewedPaintings.has(painting.id)) return;
    viewedPaintings.add(painting.id);
    setViewCount((v) => v + 1);
    paintingsService.viewPainting(painting.id).catch(() => {});
  }, [painting.id]);

  const handleLike = () => {
    if (!currentUserId) {
      showToast('Đăng nhập để thả tim nhé', 'info');
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    toggleLike(painting.id, {
      onError: () => {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      },
    });
  };

  const { mutateAsync: markSold, isPending: isMarking } = useMarkPaintingSold();

  const priceText = painting.price != null
    ? painting.price.toLocaleString('vi-VN') + ' đ'
    : 'Thương lượng';

  const handleMarkSold = async () => {
    try {
      await markSold(painting.id);
    } catch (e: any) {
      const raw = e?.response?.data?.error ?? e?.response?.data?.message;
      showToast(
        typeof raw === 'string' ? raw : 'Không cập nhật được trạng thái. Thử lại nhé.',
        'error',
      );
      return;
    }
    onClose();
  };

  const { contactInfo } = painting;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full sm:max-w-2xl bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 flex-shrink-0">
          <span className="font-semibold text-on-surface truncate pr-4">{painting.title}</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-variant flex-shrink-0">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col sm:flex-row">
          {/* Ảnh */}
          <div className="sm:w-1/2 bg-surface-variant flex-shrink-0">
            <img
              src={painting.imageUrl}
              alt={painting.title}
              className="w-full h-full max-h-[50vh] sm:max-h-none object-contain"
            />
          </div>

          {/* Info */}
          <div className="sm:w-1/2 p-5 flex flex-col gap-4">
            {/* Tác giả */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
                {painting.author.avatar ? (
                  <img src={painting.author.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-on-primary-container">
                    {(painting.author.displayName || painting.author.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {painting.author.displayName || painting.author.username}
                </p>
                <p className="text-xs text-on-surface-variant">Tác giả</p>
              </div>
            </div>

            {/* Tương tác */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  liked ? 'text-rose-500' : 'text-on-surface-variant hover:text-rose-500'
                }`}
              >
                <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
                <span>{likeCount}</span>
              </button>
              <span className="flex items-center gap-1.5 text-sm text-on-surface-variant" title="Lượt xem">
                <Eye className="w-5 h-5" />
                <span>{viewCount}</span>
              </span>
              <ShareButton
                path={`/tranh?tranh=${painting.id}`}
                title={painting.title}
                label="Chia sẻ"
              />
            </div>

            {/* Giá */}
            <div>
              {painting.status === 'SOLD' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-variant rounded-full text-sm font-semibold text-on-surface-variant">
                  <CheckCheck className="w-4 h-4" /> Đã bán
                </span>
              ) : (
                <p className="text-2xl font-bold text-primary">{priceText}</p>
              )}
            </div>

            {/* Mô tả */}
            {painting.description && (
              <p className="text-sm text-on-surface-variant leading-relaxed">{painting.description}</p>
            )}

            {/* Liên hệ */}
            {(contactInfo?.phone || contactInfo?.zalo || contactInfo?.facebook) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Liên hệ</p>
                {contactInfo.phone && (
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-variant transition-colors text-sm text-on-surface"
                  >
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    {contactInfo.phone}
                  </a>
                )}
                {contactInfo.zalo && (
                  <a
                    href={safeUrl(/^https?:\/\//i.test(contactInfo.zalo) ? contactInfo.zalo : `https://zalo.me/${contactInfo.zalo}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-variant transition-colors text-sm text-on-surface"
                  >
                    <MessageCircle className="w-4 h-4 text-[#0068FF] flex-shrink-0" />
                    Zalo: {contactInfo.zalo}
                  </a>
                )}
                {contactInfo.facebook && (
                  <a
                    href={safeUrl(contactInfo.facebook)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-variant transition-colors text-sm text-on-surface"
                  >
                    <Facebook className="w-4 h-4 text-[#1877F2] flex-shrink-0" />
                    Facebook
                  </a>
                )}
              </div>
            )}

            {/* Nhắn tin */}
            {painting.status === 'AVAILABLE' && (
              <a
                href={`/u/${painting.author.username}`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-on-surface text-surface text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <MessageSquare className="w-4 h-4" />
                Nhắn tin tác giả
              </a>
            )}

            {/* Owner: đánh dấu đã bán */}
            {isOwner && painting.status === 'AVAILABLE' && (
              <button
                onClick={handleMarkSold}
                disabled={isMarking}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-variant transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                {isMarking ? 'Đang cập nhật...' : 'Đánh dấu đã bán'}
              </button>
            )}

            {/* Báo cáo vi phạm (Apple §1.2) — không tự báo cáo tranh của mình */}
            {currentUserId && !isOwner && (
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-destructive transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                Báo cáo tranh này
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Ngoài lớp click-to-close của modal chi tiết: bấm nền của modal báo cáo
        chỉ đóng chính nó, không đóng luôn modal tranh phía dưới. */}
    {showReport && (
      <ReportModal
        targetType="PAINTING"
        targetId={painting.id}
        targetLabel={painting.title}
        onClose={() => setShowReport(false)}
      />
    )}
    </>
  );
}
