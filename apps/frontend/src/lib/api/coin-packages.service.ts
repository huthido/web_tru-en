import { apiClient } from './client';
import { CoinPackage, CreateCoinPackageDto, UpdateCoinPackageDto } from '@/types/coin-package';

export const CoinPackagesService = {
    findAll: async (includeInactive: boolean = false) => {
        const response = await apiClient.get<CoinPackage[]>('/admin/coin-packages', {
            params: { includeInactive },
        });
        return response.data.data || [];
    },

    create: async (data: CreateCoinPackageDto) => {
        const response = await apiClient.post<CoinPackage>('/admin/coin-packages', data);
        return response.data.data;
    },

    update: async (id: string, data: UpdateCoinPackageDto) => {
        const response = await apiClient.patch<CoinPackage>(`/admin/coin-packages/${id}`, data);
        return response.data.data;
    },

    remove: async (id: string) => {
        const response = await apiClient.delete(`/admin/coin-packages/${id}`);
        return response.data;
    },
};
