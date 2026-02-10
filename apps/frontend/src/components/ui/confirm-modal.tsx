'use client';

import { Fragment } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'blue' | 'green';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  confirmColor = 'blue',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmColorClasses = {
    red: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/90',
    blue: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/90',
    green: 'bg-success text-success-foreground hover:bg-success/90 dark:bg-success dark:text-success-foreground dark:hover:bg-success/90',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden z-10 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex gap-3 justify-end border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 ${confirmColorClasses[confirmColor]} text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md`}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
