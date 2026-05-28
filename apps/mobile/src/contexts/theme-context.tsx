import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { darkColors, lightColors } from '@/theme';

type Preference = 'light' | 'dark' | 'system';
type Scheme = 'light' | 'dark';

const STORE_KEY = 'app_theme_preference';

interface ThemeCtx {
    preference: Preference;
    scheme: Scheme;
    isDark: boolean;
    colors: typeof lightColors;
    setPreference: (p: Preference) => void;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
    preference: 'system',
    scheme: 'light',
    isDark: false,
    colors: lightColors,
    setPreference: () => {},
    toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme() ?? 'light';
    const [preference, setPreferenceState] = useState<Preference>('system');

    useEffect(() => {
        SecureStore.getItemAsync(STORE_KEY).then((v) => {
            if (v === 'light' || v === 'dark' || v === 'system') {
                setPreferenceState(v);
            }
        });
    }, []);

    const setPreference = useCallback((p: Preference) => {
        setPreferenceState(p);
        SecureStore.setItemAsync(STORE_KEY, p).catch(() => {});
    }, []);

    const toggle = useCallback(() => {
        setPreference((prev: Preference) => {
            // light → dark → system → light
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'system';
            return 'light';
        });
    }, [setPreference]);

    const scheme: Scheme = preference === 'system' ? systemScheme : preference;
    const themeColors = scheme === 'dark' ? darkColors : lightColors;

    const value = useMemo<ThemeCtx>(
        () => ({ preference, scheme, isDark: scheme === 'dark', colors: themeColors, setPreference, toggle }),
        [preference, scheme, themeColors, setPreference, toggle],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
    return useContext(ThemeContext);
}
