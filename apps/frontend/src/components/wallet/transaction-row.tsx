'use client';

import {
    ArrowDownCircle,
    ArrowUpCircle,
    BookOpen,
    BookText,
    Gift,
    Heart,
    Settings,
    Send,
    Undo2,
    type LucideIcon,
} from 'lucide-react';
import type { CoinTransaction, TransactionType } from '@/lib/api/wallet.service';

const TYPE_META: Record<TransactionType, { label: string; icon: LucideIcon; color: string }> = {
    DEPOSIT: { label: 'Nạp xu', icon: ArrowDownCircle, color: 'text-emerald-600 dark:text-emerald-400' },
    WITHDRAWAL: { label: 'Rút xu', icon: ArrowUpCircle, color: 'text-orange-600 dark:text-orange-400' },
    PURCHASE_CHAPTER: { label: 'Mua chương', icon: BookOpen, color: 'text-blue-600 dark:text-blue-400' },
    PURCHASE_STORY: { label: 'Mua truyện', icon: BookText, color: 'text-violet-600 dark:text-violet-400' },
    DONATE_AUTHOR: { label: 'Ủng hộ tác giả', icon: Heart, color: 'text-rose-600 dark:text-rose-400' },
    TRANSFER: { label: 'Chuyển xu', icon: Send, color: 'text-sky-600 dark:text-sky-400' },
    BONUS: { label: 'Quà tặng', icon: Gift, color: 'text-amber-600 dark:text-amber-400' },
    REFUND: { label: 'Hoàn xu', icon: Undo2, color: 'text-teal-600 dark:text-teal-400' },
    ADMIN_ADJUST: { label: 'Điều chỉnh', icon: Settings, color: 'text-zinc-600 dark:text-zinc-400' },
};

export const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string }[] = (
    Object.keys(TYPE_META) as TransactionType[]
).map((t) => ({ value: t, label: TYPE_META[t].label }));

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function TransactionRow({ tx }: { tx: CoinTransaction }) {
    const meta = TYPE_META[tx.type] ?? {
        label: tx.type,
        icon: Settings,
        color: 'text-on-surface-variant',
    };
    const Icon = meta.icon;
    const isCredit = tx.amount > 0;
    return (
        <div className="flex items-start gap-3 py-3 border-b border-outline-variant last:border-b-0">
            <div className={`w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-on-surface text-sm">{meta.label}</span>
                </div>
                {tx.description && (
                    <p className="text-xs text-on-surface-variant truncate">{tx.description}</p>
                )}
                <p className="text-xs text-on-surface-variant/70 mt-0.5">{formatTime(tx.createdAt)}</p>
            </div>
            <div
                className={`text-sm font-semibold flex-shrink-0 ${
                    isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
            >
                {isCredit ? '+' : ''}
                {tx.amount.toLocaleString('vi-VN')} xu
            </div>
        </div>
    );
}
