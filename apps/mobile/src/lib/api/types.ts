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

export type TransactionType =
    | 'DEPOSIT'
    | 'PURCHASE_CHAPTER'
    | 'PURCHASE_STORY'
    | 'ADMIN_ADJUST'
    | 'REFUND'
    | 'BONUS'
    | 'DONATE_AUTHOR'
    | 'WITHDRAWAL'
    | 'TRANSFER';

export interface UserWallet {
    id: string;
    userId: string;
    /** Xu mua qua VNPay/Apple IAP/Google Play — chỉ tiêu được, không rút. */
    purchasedBalance: number;
    /** Xu kiếm được từ bán chương/donate/hoàn — rút được, không chuyển. */
    earnedBalance: number;
    /** @deprecated tổng = purchasedBalance + earnedBalance. */
    balance: number;
    isLocked?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CoinTransaction {
    id: string;
    walletId: string;
    /** Dương = cộng (nạp/hoàn/bonus), âm = trừ (mua/donate/rút). */
    amount: number;
    type: TransactionType;
    description: string;
    referenceId?: string | null;
    createdAt: string;
}

export interface CoinPackage {
    id: string;
    name: string;
    coinAmount: number;
    priceVND: number;
    description?: string | null;
    isActive: boolean;
    /** SKU bên App Store Connect — null nếu gói chỉ bán qua web/VNPay. */
    appleProductId?: string | null;
    googleProductId?: string | null;
    createdAt?: string;
    updatedAt?: string;
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
