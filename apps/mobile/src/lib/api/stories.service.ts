import { apiClient, unwrap } from './client';
import { normalizePage } from './types';
import type {
    BuyResponse,
    Paged,
    Story,
    StoryAccessInfo,
    StoryAccessType,
    StoryQueryParams,
} from './types';

export interface CreateStoryInput {
    title: string;
    description?: string;
    coverImage?: string;
    categoryIds?: string[];
    tags?: string[];
    country?: string;
    accessType?: StoryAccessType;
    price?: number;
}

export interface UpdateStoryInput extends Partial<CreateStoryInput> {
    status?: string;
}

/** Local file shape compatible với React Native FormData (uri-based, không File). */
export interface RNFileLike {
    uri: string;
    name?: string;
    type?: string;
}

/** Build a fetcher for one of the curated homepage lists. */
function homepageList(kind: string) {
    return async (limit = 15): Promise<Story[]> => {
        const res = await apiClient.get(`/stories/homepage/${kind}`, { params: { limit } });
        return unwrap<Story[]>(res) ?? [];
    };
}

export const StoriesApi = {
    /** Paginated story list with search / category / sort filters. */
    async list(params: StoryQueryParams = {}): Promise<Paged<Story>> {
        const { categories, ...rest } = params;
        const res = await apiClient.get('/stories', {
            params: {
                ...rest,
                categories: categories && categories.length ? categories.join(',') : undefined,
            },
        });
        return normalizePage<Story>(unwrap(res));
    },

    /** Story detail by slug or id — includes the published `chapters` array. */
    async getBySlug(slugOrId: string): Promise<Story> {
        const res = await apiClient.get(`/stories/${slugOrId}`);
        return unwrap<Story>(res);
    },

    newest: homepageList('newest'),
    bestOfMonth: homepageList('best-of-month'),
    recommended: homepageList('recommended'),
    topRated: homepageList('top-rated'),
    mostLiked: homepageList('most-liked'),

    async getAccess(slug: string): Promise<StoryAccessInfo> {
        const res = await apiClient.get(`/stories/${slug}/access`);
        return unwrap<StoryAccessInfo>(res);
    },

    async buy(slug: string): Promise<BuyResponse> {
        const res = await apiClient.post(`/stories/${slug}/buy`);
        return unwrap<BuyResponse>(res);
    },

    async checkLiked(storyId: string): Promise<boolean> {
        const res = await apiClient.get(`/stories/${storyId}/like`);
        return unwrap<{ isLiked: boolean }>(res)?.isLiked ?? false;
    },

    async like(storyId: string): Promise<void> {
        await apiClient.post(`/stories/${storyId}/like`);
    },

    async unlike(storyId: string): Promise<void> {
        await apiClient.delete(`/stories/${storyId}/like`);
    },

    // ─── Author endpoints ───────────────────────────────────────────────

    /** Paginated list of stories owned by the current user. */
    async myList(params: StoryQueryParams = {}): Promise<Paged<Story>> {
        const { categories, ...rest } = params;
        const res = await apiClient.get('/stories/me/list', {
            params: {
                ...rest,
                categories: categories && categories.length ? categories.join(',') : undefined,
            },
        });
        return normalizePage<Story>(unwrap(res));
    },

    async create(data: CreateStoryInput): Promise<Story> {
        const res = await apiClient.post('/stories', data);
        return unwrap<Story>(res);
    },

    async update(id: string, data: UpdateStoryInput): Promise<Story> {
        const res = await apiClient.patch(`/stories/${id}`, data);
        return unwrap<Story>(res);
    },

    async remove(id: string): Promise<void> {
        await apiClient.delete(`/stories/${id}`);
    },

    async publish(id: string): Promise<Story> {
        const res = await apiClient.post(`/stories/${id}/publish`);
        return unwrap<Story>(res);
    },

    /**
     * Upload a cover image. Pass the file shape from expo-image-picker:
     *   { uri, type: 'image/jpeg', name: 'cover.jpg' }
     * Backend trả về { coverImage: string } (URL Cloudinary).
     */
    async uploadCover(file: RNFileLike): Promise<{ coverImage: string }> {
        const formData = new FormData();
        // RN's FormData accepts {uri,type,name} objects — TS thinks it's File only.
        formData.append('file', {
            uri: file.uri,
            type: file.type ?? 'image/jpeg',
            name: file.name ?? 'cover.jpg',
        } as any);
        const res = await apiClient.post('/stories/upload-cover', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap<{ coverImage: string }>(res);
    },
};
