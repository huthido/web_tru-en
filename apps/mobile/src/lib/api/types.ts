/** API entity types — mirror the backend response shapes for reading features. */

export type StoryStatus = 'DRAFT' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED';
export type StoryAccessType = 'FREE' | 'FREEMIUM' | 'VIP';
export type ChapterLockType = 'CHAPTER' | 'STORY' | null;
export type StorySortBy = 'newest' | 'popular' | 'rating' | 'viewCount';

export interface Author {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
}

export interface StoryChapterRef {
    id: string;
    title: string;
    slug: string;
    order: number;
    viewCount?: number;
    createdAt?: string;
    isPublished?: boolean;
}

export interface Story {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    coverImage?: string | null;
    authorId?: string;
    authorName?: string | null;
    status: StoryStatus;
    accessType: StoryAccessType;
    price: number;
    isPublished: boolean;
    viewCount: number;
    likeCount: number;
    followCount: number;
    rating: number;
    ratingCount: number;
    country?: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    lastChapterAt?: string | null;
    author?: Author;
    storyCategories?: { category: Category }[];
    chapters?: StoryChapterRef[];
    _count?: {
        chapters: number;
        follows: number;
        favorites: number;
        ratings: number;
    };
}

export interface Chapter {
    id: string;
    storyId: string;
    title: string;
    slug: string;
    content: string;
    images: string[];
    order: number;
    isPublished: boolean;
    viewCount: number;
    wordCount: number;
    readingTime: number;
    price: number;
    createdAt: string;
    updatedAt: string;
    uploader?: Author;
    story?: { id: string; title: string; slug: string; coverImage?: string | null; authorId?: string };
    isLocked?: boolean;
    lockType?: ChapterLockType;
    lockPrice?: number;
    accessType?: StoryAccessType;
}

export interface StoryAccessInfo {
    accessType: StoryAccessType;
    price: number;
    purchased: boolean;
    privileged: boolean;
    canRead: boolean;
}

export interface BuyResponse {
    success: boolean;
    message: string;
    newBalance?: number;
    alreadyOwned?: boolean;
}

export interface SearchSuggestion {
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
    authorName?: string | null;
}

/** Slim story shape embedded in Follow / ReadingHistory records. */
export interface StoryRef {
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
    description?: string | null;
    authorName?: string | null;
    viewCount?: number;
    followCount?: number;
    rating?: number;
    ratingCount?: number;
    lastChapterAt?: string | null;
    status?: StoryStatus;
}

export interface Follow {
    id: string;
    userId: string;
    storyId: string;
    createdAt: string;
    story?: StoryRef;
}

export interface ReadingHistory {
    id: string;
    userId: string;
    chapterId: string;
    storyId?: string;
    progress: number;
    storyProgress?: number;
    lastRead: string;
    createdAt: string;
    updatedAt: string;
    chapter?: {
        id: string;
        title: string;
        slug: string;
        order: number;
        storyId: string;
    };
    story?: StoryRef;
}

export interface ChapterProgress {
    progress: number;
    lastRead: string | null;
}

export interface StoryQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    categories?: string[];
    status?: string;
    sortBy?: StorySortBy;
    country?: string;
}

export interface PageMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface Paged<T> {
    data: T[];
    meta: PageMeta;
}

/**
 * Normalise a paginated payload. The backend is inconsistent — some endpoints
 * return `{ data, meta: {...} }`, others flatten `page/limit/total/totalPages`
 * alongside `data`. This accepts either.
 */
export function normalizePage<T>(raw: unknown): Paged<T> {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const data = (Array.isArray(obj.data) ? obj.data : []) as T[];
    const meta = (obj.meta ?? obj) as Record<string, unknown>;
    return {
        data,
        meta: {
            page: Number(meta.page ?? 1),
            limit: Number(meta.limit ?? data.length),
            total: Number(meta.total ?? data.length),
            totalPages: Number(meta.totalPages ?? 1),
        },
    };
}
