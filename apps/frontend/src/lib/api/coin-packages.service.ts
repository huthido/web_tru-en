import { apiClient } from './client';
import { CoinPackage, CreateCoinPackageDto, UpdateCoinPackageDto } from '@/types/coin-package';

// apiClient đã tự bóc lớp vỏ { success, data } của backend, nên response.data
// chính là payload (mảng cho findAll, object cho create/update). Các helper
// dưới đây vẫn phòng thủ phòng khi response về ở dạng chưa bóc.
const unwrapList = (raw: any): CoinPackage[] => {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
};

const unwrapOne = (raw: any): CoinPackage => {
    if (raw && raw.data && !Array.isArray(raw.data)) return raw.data;
    return raw;
};

export const CoinPackagesService = {
    findAll: async (includeInactive: boolean = false) => {
        const response = await apiClient.get<CoinPackage[]>('/admin/coin-packages', {
            params: { includeInactive },
        });
        return unwrapList(response.data);
    },

    create: async (data: CreateCoinPackageDto) => {
        const response = await apiClient.post<CoinPackage>('/admin/coin-packages', data);
        return unwrapOne(response.data);
    },

    update: async (id: string, data: UpdateCoinPackageDto) => {
        const response = await apiClient.patch<CoinPackage>(`/admin/coin-packages/${id}`, data);
        return unwrapOne(response.data);
    },

    remove: async (id: string) => {
        const response = await apiClient.delete(`/admin/coin-packages/${id}`);
        return response.data;
    },
};
