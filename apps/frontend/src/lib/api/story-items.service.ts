import { apiClient } from './client';

export interface StoryItemPublic {
    id: string;
    name: string;
    description?: string | null;
    imageUrl: string;
    price: number;
    stock: number | null;
    soldCount: number;
    remaining: number | null; // null = không giới hạn
    hasFile: boolean;
    ownedQuantity: number;
}

export interface StoryItemManage {
    id: string;
    storyId: string;
    name: string;
    description?: string | null;
    imageUrl: string;
    fileUrl?: string | null;
    price: number;
    stock: number | null;
    soldCount: number;
    isActive: boolean;
    remaining: number | null;
    soldQuantity: number;
    revenue: number;
    createdAt: string;
}

export interface MyStoryItem {
    itemId: string;
    name: string;
    imageUrl: string | null;
    hasFile: boolean;
    quantity: number;
    lastBoughtAt: string | null;
    storySlug: string | null;
    storyTitle: string | null;
}

export interface UpsertStoryItem {
    name: string;
    description?: string;
    imageUrl: string;
    fileUrl?: string;
    price: number;
    stock?: number | null;
    isActive?: boolean;
}

async function uploadTo(path: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiClient.post(path, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data as any;
}

export const storyItemsService = {
    listForStory: async (storyId: string): Promise<StoryItemPublic[]> => {
        const res = await apiClient.get(`/stories/${storyId}/items`);
        return Array.isArray(res.data) ? (res.data as StoryItemPublic[]) : [];
    },
    manage: async (storyId: string): Promise<StoryItemManage[]> => {
        const res = await apiClient.get(`/stories/${storyId}/items/manage`);
        return Array.isArray(res.data) ? (res.data as StoryItemManage[]) : [];
    },
    create: async (storyId: string, dto: UpsertStoryItem) => {
        const res = await apiClient.post(`/stories/${storyId}/items`, dto);
        return res.data;
    },
    update: async (id: string, dto: Partial<UpsertStoryItem>) => {
        const res = await apiClient.patch(`/items/${id}`, dto);
        return res.data;
    },
    remove: async (id: string) => {
        const res = await apiClient.delete(`/items/${id}`);
        return res.data as unknown as { hardDeleted: boolean; message?: string };
    },
    buy: async (id: string, quantity: number) => {
        const res = await apiClient.post(`/items/${id}/buy`, { quantity });
        return res.data as unknown as { newBalance: number; pricePaid: number; quantity: number };
    },
    getDownload: async (id: string): Promise<{ url: string; name: string }> => {
        const res = await apiClient.get(`/items/${id}/download`);
        return res.data as unknown as { url: string; name: string };
    },
    myItems: async (): Promise<MyStoryItem[]> => {
        const res = await apiClient.get('/me/items');
        return Array.isArray(res.data) ? (res.data as MyStoryItem[]) : [];
    },
    uploadImage: async (file: File): Promise<string> => {
        const data = await uploadTo('/items/upload-image', file);
        return data?.url || '';
    },
    uploadFile: async (file: File): Promise<{ url: string; name: string; size: number }> => {
        return uploadTo('/items/upload-file', file);
    },
};
