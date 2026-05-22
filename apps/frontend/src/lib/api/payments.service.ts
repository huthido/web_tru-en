import { apiClient } from './client';
import { CoinPackage } from '@/types/coin-package';

/** Trạng thái một giao dịch nạp xu. */
export type PaymentStatus =
    | 'PENDING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'
    | 'REFUNDED';

/** Kết quả khi khởi tạo một giao dịch nạp xu — dùng để redirect sang VNPay. */
export interface CreatePaymentResult {
    paymentId: string;
    txnRef: string;
    payUrl: string;
}

/** Một dòng lịch sử giao dịch nạp xu của người dùng. */
export interface MyPayment {
    id: string;
    provider: string;
    amount: number;
    coinAmount: number;
    status: PaymentStatus;
    txnRef: string;
    providerTxn: string | null;
    paidAt: string | null;
    createdAt: string;
    package?: { name: string; coinAmount: number } | null;
}

// apiClient đã tự bóc lớp vỏ { success, data } của backend (xem client.ts),
// nên response.data chính là payload. Helper dưới vẫn phòng thủ phòng khi
// backend trả về dạng chưa bóc.
const unwrap = <T>(raw: any): T => (raw && raw.data !== undefined ? raw.data : raw);

export const PaymentsService = {
    /** Danh sách gói xu đang bán (chỉ gói isActive, rẻ → đắt). */
    listCoinPackages: async (): Promise<CoinPackage[]> => {
        const response = await apiClient.get<CoinPackage[]>('/payments/coin-packages');
        const data = unwrap<CoinPackage[]>(response.data);
        return Array.isArray(data) ? data : [];
    },

    /**
     * Khởi tạo giao dịch nạp xu cho một gói. Trả về payUrl để chuyển hướng
     * người dùng sang cổng thanh toán (mặc định VNPay).
     */
    createCoinPackagePayment: async (
        packageId: string,
        body: { bankCode?: string } = {},
    ): Promise<CreatePaymentResult> => {
        const response = await apiClient.post<CreatePaymentResult>(
            `/payments/coin-packages/${packageId}`,
            { provider: 'VNPAY', ...body },
        );
        return unwrap<CreatePaymentResult>(response.data);
    },

    /** Lịch sử giao dịch nạp xu của người dùng hiện tại. */
    listMyPayments: async (): Promise<MyPayment[]> => {
        const response = await apiClient.get<MyPayment[]>('/payments/me');
        const data = unwrap<MyPayment[]>(response.data);
        return Array.isArray(data) ? data : [];
    },
};
