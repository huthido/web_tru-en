/**
 * Utility to track reading progress across all stories
 * Tracks completed chapters (when user scrolls to bottom)
 */

const STORAGE_KEY = 'reading_tracker';
const POPUP_INTERVAL_MIN = 3;
const POPUP_INTERVAL_MAX = 5;

interface ReadingTracker {
    completedChapters: string[]; // Array of chapter IDs that have been completed
    lastPopupChapter: string | null; // Last chapter ID that triggered a popup
    popupCount: number; // Number of popups shown
}

/**
 * Get reading tracker from localStorage
 */
export function getReadingTracker(): ReadingTracker {
    if (typeof window === 'undefined') {
        return {
            completedChapters: [],
            lastPopupChapter: null,
            popupCount: 0,
        };
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error reading reading tracker:', error);
    }

    return {
        completedChapters: [],
        lastPopupChapter: null,
        popupCount: 0,
    };
}

/**
 * Save reading tracker to localStorage
 */
export function saveReadingTracker(tracker: ReadingTracker): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tracker));
    } catch (error) {
        console.error('Error saving reading tracker:', error);
    }
}

/**
 * Mark a chapter as completed
 */
export function markChapterCompleted(chapterId: string): boolean {
    const tracker = getReadingTracker();

    // Check if already completed
    if (tracker.completedChapters.includes(chapterId)) {
        return false;
    }

    // Add to completed chapters
    tracker.completedChapters.push(chapterId);
    saveReadingTracker(tracker);

    return true;
}

/**
 * Check if should show popup ad
 * Returns true if user has read 3-5 new chapters since last popup
 */
export function shouldShowPopup(chapterId: string): boolean {
    const tracker = getReadingTracker();

    // If this chapter was already used for popup, don't show again
    if (tracker.lastPopupChapter === chapterId) {
        return false;
    }

    // Count chapters completed since last popup
    let chaptersSinceLastPopup = 0;
    if (tracker.lastPopupChapter) {
        const lastPopupIndex = tracker.completedChapters.indexOf(tracker.lastPopupChapter);
        if (lastPopupIndex >= 0) {
            // Count chapters after the last popup chapter
            chaptersSinceLastPopup = tracker.completedChapters.length - lastPopupIndex - 1;
        } else {
            // Last popup chapter not found, count all completed
            chaptersSinceLastPopup = tracker.completedChapters.length;
        }
    } else {
        // First time, count all completed
        chaptersSinceLastPopup = tracker.completedChapters.length;
    }

    // Show popup if exactly between 3-5 chapters completed (inclusive)
    // This ensures popup shows once per 3-5 chapter interval
    if (chaptersSinceLastPopup >= POPUP_INTERVAL_MIN && chaptersSinceLastPopup <= POPUP_INTERVAL_MAX) {
        // Mark this chapter as the last popup trigger
        tracker.lastPopupChapter = chapterId;
        tracker.popupCount += 1;
        saveReadingTracker(tracker);
        return true;
    }

    return false;
}

/**
 * Reset reading tracker (for testing)
 */
export function resetReadingTracker(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

