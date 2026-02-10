import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CoinPackagesService } from '../coin-packages.service';
import { CreateCoinPackageDto, UpdateCoinPackageDto } from '@/types/coin-package';
import { toast } from 'react-hot-toast';

export const useCoinPackages = (includeInactive: boolean = false) => {
    return useQuery({
        queryKey: ['coin-packages', { includeInactive }],
        queryFn: () => CoinPackagesService.findAll(includeInactive),
    });
};

export const useCreateCoinPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCoinPackageDto) => CoinPackagesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coin-packages'] });
            toast.success('Tạo gói xu thành công');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo gói xu');
        },
    });
};

export const useUpdateCoinPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCoinPackageDto }) =>
            CoinPackagesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coin-packages'] });
            toast.success('Cập nhật gói xu thành công');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật gói xu');
        },
    });
};

export const useDeleteCoinPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => CoinPackagesService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coin-packages'] });
            toast.success('Xóa gói xu thành công');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa gói xu');
        },
    });
};
