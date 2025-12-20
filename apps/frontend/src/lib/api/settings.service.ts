import { apiClient } from './client';
import { ApiResponse } from './client';

export interface Settings {
    id: string;
    siteName: string;
    siteDescription?: string;
    siteLogo?: string;
    siteFavicon?: string;
    siteEmail?: string;
    sitePhone?: string;
    siteAddress?: string;
    siteFacebook?: string;
    siteTwitter?: string;
    siteYoutube?: string;
    siteInstagram?: string;
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateSettingsRequest {
    siteName?: string;
    siteDescription?: string;
    siteLogo?: string;
    siteFavicon?: string;
    siteEmail?: string;
    sitePhone?: string;
    siteAddress?: string;
    siteFacebook?: string;
    siteTwitter?: string;
    siteYoutube?: string;
    siteInstagram?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    allowRegistration?: boolean;
    requireEmailVerification?: boolean;
}

export const settingsService = {
    get: async (): Promise<Settings> => {
        const response = await apiClient.get<Settings>('/settings');
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as Settings;
        }
        return (response.data as unknown as Settings);
    },

    update: async (data: UpdateSettingsRequest): Promise<Settings> => {
        const response = await apiClient.patch<Settings>('/settings', data);
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as Settings;
        }
        return (response.data as unknown as Settings);
    },

    uploadLogo: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post<{ url: string }>(
            '/settings/upload-logo',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        if ((response.data as any)?.data?.url) {
            return (response.data as any).data.url;
        }
        if ((response.data as any)?.url) {
            return (response.data as any).url;
        }
        return '';
    },

    uploadFavicon: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post<{ url: string }>(
            '/settings/upload-favicon',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        if ((response.data as any)?.data?.url) {
            return (response.data as any).data.url;
        }
        if ((response.data as any)?.url) {
            return (response.data as any).url;
        }
        return '';
    },
};
