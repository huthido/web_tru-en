'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { AdPopup } from '@/components/ads/ad-popup';
import { useChapter, useChapters } from '@/lib/api/hooks/use-chapters';
import { useStory } from '@/lib/api/hooks/use-stories';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition } from '@/lib/api/ads.service';
import { markChapterCompleted, shouldShowPopup } from '@/utils/reading-tracker';

export default function ChapterReadingPage() {
    const params = useParams();
    const router = useRouter();
    const storySlug = params.storySlug as string;
    const chapterSlug = params.chapterSlug as string;

    // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
    const { data: chapter, isLoading: chapterLoading, error: chapterError } = useChapter(storySlug, chapterSlug);
    const { data: chaptersResponse } = useChapters(storySlug);
    const { data: story } = useStory(storySlug);
    const { user } = useAuth();

    const [fontSize, setFontSize] = useState(16);
    const [showChapterList, setShowChapterList] = useState(false);
    const [showAdPopup, setShowAdPopup] = useState(false);
    const [selectedPopupAd, setSelectedPopupAd] = useState<any>(null);
    const [isChapterCompleted, setIsChapterCompleted] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const hasTrackedCompletion = useRef(false);

    // Fetch active ads
    const { data: popupAds = [] } = useActiveAds(AdType.POPUP);
    const { data: bottomAds = [] } = useActiveAds(AdType.BANNER, AdPosition.BOTTOM);
    const trackAdView = useTrackAdView();
    const trackAdClick = useTrackAdClick();

    // Extract chapter data
    const chapterData = (chapter as any)?.data || (chapter as any);

    // Get first active popup ad
    const popupAd = Array.isArray(popupAds) && popupAds.length > 0 ? popupAds[0] : null;
    // Get first active bottom ad
    const bottomAd = Array.isArray(bottomAds) && bottomAds.length > 0 ? bottomAds[0] : null;

    // Extract chapters array from response
    const chapters = Array.isArray(chaptersResponse)
        ? chaptersResponse
        : (Array.isArray((chaptersResponse as any)?.data)
            ? (chaptersResponse as any).data
            : []);

    // Find current chapter index
    const currentChapterIndex = chapters?.findIndex((ch: any) => ch.slug === chapterSlug) ?? -1;
    const prevChapter = currentChapterIndex > 0 ? chapters?.[currentChapterIndex - 1] : null;
    const nextChapter = currentChapterIndex >= 0 && chapters && currentChapterIndex < chapters.length - 1
        ? chapters[currentChapterIndex + 1]
        : null;

    // Track reading completion when user scrolls to bottom
    useEffect(() => {
        if (!chapterData || hasTrackedCompletion.current) return;

        const handleScroll = () => {
            if (hasTrackedCompletion.current) return;

            let scrollTop = 0;
            let scrollHeight = 0;
            let clientHeight = 0;

            // Check if content element has its own scroll
            if (contentRef.current) {
                const element = contentRef.current;
                scrollTop = element.scrollTop;
                scrollHeight = element.scrollHeight;
                clientHeight = element.clientHeight;
            } else {
                // Fallback to window scroll
                scrollTop = window.scrollY || document.documentElement.scrollTop;
                scrollHeight = document.documentElement.scrollHeight;
                clientHeight = window.innerHeight;
            }

            // Consider chapter completed when scrolled to within 5% of bottom
            const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
            const isNearBottom = scrollPercentage >= 0.95;

            if (isNearBottom && !isChapterCompleted) {
                setIsChapterCompleted(true);

                // Mark chapter as completed
                const chapterId = `${storySlug}-${chapterSlug}`;
                const wasNewCompletion = markChapterCompleted(chapterId);

                // Check if should show popup (only if this is a new completion)
                if (wasNewCompletion && shouldShowPopup(chapterId) && popupAd) {
                    setSelectedPopupAd(popupAd);
                    setShowAdPopup(true);
                    // Track ad view
                    if (popupAd.id) {
                        trackAdView.mutate(popupAd.id);
                    }
                }

                hasTrackedCompletion.current = true;
            }
        };

        // Listen to both content element scroll and window scroll
        const contentElement = contentRef.current;
        if (contentElement) {
            contentElement.addEventListener('scroll', handleScroll);
        }
        window.addEventListener('scroll', handleScroll);

        // Also check on mount in case content is already scrolled
        setTimeout(handleScroll, 100);

        return () => {
            if (contentElement) {
                contentElement.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('scroll', handleScroll);
        };
    }, [chapterData, storySlug, chapterSlug, isChapterCompleted, popupAd]);

    // Reset completion tracking when chapter changes
    useEffect(() => {
        setIsChapterCompleted(false);
        hasTrackedCompletion.current = false;
    }, [chapterSlug]);

    // Check if we came from author edit context
    const getBackUrl = () => {
        if (typeof window !== 'undefined') {
            const referrer = document.referrer;
            // If coming from edit chapter page, go back to chapter management
            if (referrer.includes('/author/stories/') && referrer.includes('/chapters/') && referrer.includes('/edit')) {
                // Extract story slug from referrer
                const match = referrer.match(/\/author\/stories\/([^/]+)\/chapters/);
                if (match && match[1]) {
                    return `/author/stories/${match[1]}/chapters`;
                }
            }
            // If coming from chapter management page, go back there
            if (referrer.includes('/author/stories/') && referrer.includes('/chapters') && !referrer.includes('/edit') && !referrer.includes('/create')) {
                return referrer;
            }
        }
        return `/books/${storySlug}`;
    };

    const handleBack = () => {
        const backUrl = getBackUrl();
        router.push(backUrl);
    };

    // Early returns AFTER all hooks
    if (chapterLoading) {
        return (
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900">
                <Sidebar />
                <div className="md:ml-[120px]">
                    <Header />
                    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                        <Loading />
                    </div>
                </div>
            </div>
        );
    }

    if (chapterError || !chapterData) {
        return (
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900">
                <Sidebar />
                <div className="md:ml-[120px]">
                    <Header />
                    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Không tìm thấy chương
                            </h1>
                            <Link
                                href={`/books/${storySlug}`}
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
                            >
                                Quay lại trang truyện
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
            <Sidebar />
            <div className="md:ml-[120px] pb-16 md:pb-0">
                <Header />
                <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
                    {/* Story Header */}
                    <div className="max-w-4xl mx-auto px-4 md:px-6 mb-6">
                        <button
                            onClick={handleBack}
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 mb-2 inline-block text-left"
                        >
                            ← Quay lại: {(story as any)?.data?.title || (story as any)?.title || 'Truyện'}
                        </button>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {chapterData.title}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>{chapterData.readingTime} phút đọc</span>
                            <span>•</span>
                            <span>{chapterData.wordCount.toLocaleString()} từ</span>
                            <span>•</span>
                            <span>{chapterData.viewCount.toLocaleString()} lượt xem</span>
                        </div>
                    </div>

                    {/* Reading Controls */}
                    <div className="max-w-4xl mx-auto px-4 md:px-6 mb-4">
                        <div className="sticky top-0 z-10 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 flex-wrap">
                                <button
                                    onClick={() => setShowChapterList(!showChapterList)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                                >
                                    {showChapterList ? 'Ẩn' : 'Hiện'} danh sách chương
                                </button>

                                {/* Previous/Next Chapter Buttons */}
                                <div className="flex items-center gap-2">
                                    {prevChapter ? (
                                        <Link
                                            href={`/stories/${storySlug}/chapters/${prevChapter.slug}`}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M15 18l-6-6 6-6" />
                                            </svg>
                                            Chương trước
                                        </Link>
                                    ) : (
                                        <button
                                            disabled
                                            className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center gap-1"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M15 18l-6-6 6-6" />
                                            </svg>
                                            Chương trước
                                        </button>
                                    )}
                                    {nextChapter ? (
                                        <Link
                                            href={`/stories/${storySlug}/chapters/${nextChapter.slug}`}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1"
                                        >
                                            Chương sau
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </Link>
                                    ) : (
                                        <button
                                            disabled
                                            className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center gap-1"
                                        >
                                            Chương sau
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
                                    >
                                        A
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
                                        {fontSize}px
                                    </span>
                                    <button
                                        onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 font-bold"
                                    >
                                        A
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto px-4 md:px-6 flex gap-6">
                        {/* Chapter List Sidebar */}
                        {showChapterList && (
                            <div className="hidden md:block w-64 flex-shrink-0">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm sticky top-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                                        Danh sách chương
                                    </h3>
                                    <div className="space-y-1">
                                        {chapters?.map((ch: any, index: number) => (
                                            <Link
                                                key={ch.id}
                                                href={`/stories/${storySlug}/chapters/${ch.slug}`}
                                                className={`block px-3 py-2 rounded text-sm transition-colors ${ch.slug === chapterSlug
                                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                Chương {ch.order || (index + 1)}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chapter Content */}
                        <div className="flex-1">
                            <div
                                ref={contentRef}
                                className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 lg:p-12 shadow-sm max-h-[calc(100vh-300px)] overflow-y-auto"
                                style={{ fontSize: `${fontSize}px`, lineHeight: '2' }}
                            >
                                <div
                                    className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed"
                                    style={{
                                        fontFamily: 'Georgia, "Times New Roman", serif',
                                        maxWidth: '100%',
                                    }}
                                >
                                    {chapterData.content.split('\n').map((paragraph: string, index: number) => (
                                        paragraph.trim() ? (
                                            <p key={index} className="mb-4 text-justify">
                                                {paragraph}
                                            </p>
                                        ) : (
                                            <br key={index} />
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Ad */}
                            {bottomAd && (
                                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                                    {bottomAd.linkUrl ? (
                                        <a
                                            href={bottomAd.linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full"
                                            onClick={() => {
                                                if (bottomAd.id) {
                                                    trackAdClick.mutate(bottomAd.id);
                                                }
                                            }}
                                        >
                                            <div className="relative w-full h-48 md:h-64">
                                                <Image
                                                    src={bottomAd.imageUrl}
                                                    alt={bottomAd.title || 'Quảng cáo'}
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, 800px"
                                                    onLoad={() => {
                                                        // Track ad view when image loads
                                                        if (bottomAd.id) {
                                                            trackAdView.mutate(bottomAd.id);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="relative w-full h-48 md:h-64">
                                            <Image
                                                src={bottomAd.imageUrl}
                                                alt={bottomAd.title || 'Quảng cáo'}
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100vw, 800px"
                                                onLoad={() => {
                                                    // Track ad view when image loads
                                                    if (bottomAd.id) {
                                                        trackAdView.mutate(bottomAd.id);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="mt-8 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    {prevChapter ? (
                                        <Link
                                            href={`/stories/${storySlug}/chapters/${prevChapter.slug}`}
                                            className="block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chương trước</div>
                                            <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                                                {prevChapter.title}
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-400 dark:text-gray-600">
                                            Không có chương trước
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href={`/books/${storySlug}`}
                                    className="px-6 py-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Mục lục
                                </Link>

                                <div className="flex-1">
                                    {nextChapter ? (
                                        <Link
                                            href={`/stories/${storySlug}/chapters/${nextChapter.slug}`}
                                            className="block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-right"
                                        >
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chương sau</div>
                                            <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                                                {nextChapter.title}
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-400 dark:text-gray-600 text-right">
                                            Không có chương sau
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>

            {/* Ad Popup */}
            {selectedPopupAd && (
                <AdPopup
                    isOpen={showAdPopup}
                    onClose={() => {
                        setShowAdPopup(false);
                        setSelectedPopupAd(null);
                    }}
                    imageUrl={selectedPopupAd.imageUrl}
                    linkUrl={selectedPopupAd.linkUrl}
                    onLinkClick={() => {
                        if (selectedPopupAd.id) {
                            trackAdClick.mutate(selectedPopupAd.id);
                        }
                    }}
                />
            )}
        </div>
    );
}

