'use client';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    onClose?: () => void;
    variant?: 'danger' | 'warning' | 'info';
    confirmButtonClassName?: string;
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
    onClose,
    variant = 'danger',
    confirmButtonClassName,
    isLoading = false,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const handleCancel = onCancel || onClose || (() => {});

    const variantStyles = {
        danger: {
            button: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
        },
        warning: {
            button: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700',
        },
        info: {
            button: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700',
        },
    };

    const buttonClassName = confirmButtonClassName || variantStyles[variant].button;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={handleCancel}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-6">
                        {message}
                    </p>
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
                        >
                            {isLoading ? 'Đang xử lý...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

