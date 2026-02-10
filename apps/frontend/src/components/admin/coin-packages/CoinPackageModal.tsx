import { useState, useEffect } from 'react';
import { CoinPackage, CreateCoinPackageDto } from '@/types/coin-package';

interface CoinPackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateCoinPackageDto) => Promise<void>;
    initialData?: CoinPackage | null;
    isLoading?: boolean;
}

export function CoinPackageModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isLoading = false,
}: CoinPackageModalProps) {
    const [formData, setFormData] = useState<CreateCoinPackageDto>({
        name: '',
        coinAmount: 0,
        priceVND: 0,
        description: '',
        isActive: true,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                coinAmount: initialData.coinAmount,
                priceVND: initialData.priceVND,
                description: initialData.description || '',
                isActive: initialData.isActive,
            });
        } else {
            setFormData({
                name: '',
                coinAmount: 0,
                priceVND: 0,
                description: '',
                isActive: true,
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {initialData ? 'Chỉnh sửa gói xu' : 'Thêm gói xu mới'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tên gói
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="Ví dụ: Gói Cơ Bản"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Số xu
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.coinAmount}
                                    onChange={(e) => setFormData({ ...formData, coinAmount: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Giá tiền (VNĐ)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.priceVND}
                                    onChange={(e) => setFormData({ ...formData, priceVND: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mô tả (Tùy chọn)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Đang hoạt động (Hiển thị cho người dùng)
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    initialData ? 'Cập nhật' : 'Tạo gói'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
