'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookCard } from './book-card';

interface Book {
  id: string;
  title: string;
  viewCount: number;
  coverImage?: string | null;
  slug?: string;
}

interface BookSectionProps {
  title: string;
  books: Book[];
  seeMoreLink?: string;
}

export function BookSection({ title, books, seeMoreLink = '#' }: BookSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  // Drag to scroll functionality for desktop with smooth animation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    // Only start dragging on left mouse button
    if (e.button !== 0) return;

    setIsDragging(true);
    const rect = scrollContainerRef.current.getBoundingClientRect();
    setStartX(e.pageX - rect.left);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
    scrollContainerRef.current.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleMouseLeave = () => {
    if (!scrollContainerRef.current) return;
    setIsDragging(false);
    scrollContainerRef.current.style.cursor = 'grab';
    scrollContainerRef.current.style.userSelect = '';
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(false);
    scrollContainerRef.current.style.cursor = 'grab';
    scrollContainerRef.current.style.userSelect = '';
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only scroll if actively dragging
    if (!isDragging || !scrollContainerRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = scrollContainerRef.current.getBoundingClientRect();
    const x = e.pageX - rect.left;
    const walk = (x - startX) * 1.5; // Reduced multiplier for smoother feel

    // Direct scroll update - no animation frame to prevent lag
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Handle wheel scroll (horizontal) - simple and direct
  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollContainerRef.current) return;
    // Check if shift key is pressed or if it's a horizontal scroll
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY || e.deltaX;
      scrollContainerRef.current.scrollLeft += delta;
    }
  };

  return (
    <section
      ref={ref}
      className={`mb-12 transition-all duration-700 ${isVisible
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-8'
        }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-6 md:px-6">
        <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
          {title}
        </h2>
        {seeMoreLink && (
          <Link
            href={seeMoreLink}
            className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-300 flex-shrink-0 ml-2"
          >
            Xem thêm
          </Link>
        )}
      </div>

      {/* Book List - Horizontal Scroll */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto ml-[16px] lg:ml-0 scrollbar-hide scroll-smooth snap-x snap-mandatory touch-pan-x cursor-grab select-none"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex gap-3 md:gap-4 px-6 md:px-6 pb-4 min-w-max">
          {books.length > 0 ? (
            books.map((book, index) => (
              <div
                key={book.id}
                className="transition-all duration-500 snap-start flex-shrink-0"
                style={{
                  animationDelay: isVisible ? `${index * 50}ms` : '0ms',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
                }}
              >
                <BookCard
                  id={book.id}
                  title={book.title}
                  viewCount={book.viewCount}
                  coverImage={book.coverImage}
                  slug={book.slug}
                />
              </div>
            ))
          ) : (
            <div className="w-full py-8 text-center text-gray-500 dark:text-gray-400">
              Chưa có sách nào
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

