import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, Settings, UpdateSettingsRequest } from '../settings.service';

export const useSettings = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            try {
                return await settingsService.get();
            } catch (error: any) {
                // If database is unavailable, return default settings
                // Backend should handle this, but we add fallback here for network errors
                console.warn('Failed to fetch settings, using defaults:', error);
                return {
                    id: 'default',
                    siteName: 'Web Truyen Tien Hung',
                    siteDescription: 'Nền tảng đọc truyện online',
                    maintenanceMode: false,
                    allowRegistration: true,
                    requireEmailVerification: false,
                    siteLogo: null,
                    siteFavicon: null,
                    siteUrl: null,
                    maintenanceMessage: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as unknown as Settings;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Keep previous data when refetch fails (important for database errors)
        placeholderData: (previousData) => previousData,
        throwOnError: false, // Don't throw errors, return default settings instead
    });
};

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateSettingsRequest) => settingsService.update(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
};

export const useUploadLogo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => settingsService.uploadLogo(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
};

export const useUploadFavicon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => settingsService.uploadFavicon(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
};
