import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { safetyStorage, type SocialControls } from '@/lib/safety';

interface SafetyContextValue {
    /** Has the user acknowledged the age gate / safety reminder on this device? */
    acknowledged: boolean;
    /** Is the gate still loading (reading from SecureStore)? */
    loading: boolean;
    /** Adult-controlled allow-flags for social features. */
    controls: SocialControls;
    /** Adult (or app) can switch a social feature on/off. */
    setControl: (key: keyof SocialControls, value: boolean) => void;
    /** Người lớn đã bật xem nội dung người lớn (MATURE) chưa? */
    allowAdultContent: boolean;
    /** Bật / tắt quyền xem nội dung người lớn (persist local). */
    setAllowAdultContent: (value: boolean) => void;
    /** Called when the user confirms the age/safety gate. */
    acknowledge: () => Promise<void>;
    /** Called when the user declines the age/safety gate. */
    decline: () => void;
}

const SafetyContext = createContext<SafetyContextValue | null>(null);

export const useSafety = () => {
    const ctx = useContext(SafetyContext);
    if (!ctx) throw new Error('useSafety must be used within <SafetyProvider>');
    return ctx;
};

export const SafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [acknowledged, setAcknowledged] = useState(false);
    const [controls, setControls] = useState<SocialControls>({
        comments: true,
        artUpload: true,
        follow: true,
    });
    const [allowAdultContent, setAllowAdultContentState] = useState(false);

    useEffect(() => {
        (async () => {
            const state = await safetyStorage.load();
            setAcknowledged(state.acknowledged);
            setControls(state.controls);
            setAllowAdultContentState(state.allowAdultContent);
            setLoading(false);
        })();
    }, []);

    const persistControls = useCallback((next: SocialControls) => {
        setControls(next);
        safetyStorage.saveControls(next);
    }, []);

    const setControl = useCallback(
        (key: keyof SocialControls, value: boolean) => {
            persistControls({ ...controls, [key]: value });
        },
        [controls, persistControls],
    );

    const setAllowAdultContent = useCallback((value: boolean) => {
        setAllowAdultContentState(value);
        safetyStorage.saveAllowAdultContent(value);
    }, []);

    const acknowledge = useCallback(async () => {
        await safetyStorage.setAcknowledged(true);
        setAcknowledged(true);
    }, []);

    const decline = useCallback(() => {
        // Decline keeps the gate up (blocks the app) — nothing to persist.
    }, []);

    const value = useMemo<SafetyContextValue>(
        () => ({
            acknowledged,
            loading,
            controls,
            setControl,
            allowAdultContent,
            setAllowAdultContent,
            acknowledge,
            decline,
        }),
        [
            acknowledged,
            loading,
            controls,
            setControl,
            allowAdultContent,
            setAllowAdultContent,
            acknowledge,
            decline,
        ],
    );

    return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
};
