import apiClient from './api';

export interface Story {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover: string | null;
    status: string;
    viewCount: number;
    likeCount: number;
    followCount: number;
    author: {
        id: string;
        displayName: string;
        avatar: string | null;
    };
    genres: Array<{ id: string; name: string; slug: string }>;
    _count?: {
        chapters: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface Chapter {
    id: string;
    title: string;
    chapterNumber: number;
    content: string;
    viewCount: number;
    storyId: string;
    createdAt: string;
}

export interface ChapterListItem {
    id: string;
    title: string;
    chapterNumber: number;
    viewCount: number;
    createdAt: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface HomepageData {
    newest: Story[];
    recommended: Story[];
    popular: Story[];
}

class StoryService {
    // Homepage data
    async getNewest(limit = 10): Promise<Story[]> {
        const response = await apiClient.get<Story[]>('/stories/homepage/newest', {
            params: { limit },
        });
        return response.data;
    }

    async getRecommended(limit = 10): Promise<Story[]> {
        const response = await apiClient.get<Story[]>('/stories/homepage/recommended', {
            params: { limit },
        });
        return response.data;
    }

    // Story details
    async getBySlug(slug: string): Promise<Story> {
        const response = await apiClient.get<Story>(`/stories/${slug}`);
        return response.data;
    }

    async getChapters(storyId: string): Promise<ChapterListItem[]> {
        const response = await apiClient.get<ChapterListItem[]>(`/stories/${storyId}/chapters`);
        return response.data;
    }

    // Chapter
    async getChapter(chapterId: string): Promise<Chapter> {
        const response = await apiClient.get<Chapter>(`/chapters/${chapterId}`);
        return response.data;
    }

    // Search
    async search(query: string, page = 1, limit = 20): Promise<PaginatedResponse<Story>> {
        const response = await apiClient.get<PaginatedResponse<Story>>('/search', {
            params: { q: query, page, limit },
        });
        return response.data;
    }

    async getSuggestions(query: string): Promise<string[]> {
        const response = await apiClient.get<string[]>('/search/suggestions', {
            params: { q: query },
        });
        return response.data;
    }

    // User actions
    async likeStory(storyId: string): Promise<void> {
        await apiClient.post(`/stories/${storyId}/like`);
    }

    async followStory(storyId: string): Promise<void> {
        await apiClient.post(`/follows/${storyId}`);
    }

    async unfollowStory(storyId: string): Promise<void> {
        await apiClient.delete(`/follows/${storyId}`);
    }
}

export const storyService = new StoryService();
