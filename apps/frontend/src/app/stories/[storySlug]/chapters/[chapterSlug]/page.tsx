'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useChapter, useChapters } from '@/lib/api/hooks/use-chapters';
import { useStory } from '@/lib/api/hooks/use-stories';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition } from '@/lib/api/ads.service';
import {
    markChapterCompleted,
    shouldShowPopup,
    getNextPopupAdIndex,
    getNextBannerAdIndex,
    updateChapterReadingTime,
    updateChapterScrollProgress,
    hasValidReading,
    getPopupDelay,
    getVisitCount
} from '@/utils/reading-tracker';
import { useSaveProgress, useChapterProgress } from '@/lib/api/hooks/use-reading-history';
import { BookOpen } from 'lucide-react';

export default function ChapterReadingPage() {
    const params = useParams();
    const router = useRouter();
    const storySlug = params.storySlug as string;
    const chapterSlug = params.chapterSlug as string;

    // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
    const { data: chapter, isLoading: chapterLoading, error: chapterError } = useChapter(storySlug, chapterSlug);
    const { data: chaptersResponse, isLoading: chaptersLoading } = useChapters(storySlug);
    const { data: story } = useStory(storySlug);
    const { user } = useAuth();

    const [fontSize, setFontSize] = useState(16);
    // Load showChapterList state from localStorage, default to false
    const [showChapterList, setShowChapterList] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('showChapterList');
            return saved === 'true';
        }
        return false;
    });
    const [isChapterCompleted, setIsChapterCompleted] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const hasTrackedCompletion = useRef<string | null>(null); // Track which chapterId has been tracked
    const saveProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedProgressRef = useRef<number>(-1);
    const hasInitializedHistory = useRef(false);
    const chapterStartTimeRef = useRef<number>(0);
    const readingTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const shouldRedirectToAdRef = useRef<boolean>(false);
    const pendingAdRef = useRef<any>(null);
    const isRestoringScrollRef = useRef<boolean>(false); // Flag to prevent saving during scroll restore

    // Fetch active ads
    const { data: popupAds = [] } = useActiveAds(AdType.POPUP);
    const { data: bottomAds = [] } = useActiveAds(AdType.BANNER, AdPosition.BOTTOM);
    const trackAdView = useTrackAdView();
    const trackAdClick = useTrackAdClick();

    // Extract chapter data
    const chapterData = (chapter as any)?.data || (chapter as any);

    // Reading history hooks (must be after chapterData is defined)
    const saveProgress = useSaveProgress();
    const chapterId = chapterData?.id;
    const { data: savedProgress, isLoading: isLoadingProgress } = useChapterProgress(chapterId || '', !!user && !!chapterId);

    // Get popup ad with rotation (show different ads each time)
    const popupAd = useMemo(() => {
        if (!Array.isArray(popupAds) || popupAds.length === 0) return null;
        // Filter ads with valid imageUrl
        const validAds = popupAds.filter((ad: any) => ad.imageUrl);
        if (validAds.length === 0) return null;
        // Rotate through ads (only when popup is triggered, not on every render)
        // We'll select the ad when popup is actually shown
        return validAds; // Return all valid ads, we'll select one when showing popup
    }, [popupAds]);

    // Get banner ads (can show multiple or rotate)
    const bottomAdsList = useMemo(() => {
        if (!Array.isArray(bottomAds) || bottomAds.length === 0) return [];
        // Filter ads with valid imageUrl
        const validAds = bottomAds.filter((ad: any) => ad.imageUrl);
        return validAds;
    }, [bottomAds]);

    // Select one banner to show (rotate)
    const bottomAd = useMemo(() => {
        if (bottomAdsList.length === 0) return null;
        // Rotate through ads based on visitCount
        const adIndex = getNextBannerAdIndex(bottomAdsList.length);
        return bottomAdsList[adIndex] || bottomAdsList[0] || null;
    }, [bottomAdsList]);

    // Extract chapters array from response
    // useChapters hook already handles the response format, so chaptersResponse should be an array
    const chapters = Array.isArray(chaptersResponse) ? chaptersResponse : [];

    // Sort chapters by order to ensure correct navigation
    const sortedChapters = useMemo(() => {
        if (!chapters || chapters.length === 0) return [];
        return [...chapters].sort((a: any, b: any) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            return orderA - orderB;
        });
    }, [chapters]);

    // Find current chapter by slug in sorted array (handle URL encoding)
    const currentChapterIndex = useMemo(() => {
        if (!sortedChapters.length || !chapterSlug) return -1;

        // Normalize both slugs for comparison
        const normalizeSlug = (slug: string) => {
            try {
                return decodeURIComponent(slug).toLowerCase().trim();
            } catch {
                return slug.toLowerCase().trim();
            }
        };

        const normalizedChapterSlug = normalizeSlug(chapterSlug);

        return sortedChapters.findIndex((ch: any) => {
            if (!ch.slug) return false;
            const normalizedChSlug = normalizeSlug(ch.slug);
            return normalizedChSlug === normalizedChapterSlug;
        });
    }, [sortedChapters, chapterSlug]);

    // Find previous and next chapters based on sorted array index
    // This ensures correct navigation even if there are gaps in order numbers
    const { prevChapter, nextChapter } = useMemo(() => {
        if (currentChapterIndex < 0 || sortedChapters.length === 0) {
            return { prevChapter: null, nextChapter: null };
        }

        const prev = currentChapterIndex > 0
            ? sortedChapters[currentChapterIndex - 1]
            : null;
        const next = currentChapterIndex < sortedChapters.length - 1
            ? sortedChapters[currentChapterIndex + 1]
            : null;

        return { prevChapter: prev, nextChapter: next };
    }, [currentChapterIndex, sortedChapters]);

    // Mark chapter as visited when page loads and check for ad redirect
    useEffect(() => {
        if (!chapterData) return;

        // Mark chapter as visited immediately when page loads
        const chapterId = `${storySlug}-${chapterSlug}`;

        // Only track if we haven't tracked this specific chapter yet
        if (hasTrackedCompletion.current === chapterId) {
            return; // Already tracked this chapter
        }

        const wasNewVisit = markChapterCompleted(chapterId); // Always mark visit (increments visitCount)
        hasTrackedCompletion.current = chapterId; // Mark this chapter as tracked

        // Check if should redirect to ad page immediately (after visiting enough chapters)
        // Use popupInterval from ad if available, otherwise use default
        // Use popupAds directly to avoid dependency array size changes
        if (Array.isArray(popupAds) && popupAds.length > 0) {
            // Filter valid ads
            const validAds = popupAds.filter((ad: any) => ad.imageUrl);
            if (validAds.length > 0) {
                // Find ad with popupInterval (prefer ads with custom interval)
                const adWithInterval = validAds.find((ad: any) => ad.popupInterval) || validAds[0];
                const popupInterval = adWithInterval?.popupInterval || 3;

                // Check if should show popup (check immediately, no delay)
                if (shouldShowPopup(chapterId, popupInterval)) {
                    // Select ad with rotation when popup is triggered
                    const adIndex = getNextPopupAdIndex(validAds.length);
                    const selectedAd = validAds[adIndex] || validAds[0];

                    if (selectedAd && selectedAd.imageUrl) {
                        // Redirect immediately to ad page
                        const returnUrl = `/stories/${storySlug}/chapters/${chapterSlug}`;
                        const adUrl = `/ads/${selectedAd.id}?return=${encodeURIComponent(returnUrl)}&story=${storySlug}&chapter=${chapterSlug}`;

                        // Log for debugging (development only)
                        if (process.env.NODE_ENV === 'development') {
                            console.log('Redirecting to ad page:', { adUrl, visitCount: getVisitCount() });
                        }
                        router.push(adUrl);
                        return; // Don't continue with page setup, we're redirecting
                    }
                }
            }
        }

        // Start tracking reading time (only if not redirecting)
        chapterStartTimeRef.current = Date.now();

        // Update reading time every 5 seconds
        readingTimeIntervalRef.current = setInterval(() => {
            if (chapterStartTimeRef.current > 0) {
                const elapsed = Date.now() - chapterStartTimeRef.current;
                updateChapterReadingTime(chapterId, elapsed);
                chapterStartTimeRef.current = Date.now(); // Reset for next interval
            }
        }, 5000);

        return () => {
            if (readingTimeIntervalRef.current) {
                clearInterval(readingTimeIntervalRef.current);
                readingTimeIntervalRef.current = null;
            }
            // Save final reading time before unmount
            if (chapterStartTimeRef.current > 0) {
                const elapsed = Date.now() - chapterStartTimeRef.current;
                updateChapterReadingTime(chapterId, elapsed);
            }
        };
    }, [chapterData, storySlug, chapterSlug, popupAds, router]);

    // Reset completion tracking when chapter changes
    useEffect(() => {
        setIsChapterCompleted(false);
        hasTrackedCompletion.current = null; // Reset to null so new chapter can be tracked
        lastSavedProgressRef.current = -1;
        hasInitializedHistory.current = false;
        shouldRedirectToAdRef.current = false;
        pendingAdRef.current = null;
        chapterStartTimeRef.current = 0;
        isRestoringScrollRef.current = false; // Reset restore flag

        // Clear any pending save timeout
        if (saveProgressTimeoutRef.current) {
            clearTimeout(saveProgressTimeoutRef.current);
            saveProgressTimeoutRef.current = null;
        }

        // Clear reading time interval
        if (readingTimeIntervalRef.current) {
            clearInterval(readingTimeIntervalRef.current);
            readingTimeIntervalRef.current = null;
        }
    }, [chapterSlug]);

    // Initialize reading history when chapter loads (if user is logged in)
    useEffect(() => {
        if (!user || !chapterId || !chapterData || isLoadingProgress || hasInitializedHistory.current) return;

        // If no saved progress exists (lastRead is null means no entry in database), initialize with 0% to create reading history entry
        // Check both: savedProgress is undefined/null OR lastRead is null
        const shouldInitialize = !savedProgress || savedProgress.lastRead === null;

        if (shouldInitialize) {
            hasInitializedHistory.current = true;
            // Wait a bit to ensure chapter data is fully loaded
            const initTimer = setTimeout(() => {
                // Log for debugging (development only)
                if (process.env.NODE_ENV === 'development') {
                    console.log('Initializing reading history:', { chapterId, userId: user.id, savedProgress });
                }
                saveProgress.mutate(
                    { chapterId, progress: 0 },
                    {
                        onSuccess: (data) => {
                            if (process.env.NODE_ENV === 'development') {
                                console.log('Reading history initialized:', data);
                            }
                            lastSavedProgressRef.current = 0;
                        },
                        onError: (error) => {
                            console.error('Failed to initialize reading history:', error);
                            hasInitializedHistory.current = false; // Reset on error so we can retry
                        }
                    }
                );
            }, 500);

            return () => clearTimeout(initTimer);
        } else if (savedProgress && savedProgress.progress !== undefined) {
            // Update last saved progress if we have saved data
            // Log for debugging (development only)
            if (process.env.NODE_ENV === 'development') {
                console.log('Loaded saved progress:', { chapterId, progress: savedProgress.progress, lastRead: savedProgress.lastRead });
            }
            lastSavedProgressRef.current = savedProgress.progress;
            hasInitializedHistory.current = true; // Mark as initialized if we have existing data
        }
    }, [user, chapterId, chapterData, savedProgress, isLoadingProgress, saveProgress]);

    // Restore scroll position from saved progress
    useEffect(() => {
        if (!contentRef.current || !savedProgress || !user || !chapterId) return;

        const progress = savedProgress.progress || 0;
        if (progress > 0 && progress < 100) {
            // Set flag to prevent saving during restore
            isRestoringScrollRef.current = true;

            // Calculate scroll position based on progress
            const scrollContainer = contentRef.current;
            const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
            const targetScroll = (progress / 100) * maxScroll;

            // Smooth scroll to saved position
            setTimeout(() => {
                scrollContainer.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });

                // Reset flag after scroll completes (smooth scroll takes ~500ms)
                setTimeout(() => {
                    isRestoringScrollRef.current = false;
                }, 600);
            }, 100);
        }
    }, [savedProgress, user, chapterId]); // Removed chapterData from dependencies

    // Auto-save reading progress on scroll
    useEffect(() => {
        if (!contentRef.current || !user || !chapterId) return;

        const scrollContainer = contentRef.current;

        const handleScroll = () => {
            if (!scrollContainer || !chapterId) return;

            // Skip saving if we're restoring scroll position
            if (isRestoringScrollRef.current) return;

            const scrollTop = scrollContainer.scrollTop;
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;

            // Calculate progress percentage (0-100)
            const maxScroll = scrollHeight - clientHeight;
            if (maxScroll <= 0) return;

            const progress = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));

            // Update scroll progress in tracker
            const chapterTrackerId = `${storySlug}-${chapterSlug}`;
            updateChapterScrollProgress(chapterTrackerId, progress);

            // Save progress if changed (reduced threshold to 1% for better tracking)
            const progressDiff = Math.abs(progress - lastSavedProgressRef.current);
            if (progressDiff >= 1 || progress === 100) {
                // Clear existing timeout
                if (saveProgressTimeoutRef.current) {
                    clearTimeout(saveProgressTimeoutRef.current);
                }

                // Debounce: save after 1 second of no scrolling (reduced from 2s)
                saveProgressTimeoutRef.current = setTimeout(() => {
                    if (user && chapterId) {
                        // Log for debugging (development only)
                        if (process.env.NODE_ENV === 'development') {
                            console.log('Saving reading progress:', { chapterId, progress, userId: user.id, lastSaved: lastSavedProgressRef.current });
                        }
                        saveProgress.mutate(
                            { chapterId, progress },
                            {
                                onSuccess: (data) => {
                                    if (process.env.NODE_ENV === 'development') {
                                        console.log('Reading progress saved successfully:', data);
                                    }
                                    lastSavedProgressRef.current = progress;
                                },
                                onError: (error) => {
                                    console.error('Failed to save reading progress:', error);
                                }
                            }
                        );
                    }
                }, 1000); // 1 second debounce (reduced from 2s)
            }
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

        // Also save immediately when progress reaches 100%
        const checkAndSaveComplete = () => {
            if (!scrollContainer || !user || !chapterId) return;

            // Skip saving if we're restoring scroll position
            if (isRestoringScrollRef.current) return;

            const scrollTop = scrollContainer.scrollTop;
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;
            const maxScroll = scrollHeight - clientHeight;

            if (maxScroll > 0) {
                const progress = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));

                // Save immediately if reached 100% or very close (>= 90%)
                if (progress >= 90 && lastSavedProgressRef.current < 90) {
                    if (saveProgressTimeoutRef.current) {
                        clearTimeout(saveProgressTimeoutRef.current);
                    }
                    // Log for debugging (development only)
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Saving progress immediately (>= 90%):', { chapterId, progress });
                    }
                    saveProgress.mutate(
                        { chapterId, progress },
                        {
                            onSuccess: () => {
                                if (process.env.NODE_ENV === 'development') {
                                    console.log('Progress saved immediately:', progress);
                                }
                                lastSavedProgressRef.current = progress;
                            },
                            onError: (error) => {
                                console.error('Failed to save progress immediately:', error);
                            }
                        }
                    );
                }
            }
        };

        // Check on scroll end
        let scrollEndTimer: NodeJS.Timeout;
        const handleScrollEnd = () => {
            clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(() => {
                checkAndSaveComplete();
            }, 500);
        };
        scrollContainer.addEventListener('scroll', handleScrollEnd, { passive: true });

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            scrollContainer.removeEventListener('scroll', handleScrollEnd);
            if (saveProgressTimeoutRef.current) {
                clearTimeout(saveProgressTimeoutRef.current);
            }
            if (scrollEndTimer) {
                clearTimeout(scrollEndTimer);
            }
        };
    }, [user, chapterId, saveProgress, storySlug, chapterSlug]); // Removed chapterData, added storySlug and chapterSlug

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
        return `/truyen/${storySlug}`;
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
                                href={`/truyen/${storySlug}`}
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
                                    onClick={() => {
                                        const newState = !showChapterList;
                                        setShowChapterList(newState);
                                        // Save to localStorage to persist across page reloads
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('showChapterList', String(newState));
                                        }
                                    }}
                                    className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                                    aria-label={showChapterList ? 'Ẩn danh sách chương' : 'Hiện danh sách chương'}
                                >
                                    <BookOpen size={20} />
                                </button>

                                {/* Previous/Next Chapter Buttons */}
                                <div className="flex items-center gap-2">
                                    {prevChapter ? (
                                        <Link
                                            href={shouldRedirectToAdRef.current && pendingAdRef.current
                                                ? `/ads/${pendingAdRef.current.id}?return=/stories/${storySlug}/chapters/${prevChapter.slug}&story=${storySlug}&prev=${prevChapter.slug}${nextChapter ? `&next=${nextChapter.slug}` : ''}`
                                                : `/stories/${storySlug}/chapters/${prevChapter.slug}`}
                                            className="group px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-700 dark:hover:to-indigo-700 rounded-lg text-sm font-semibold text-white transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
                                            onClick={() => {
                                                shouldRedirectToAdRef.current = false;
                                                pendingAdRef.current = null;
                                            }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
                                                <path d="M15 18l-6-6 6-6" />
                                            </svg>
                                            <span>Trước</span>
                                        </Link>
                                    ) : (
                                        <button
                                            disabled
                                            className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center gap-2"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M15 18l-6-6 6-6" />
                                            </svg>
                                            <span>Trước</span>
                                        </button>
                                    )}
                                    {nextChapter ? (
                                        <Link
                                            href={shouldRedirectToAdRef.current && pendingAdRef.current
                                                ? `/ads/${pendingAdRef.current.id}?return=/stories/${storySlug}/chapters/${nextChapter.slug}&story=${storySlug}&next=${nextChapter.slug}${prevChapter ? `&prev=${prevChapter.slug}` : ''}`
                                                : `/stories/${storySlug}/chapters/${nextChapter.slug}`}
                                            className="group px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 dark:from-indigo-600 dark:to-purple-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 rounded-lg text-sm font-semibold text-white transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
                                            onClick={() => {
                                                shouldRedirectToAdRef.current = false;
                                                pendingAdRef.current = null;
                                            }}
                                        >
                                            <span>Sau</span>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </Link>
                                    ) : (
                                        <button
                                            disabled
                                            className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center gap-2"
                                        >
                                            <span>Sau</span>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                                        -
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
                                        {fontSize}px
                                    </span>
                                    <button
                                        onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 font-bold"
                                    >
                                        +
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
                                        {sortedChapters?.map((ch: any, index: number) => {
                                            // Normalize slugs for comparison (handle URL encoding)
                                            const normalizeSlug = (slug: string) => {
                                                try {
                                                    return decodeURIComponent(slug).toLowerCase().trim();
                                                } catch {
                                                    return slug.toLowerCase().trim();
                                                }
                                            };

                                            const normalizedChapterSlug = normalizeSlug(chapterSlug);
                                            const normalizedChSlug = ch.slug ? normalizeSlug(ch.slug) : '';
                                            const isActive = normalizedChSlug === normalizedChapterSlug;

                                            return (
                                                <Link
                                                    key={ch.id}
                                                    href={`/stories/${storySlug}/chapters/${ch.slug}`}
                                                    className={`block px-3 py-2 rounded text-sm transition-colors ${isActive
                                                        ? 'bg-blue-500 dark:bg-blue-600 text-white font-semibold shadow-sm'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {ch.title || `Chương ${ch.order || (index + 1)}`}
                                                </Link>
                                            );
                                        })}
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
                                        fontFamily: 'var(--font-quicksand), Quicksand, sans-serif',
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
                                                <OptimizedImage
                                                    src={bottomAd.imageUrl}
                                                    alt={bottomAd.title || 'Quảng cáo'}
                                                    fill
                                                    objectFit="contain"
                                                    sizes={ImageSizes.adBanner}
                                                    quality={85}
                                                    placeholder="blur"
                                                    unoptimized={shouldUnoptimizeImage(bottomAd.imageUrl)}
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
                                            <OptimizedImage
                                                src={bottomAd.imageUrl}
                                                alt={bottomAd.title || 'Quảng cáo'}
                                                fill
                                                objectFit="contain"
                                                sizes={ImageSizes.adBanner}
                                                quality={85}
                                                placeholder="blur"
                                                unoptimized={shouldUnoptimizeImage(bottomAd.imageUrl)}
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
                                            href={shouldRedirectToAdRef.current && pendingAdRef.current
                                                ? `/ads/${pendingAdRef.current.id}?return=/stories/${storySlug}/chapters/${prevChapter.slug}&story=${storySlug}&prev=${prevChapter.slug}${nextChapter ? `&next=${nextChapter.slug}` : ''}`
                                                : `/stories/${storySlug}/chapters/${prevChapter.slug}`}
                                            className="group block p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-md hover:shadow-lg border border-blue-100 dark:border-blue-800/50 transition-all duration-300 hover:scale-[1.02]"
                                            onClick={() => {
                                                // Reset redirect flag after clicking
                                                shouldRedirectToAdRef.current = false;
                                                pendingAdRef.current = null;
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white group-hover:bg-blue-600 dark:group-hover:bg-blue-700 transition-colors">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M15 18l-6-6 6-6" />
                                                    </svg>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    Trước
                                                </div>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-600">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M15 18l-6-6 6-6" />
                                                    </svg>
                                                </div>
                                                <div className="text-sm text-gray-400 dark:text-gray-600">Trước</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    {nextChapter ? (
                                        <Link
                                            href={shouldRedirectToAdRef.current && pendingAdRef.current
                                                ? `/ads/${pendingAdRef.current.id}?return=/stories/${storySlug}/chapters/${nextChapter.slug}&story=${storySlug}&next=${nextChapter.slug}${prevChapter ? `&prev=${prevChapter.slug}` : ''}`
                                                : `/stories/${storySlug}/chapters/${nextChapter.slug}`}
                                            className="group block p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-md hover:shadow-lg border border-indigo-100 dark:border-indigo-800/50 transition-all duration-300 hover:scale-[1.02] text-right"
                                            onClick={() => {
                                                // Reset redirect flag after clicking
                                                shouldRedirectToAdRef.current = false;
                                                pendingAdRef.current = null;
                                            }}
                                        >
                                            <div className="flex items-center gap-3 flex-row-reverse">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center text-white group-hover:bg-indigo-600 dark:group-hover:bg-indigo-700 transition-colors">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M9 18l6-6-6-6" />
                                                    </svg>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    Sau
                                                </div>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-right">
                                            <div className="flex items-center gap-3 flex-row-reverse">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-600">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M9 18l6-6-6-6" />
                                                    </svg>
                                                </div>
                                                <div className="text-sm text-gray-400 dark:text-gray-600">Sau</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
                <Footer />
            </div>

        </div>
    );
}

