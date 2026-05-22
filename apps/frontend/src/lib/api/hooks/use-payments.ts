import { useQuery, useMutation } from '@tanstack/react-query';
import { PaymentsService } from '../payments.service';

/**
 * Gói xu đang bán cho trang Cửa hàng (/shop). Khác với useCoinPackages trong
 * use-coin-packages.ts — hook đó gọi endpoint admin, hook này gọi endpoint
 * công khai cho người dùng thường.
 */
export function useShopCoinPackages() {
    return useQuery({
        queryKey: ['payments', 'coin-packages'],
        queryFn: () => PaymentsService.listCoinPackages(),
        staleTime: 5 * 60 * 1000, // 5 phút — danh sách gói ít thay đổi
    });
}

/**
 * Khởi tạo giao dịch nạp xu. Component tự xử lý redirect tới payUrl trong
 * onSuccess (không invalidate gì vì người dùng sẽ rời trang sang VNPay).
 */
export function useCreateCoinPackagePayment() {
    return useMutation({
        mutationFn: ({ packageId, bankCode }: { packageId: string; bankCode?: string }) =>
            PaymentsService.createCoinPackagePayment(packageId, { bankCode }),
    });
}

/** Lịch sử giao dịch nạp xu của người dùng hiện tại. */
export function useMyPayments(enabled: boolean = true) {
    return useQuery({
        queryKey: ['payments', 'me'],
        queryFn: () => PaymentsService.listMyPayments(),
        enabled,
        staleTime: 15 * 1000,
    });
}
