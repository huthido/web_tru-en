'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useWalletBalance } from '@/lib/api/hooks/use-wallet';
import { useShopCoinPackages, useCreateCoinPackagePayment } from '@/lib/api/hooks/use-payments';
import { Store, Coins, Loader2, ShoppingCart, History } from 'lucide-react';

export default function ShopPage() {
    const { data: wallet } = useWalletBalance();
    const { data: packages, isLoading } = useShopCoinPackages();
    const createPayment = useCreateCoinPackagePayment();
    // Id gói đang được mua — để chỉ disable đúng nút đó.
    const [buyingId, setBuyingId] = useState<string | null>(null);

    const totalBalance = (wallet?.purchasedBalance ?? 0) + (wallet?.earnedBalance ?? 0);

    const handleBuy = async (packageId: string) => {
        setBuyingId(packageId);
        try {
            const res = await createPayment.mutateAsync({ packageId });
            if (res?.payUrl) {
                // Chuyển hướng sang cổng thanh toán VNPay.
                window.location.href = res.payUrl;
            } else {
                toast.error('Không nhận được liên kết thanh toán.');
                setBuyingId(null);
            }
        } catch (e: any) {
            toast.error(
                e?.response?.data?.error ||
                    e?.response?.data?.message ||
                    'Không thể khởi tạo thanh toán.',
            );
            setBuyingId(null);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto">
                            {/* Tiêu đề + số dư hiện tại */}
                            <div className="bg-surface-container rounded-lg p-6 md:p-8 mb-6 shadow-sm border border-outline-variant">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2 flex items-center gap-2">
                                            <Store className="w-7 h-7 text-primary" /> Cửa hàng
                                        </h1>
                                        <p className="text-on-surface-variant text-sm">
                                            Chọn gói xu để nạp vào tài khoản. Thanh toán an toàn qua VNPay.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-container">
                                        <Coins className="w-5 h-5 text-on-primary-container" />
                                        <span className="text-sm text-on-primary-container">
                                            Số dư:{' '}
                                            <span className="font-bold">
                                                {totalBalance.toLocaleString('vi-VN')} xu
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Danh sách gói xu */}
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20 text-on-surface-variant">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải gói xu...
                                </div>
                            ) : !packages || packages.length === 0 ? (
                                <div className="bg-surface-container rounded-lg p-10 text-center shadow-sm border border-outline-variant">
                                    <Coins className="w-12 h-12 mx-auto mb-3 text-on-surface-variant/50" />
                                    <p className="text-on-surface-variant">Hiện chưa có gói xu nào.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {packages.map((pkg) => {
                                        const isBuying = buyingId === pkg.id;
                                        return (
                                            <div
                                                key={pkg.id}
                                                className="bg-surface-container rounded-lg p-6 shadow-sm border border-outline-variant flex flex-col transition-shadow hover:shadow-md"
                                            >
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                                                        <Coins className="w-5 h-5 text-on-primary-container" />
                                                    </span>
                                                    <h3 className="font-bold text-on-surface">{pkg.name}</h3>
                                                </div>

                                                <p className="text-2xl font-extrabold text-primary mb-1">
                                                    {pkg.coinAmount.toLocaleString('vi-VN')}{' '}
                                                    <span className="text-base font-semibold text-on-surface-variant">
                                                        xu
                                                    </span>
                                                </p>
                                                <p className="text-sm text-on-surface-variant mb-1">
                                                    {pkg.priceVND.toLocaleString('vi-VN')} ₫
                                                </p>
                                                {pkg.description && (
                                                    <p className="text-xs text-on-surface-variant/80 mb-4 line-clamp-2">
                                                        {pkg.description}
                                                    </p>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleBuy(pkg.id)}
                                                    disabled={isBuying || !!buyingId}
                                                    className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:opacity-90 text-on-primary rounded-lg font-medium transition-all disabled:opacity-50"
                                                >
                                                    {isBuying ? (
                                                        <>
                                                            <Loader2 size={18} className="animate-spin" /> Đang xử lý...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShoppingCart size={18} /> Mua
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Liên kết tới lịch sử giao dịch */}
                            <div className="mt-6 text-center">
                                <Link
                                    href="/wallet/payment-result"
                                    className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
                                >
                                    <History size={16} /> Tra cứu kết quả thanh toán
                                </Link>
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        </ProtectedRoute>
    );
}
