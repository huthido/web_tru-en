'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { AdSlot } from '@/components/ads/ad-slot';
import { BookSectionSkeleton } from '@/components/ui/loading';
import { BookSection } from '@/components/books/book-section';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '@/lib/api/client';
import { Story } from '@/lib/api/stories.service';

interface SectionConfig {
  key: string;
  label: string;
  sortPath: string;
  limit: number;
  seeMorePath: string | null;
  sortBy: string | null;
  order: number;
  isActive: boolean;
}

interface HomeClientProps {
  initialSections?: SectionConfig[];
}

function useSectionStories(sortPath: string, limit: number, enabled: boolean) {
  return useQuery<Story[]>({
    queryKey: ['stories', 'homepage', sortPath, limit],
    queryFn: async () => {
      const response = await apiClient.get<Story[]>(`/stories/homepage/${sortPath}?limit=${limit}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export default function HomeClient({ initialSections }: HomeClientProps) {
  // Fetch sections from API (client-side navigation fallback)
  const { data: apiSections } = useQuery<SectionConfig[]>({
    queryKey: ['homepage-sections'],
    queryFn: async () => {
      const response = await apiClient.get<SectionConfig[]>('/homepage-sections');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const sections = useMemo(() => {
    const raw = apiSections && apiSections.length > 0 ? apiSections : initialSections;
    if (!raw) return [];
    return raw.filter((s) => s.isActive).sort((a, b) => a.order - b.order);
  }, [apiSections, initialSections]);

  const [activeTab, setActiveTab] = useState<string>(() => sections[0]?.key || 'newest');

  const activeSection = useMemo(
    () => sections.find((s) => s.key === activeTab) || sections[0],
    [sections, activeTab]
  );

  const seeMoreUrl = useMemo(() => {
    if (!activeSection) return '/truyen';
    const base = activeSection.seeMorePath || '/truyen';
    return activeSection.sortBy ? `${base}?sortBy=${activeSection.sortBy}` : base;
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-background text-on-surface transition-colors duration-300">
      <Sidebar />

      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />

        {/* Dynamic chip/tab bar */}
        <div className="sticky top-[60px] z-30 flex items-center gap-3 bg-background/90 backdrop-blur-md px-4 md:px-6 py-3 border-b border-outline-variant/20">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Danh mục truyện">
            {sections.map((section) => {
              const isActive = section.key === activeSection?.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(section.key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 border ${
                    isActive
                      ? 'bg-on-surface text-surface border-transparent shadow-sm'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/60 hover:bg-surface-variant hover:text-on-surface'
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
          <Link
            href={seeMoreUrl}
            className="hidden sm:block flex-shrink-0 text-xs md:text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Page Content */}
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
          <div className="px-4 md:px-6">
            <AdSlot slotKey="home.top" />
          </div>

          {activeSection ? (
            <SectionContent
              sortPath={activeSection.sortPath}
              limit={activeSection.limit}
              label={activeSection.label}
              seeMoreLink={seeMoreUrl}
            />
          ) : (
            <BookSectionSkeleton />
          )}

          <div className="sm:hidden px-4 -mt-6 mb-6 text-right">
            <Link href={seeMoreUrl} className="text-xs font-semibold text-primary hover:underline">
              Xem tất cả →
            </Link>
          </div>

          <div className="px-4 md:px-6 mt-8">
            <AdSlot slotKey="home.bottom" />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function SectionContent({
  sortPath,
  limit,
  label,
  seeMoreLink,
}: {
  sortPath: string;
  limit: number;
  label: string;
  seeMoreLink: string;
}) {
  const { data: stories = [], isLoading } = useSectionStories(sortPath, limit, true);

  const books = useMemo(
    () =>
      stories.map((story: Story) => ({
        id: story.id,
        title: story.title,
        author: story.authorName || story.author?.displayName || story.author?.username || 'N/A',
        viewCount: story.viewCount || 0,
        rating: story.rating || 0,
        ratingCount: story.ratingCount || 0,
        coverImage: story.coverImage,
        slug: story.slug,
        storyId: story.id,
      })),
    [stories]
  );

  if (isLoading) return <BookSectionSkeleton />;

  return (
    <BookSection
      title={label}
      hideTitle
      books={books}
      seeMoreLink={seeMoreLink}
      showLikeButton={false}
      mobileLimit={12}
      desktopLimit={15}
    />
  );
}
