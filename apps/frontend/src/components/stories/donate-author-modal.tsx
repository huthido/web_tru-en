'use client';

import React, { useState } from 'react';
import { HeartHandshake, Coins, X, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useWalletBalance, useDonateAuthor, useAuthorDonations } from '@/lib/api/hooks/use-wallet';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';

interface DonateAuthorModalProps {
    isOpen: boolean;
    onClose: () => void;
    authorId: string;
    authorName: string;
    storyId?: string;
    storyTitle?: string;
}

const PRESET_AMOUNTS = [10, 50, 100, 200, 500, 1000];

export function DonateAuthorModal({
    isOpen,
    onClose,
    authorId,
    authorName,
    storyId,
    storyTitle,
}: DonateAuthorModalProps) {
    const { user, isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const { data: wallet } = useWalletBalance(isAuthenticated);
    const { data: donationStats } = useAuthorDonations(authorId);
    const donateMutation = useDonateAuthor();

    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    if (!isOpen) return null;

    const amount = selectedAmount || (customAmount ? parseInt(customAmount, 10) : 0);
    const balance = wallet?.balance || 0;
    const isInsufficientBalance = amount > 0 && amount > balance;
    const canDonate = isAuthenticated && amount > 0 && amount <= balance && !donateMutation.isPending;

    const handleSelectPreset = (val: number) => {
        setSelectedAmount(val);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        setCustomAmount(val);
        setSelectedAmount(null);
    };

    const handleDonate = async () => {
        if (!canDonate) return;

        try {
            await donateMutation.mutateAsync({
                authorId,
                storyId,
                amount,
                message: message.trim() || undefined,
            });
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setSelectedAmount(null);
                setCustomAmount('');
                setMessage('');
                onClose();
            }, 2500);
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra';
            showToast(errorMsg, 'error');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'fadeIn 0.3s ease-out' }}
            >
                {/* Success State */}
                {showSuccess ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center animate-bounce">
                                <Sparkles size={40} className="text-white" />
                            </div>
                            {/* Confetti dots */}
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                        backgroundColor: ['#f472b6', '#fb923c', '#facc15', '#34d399', '#60a5fa', '#a78bfa', '#f87171', '#38bdf8'][i],
                                        top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 8)}%`,
                                        left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 8)}%`,
                                        animation: `ping 1.5s ease-in-out infinite ${i * 0.1}s`,
                                    }}
                                />
                            ))}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Cảm ơn bạn! 🎉
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center">
                            Đã ủng hộ <span className="font-bold text-pink-500">{amount} coin</span> cho tác giả{' '}
                            <span className="font-semibold">{authorName}</span>
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="relative bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-5 rounded-t-2xl">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                                aria-label="Đóng"
                            >
                                <X size={18} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <HeartHandshake size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Ủng hộ tác giả</h2>
                                    <p className="text-pink-100 text-sm">{authorName}</p>
                                </div>
                            </div>
                            {storyTitle && (
                                <p className="mt-2 text-pink-100 text-sm truncate">
                                    📖 {storyTitle}
                                </p>
                            )}
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-5">
                            {/* Not logged in */}
                            {!isAuthenticated ? (
                                <div className="text-center py-4">
                                    <AlertCircle size={48} className="text-amber-500 mx-auto mb-3" />
                                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                                        Bạn cần đăng nhập để ủng hộ tác giả
                                    </p>
                                    <Link
                                        href="/login"
                                        className="inline-block px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Đăng nhập
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {/* Balance Display */}
                                    <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800">
                                        <div className="flex items-center gap-2">
                                            <Coins size={20} className="text-amber-500" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Số dư</span>
                                        </div>
                                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                            {balance.toLocaleString('vi-VN')} coin
                                        </span>
                                    </div>

                                    {/* Preset Amounts */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Chọn số coin muốn ủng hộ
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {PRESET_AMOUNTS.map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => handleSelectPreset(val)}
                                                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${selectedAmount === val
                                                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200 dark:shadow-pink-900/30 scale-105'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }`}
                                                >
                                                    {val} 🪙
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Amount */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Hoặc nhập số coin tùy ý
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={customAmount}
                                            onChange={handleCustomAmountChange}
                                            placeholder="Nhập số coin..."
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                                        />
                                    </div>

                                    {/* Insufficient Balance Warning */}
                                    {isInsufficientBalance && (
                                        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">
                                            <AlertCircle size={18} />
                                            <span className="text-sm font-medium">
                                                Số dư không đủ. Bạn cần thêm {(amount - balance).toLocaleString('vi-VN')} coin.
                                            </span>
                                        </div>
                                    )}

                                    {/* Message */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Lời nhắn (tùy chọn)
                                        </label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            rows={2}
                                            maxLength={500}
                                            placeholder="Viết lời nhắn gửi tác giả..."
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all resize-none"
                                        />
                                    </div>

                                    {/* Donate Button */}
                                    <button
                                        onClick={handleDonate}
                                        disabled={!canDonate}
                                        className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-pink-200 dark:hover:shadow-pink-900/30 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {donateMutation.isPending ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Đang xử lý...
                                            </span>
                                        ) : amount > 0 ? (
                                            `Ủng hộ ${amount.toLocaleString('vi-VN')} coin 💖`
                                        ) : (
                                            'Chọn số coin để ủng hộ'
                                        )}
                                    </button>
                                </>
                            )}

                            {/* Donation Stats */}
                            {donationStats && donationStats.donationCount > 0 && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Lịch sử ủng hộ
                                        </h4>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {donationStats.donationCount} lượt · {donationStats.totalCoins.toLocaleString('vi-VN')} coin
                                        </span>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {donationStats.recentDonors.map((donor) => (
                                            <div
                                                key={donor.id}
                                                className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {(donor.user.displayName || donor.user.username)?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="text-gray-700 dark:text-gray-300 truncate">
                                                        {donor.user.displayName || donor.user.username}
                                                    </span>
                                                </div>
                                                <span className="text-pink-500 font-semibold flex-shrink-0 ml-2">
                                                    +{donor.amount} 🪙
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
