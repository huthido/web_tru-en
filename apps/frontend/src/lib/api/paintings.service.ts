import { apiClient } from './client';

export interface PaintingAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
}

export interface ContactInfo {
  phone?: string;
  zalo?: string;
  facebook?: string;
}

export interface Painting {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  price?: number | null;
  contactInfo?: ContactInfo | null;
  status: 'AVAILABLE' | 'SOLD';
  viewCount: number;
  likeCount: number;
  createdAt: string;
  author: PaintingAuthor;
}

export interface PaintingsListResponse {
  items: Painting[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const paintingsService = {
  getList: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    authorId?: string;
  }): Promise<PaintingsListResponse> => {
    const r = await apiClient.get<PaintingsListResponse>('/paintings', { params });
    return r.data as unknown as PaintingsListResponse;
  },

  getOne: async (id: string): Promise<Painting> => {
    const r = await apiClient.get<Painting>(`/paintings/${id}`);
    return r.data as unknown as Painting;
  },

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const r = await apiClient.post<{ url: string }>('/paintings/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data as unknown as { url: string };
  },

  create: async (data: {
    title: string;
    description?: string;
    imageUrl: string;
    price?: number;
    contactInfo?: ContactInfo;
  }): Promise<Painting> => {
    const r = await apiClient.post<Painting>('/paintings', data);
    return r.data as unknown as Painting;
  },

  update: async (id: string, data: Partial<{
    title: string;
    description: string;
    imageUrl: string;
    price: number;
    contactInfo: ContactInfo;
  }>): Promise<Painting> => {
    const r = await apiClient.patch<Painting>(`/paintings/${id}`, data);
    return r.data as unknown as Painting;
  },

  delete: async (id: string) => {
    const r = await apiClient.delete(`/paintings/${id}`);
    return r.data;
  },

  markSold: async (id: string): Promise<Painting> => {
    const r = await apiClient.patch<Painting>(`/paintings/${id}/sold`);
    return r.data as unknown as Painting;
  },
};
