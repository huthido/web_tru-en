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
    /** Metadata thô: chứa userClaimedPaidAt/userClaimCount khi user báo đã CK. */
    providerData?: any;
    package?: { name: string; coinAmount: number } | null;
}

/** Hướng dẫn chuyển khoản thủ công trả về khi tạo yêu cầu nạp bằng tay. */
export interface ManualPaymentInstructions {
    paymentId: string;
    reference: string;
    status: PaymentStatus;
    amount: number;
    coinAmount: number;
    packageName: string;
    bank: {
        bankName: string | null;
        bankBin: string | null;
        accountNumber: string | null;
        accountHolder: string | null;
        instructions: string | null;
    };
    qrUrl: string;
}

/** Một yêu cầu chuyển khoản thủ công trong trang duyệt của admin. */
export interface AdminManualPayment {
    id: string;
    amount: number;
    coinAmount: number;
    status: PaymentStatus;
    txnRef: string;
    providerData: any;
    paidAt: string | null;
    createdAt: string;
    package?: { name: string; coinAmount: number } | null;
    user?: { id: string; username: string; displayName: string | null; email: string } | null;
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

    /**
     * Tạo yêu cầu nạp xu qua chuyển khoản thủ công. Trả về hướng dẫn CK + ảnh
     * QR VietQR + mã tham chiếu. Giao dịch chờ admin xác nhận.
     */
    createManualPayment: async (packageId: string): Promise<ManualPaymentInstructions> => {
        const response = await apiClient.post<ManualPaymentInstructions>(
            `/payments/manual/coin-packages/${packageId}`,
            {},
        );
        return unwrap<ManualPaymentInstructions>(response.data);
    },

    /** Lấy trạng thái một giao dịch (để poll xem admin đã xác nhận chưa). */
    getPayment: async (id: string): Promise<MyPayment> => {
        const response = await apiClient.get<MyPayment>(`/payments/${id}`);
        return unwrap<MyPayment>(response.data);
    },

    /**
     * Báo "tôi đã chuyển khoản" — không cộng xu, chỉ đánh dấu để admin đối
     * soát lại khi họ sót thông báo biến động số dư.
     */
    claimManualPaid: async (paymentId: string): Promise<MyPayment> => {
        const response = await apiClient.post<MyPayment>(
            `/payments/manual/${paymentId}/claim`,
            {},
        );
        return unwrap<MyPayment>(response.data);
    },

    // ─── Admin ───────────────────────────────────────────────────────────
    /**
     * Danh sách yêu cầu chuyển khoản thủ công (admin). `search` đối soát theo
     * mã tham chiếu (nội dung CK) hoặc tên/email người nạp.
     */
    adminListManualPayments: async (
        status?: string,
        search?: string,
    ): Promise<AdminManualPayment[]> => {
        const params: Record<string, string> = {};
        if (status) params.status = status;
        if (search && search.trim()) params.search = search.trim();
        const response = await apiClient.get<AdminManualPayment[]>('/admin/payments/manual', {
            params: Object.keys(params).length ? params : undefined,
        });
        const data = unwrap<AdminManualPayment[]>(response.data);
        return Array.isArray(data) ? data : [];
    },

    /** Xác nhận (cộng xu) hoặc từ chối một yêu cầu chuyển khoản thủ công (admin). */
    adminProcessManualPayment: async (
        id: string,
        action: 'CONFIRM' | 'REJECT',
        note?: string,
    ): Promise<AdminManualPayment> => {
        const response = await apiClient.patch<AdminManualPayment>(
            `/admin/payments/manual/${id}`,
            { action, note },
        );
        return unwrap<AdminManualPayment>(response.data);
    },
};
