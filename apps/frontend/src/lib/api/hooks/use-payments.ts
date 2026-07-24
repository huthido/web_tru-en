import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

/**
 * Tạo yêu cầu nạp xu qua chuyển khoản thủ công. Component tự mở modal hướng dẫn
 * với dữ liệu trả về (QR + STK + mã tham chiếu).
 */
export function useCreateManualPayment() {
    return useMutation({
        mutationFn: (packageId: string) => PaymentsService.createManualPayment(packageId),
    });
}

/**
 * Poll trạng thái một giao dịch để tự phát hiện khi admin đã xác nhận. Dừng
 * poll khi giao dịch đã kết thúc (COMPLETED/CANCELLED/FAILED/REFUNDED).
 */
export function usePaymentStatus(paymentId: string | null) {
    return useQuery({
        queryKey: ['payments', 'status', paymentId],
        queryFn: () => PaymentsService.getPayment(paymentId as string),
        enabled: !!paymentId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status && status !== 'PENDING' ? false : 5000;
        },
    });
}

/**
 * Báo "tôi đã chuyển khoản". Invalidate query trạng thái để modal hiện ngay
 * trạng thái đã báo mà không phải đợi vòng poll kế tiếp.
 */
export function useClaimManualPaid() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (paymentId: string) => PaymentsService.claimManualPaid(paymentId),
        onSuccess: (_data, paymentId) => {
            qc.invalidateQueries({ queryKey: ['payments', 'status', paymentId] });
        },
    });
}

/** Danh sách yêu cầu chuyển khoản thủ công cho trang duyệt của admin. */
export function useAdminManualPayments(status?: string, search?: string) {
    return useQuery({
        queryKey: ['admin', 'manual-payments', status ?? 'ALL', search ?? ''],
        queryFn: () => PaymentsService.adminListManualPayments(status, search),
        staleTime: 10 * 1000,
    });
}

/** Xác nhận / từ chối một yêu cầu chuyển khoản thủ công (admin). */
export function useProcessManualPayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, action, note }: { id: string; action: 'CONFIRM' | 'REJECT'; note?: string }) =>
            PaymentsService.adminProcessManualPayment(id, action, note),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'manual-payments'] });
        },
    });
}
