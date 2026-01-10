'use client';

import { usePage } from '@/lib/api/hooks/use-pages';
import { Loading } from '@/components/ui/loading';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';

interface PopupSupportContentProps {
    onClose?: () => void;
}

export function PopupSupportContent({ onClose }: PopupSupportContentProps) {
    const { data: page, isLoading, error } = usePage('popup-support');

    if (isLoading) {
        return (
            <div className="px-6 py-6">
                <Loading />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="px-6 py-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                    Không thể tải nội dung. Vui lòng thử lại sau.
                </p>
            </div>
        );
    }

    return (
        <div className="px-6 py-6 space-y-6">
            {/* Content from CMS */}
            <div
                className="space-y-4 text-base text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: page.content }}
            />

            {/* QR Code Section - Keep this as it's specific to support */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Thông tin ủng hộ
                </h3>

                {/* QR Code */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white p-2">
                        <OptimizedImage
                            src="/ungho.jpg"
                            alt="Mã QR ủng hộ"
                            fill
                            objectFit="contain"
                            sizes={ImageSizes.qrCode}
                            quality={90}
                            placeholder="blur"
                        />
                    </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-sm md:text-base text-gray-700 dark:text-gray-300">
                    <p>
                        <strong className="text-gray-900 dark:text-white">Rất mong mọi người ghi rõ Họ và Tên cũng như Biệt Danh</strong>
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-r-lg">
                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Lưu ý:</p>
                        <p>Ghi chú ủng hộ vì lý do gì, ủng hộ tác phẩm nào và vì sao</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            (Ví dụ: ủng hộ bộ truyện, phim, sách nào đó để mong phát hành sách hoặc làm phim)
                        </p>
                    </div>
                    <p className="text-center font-semibold text-gray-900 dark:text-white mt-4">
                        Cảm ơn tất cả mọi người.
                    </p>
                </div>
            </div>
        </div>
    );
}

