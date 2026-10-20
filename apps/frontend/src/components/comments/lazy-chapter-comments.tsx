'use client';

import { useEffect, useRef, useState } from 'react';
import { CommentSection } from './comment-section';

/**
 * Bình luận cuối trang đọc chương — chỉ mount (và gọi API) khi người đọc
 * cuộn gần tới, để không làm chậm lúc mở chương.
 */
export function LazyChapterComments({ chapterId }: { chapterId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const el = ref.current;
    if (!el) return;
    // iOS 12.0–12.1 chưa có IntersectionObserver → hiện luôn.
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [chapterId]);

  return (
    <div ref={ref} id="binh-luan" className="w-full px-4 md:px-6 mb-12">
      <div className="max-w-4xl mx-auto min-h-[120px]">
        {visible && <CommentSection key={chapterId} chapterId={chapterId} limit={10} />}
      </div>
    </div>
  );
}
