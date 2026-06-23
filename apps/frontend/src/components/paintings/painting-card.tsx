'use client';

import { Painting } from '@/lib/api/paintings.service';

interface Props {
  painting: Painting;
  onClick: () => void;
}

export function PaintingCard({ painting, onClick }: Props) {
  const priceText = painting.price != null
    ? painting.price.toLocaleString('vi-VN') + ' đ'
    : 'Thương lượng';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-surface-container border border-outline-variant/30 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-surface-variant aspect-[4/5]">
        <img
          src={painting.imageUrl}
          alt={painting.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {painting.status === 'SOLD' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-3 py-1 bg-black/70 text-white text-sm font-bold rounded-full tracking-wide">
              Đã bán
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-on-surface truncate">{painting.title}</p>
        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
          {painting.author.displayName || painting.author.username}
        </p>
        <p className={`text-sm font-bold mt-1.5 ${painting.status === 'SOLD' ? 'line-through text-on-surface-variant' : 'text-primary'}`}>
          {priceText}
        </p>
      </div>
    </div>
  );
}
