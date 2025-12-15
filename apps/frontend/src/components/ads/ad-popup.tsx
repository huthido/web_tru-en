'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface AdPopupProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    linkUrl?: string;
    onLinkClick?: () => void;
}

export function AdPopup({ isOpen, onClose, imageUrl, linkUrl }: AdPopupProps) {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            // Prevent body scroll when popup is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 200);
    };

    if (!isOpen) return null;

    const content = (
        <div
            className="relative w-full h-full max-w-2xl max-h-[90vh] mx-auto bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Close Button */}
            <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                aria-label="Đóng"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            {/* Ad Image */}
            {linkUrl ? (
                <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                    onClick={onLinkClick}
                >
                    <div className="relative w-full h-[70vh] max-h-[600px]">
                        <Image
                            src={imageUrl}
                            alt="Quảng cáo"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 800px"
                        />
                    </div>
                </a>
            ) : (
                <div className="relative w-full h-[70vh] max-h-[600px]">
                    <Image
                        src={imageUrl}
                        alt="Quảng cáo"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 800px"
                    />
                </div>
            )}
        </div>
    );

    return (
        <div
            className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
                isClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={handleClose}
        >
            <div
                className={`transition-transform duration-200 ${
                    isClosing ? 'scale-95' : 'scale-100'
                }`}
            >
                {content}
            </div>
        </div>
    );
}

