'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface RefreshButtonProps {
    queryKeys?: (string | string[])[];
    onRefresh?: () => void;
    className?: string;
}

export function RefreshButton({ queryKeys = [], onRefresh, className = '' }: RefreshButtonProps) {
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        
        try {
            // Invalidate all queries if no specific keys provided
            if (queryKeys.length === 0) {
                await queryClient.invalidateQueries();
            } else {
                // Invalidate specific queries
                for (const key of queryKeys) {
                    await queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
                }
            }
            
            // Refetch all active queries
            await queryClient.refetchQueries();
            
            // Call custom refresh handler if provided
            if (onRefresh) {
                onRefresh();
            }
        } finally {
            // Small delay for visual feedback
            setTimeout(() => {
                setIsRefreshing(false);
            }, 500);
        }
    };

    return (
        <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${className}`}
            title="Làm mới dữ liệu"
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${isRefreshing ? 'animate-spin' : ''} sm:w-[18px] sm:h-[18px]`}
            >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span className="hidden sm:inline">{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
        </button>
    );
}

