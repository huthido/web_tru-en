'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'ads_consent';
type ConsentState = 'unknown' | 'accepted' | 'rejected';

interface ConsentContextValue {
    consent: ConsentState;
    /** True khi user đã đồng ý hiển thị ads cá nhân hoá (Google Ads / FAN). */
    consented: boolean;
    accept: () => void;
    reject: () => void;
    reset: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function AdsConsentProvider({ children }: { children: ReactNode }) {
    // SSR-safe: bắt đầu 'unknown', đọc localStorage trong useEffect.
    const [consent, setConsent] = useState<ConsentState>('unknown');

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored === 'accepted' || stored === 'rejected') {
                setConsent(stored);
            }
        } catch {
            // localStorage không khả dụng (vd iframe sandbox). Bỏ qua, để 'unknown'.
        }
    }, []);

    const persist = useCallback((value: ConsentState) => {
        try {
            if (value === 'unknown') {
                window.localStorage.removeItem(STORAGE_KEY);
            } else {
                window.localStorage.setItem(STORAGE_KEY, value);
            }
        } catch {
            // ignore
        }
        setConsent(value);
    }, []);

    const accept = useCallback(() => persist('accepted'), [persist]);
    const reject = useCallback(() => persist('rejected'), [persist]);
    const reset = useCallback(() => persist('unknown'), [persist]);

    return (
        <ConsentContext.Provider
            value={{
                consent,
                consented: consent === 'accepted',
                accept,
                reject,
                reset,
            }}
        >
            {children}
        </ConsentContext.Provider>
    );
}

export function useAdsConsent(): ConsentContextValue {
    const ctx = useContext(ConsentContext);
    if (!ctx) {
        // Fallback an toàn cho component render outside Provider (vd test) — coi như chưa consent.
        return {
            consent: 'unknown',
            consented: false,
            accept: () => undefined,
            reject: () => undefined,
            reset: () => undefined,
        };
    }
    return ctx;
}
