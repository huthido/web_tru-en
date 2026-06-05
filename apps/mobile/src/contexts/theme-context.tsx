import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { darkColors, lightColors, type ThemeColors } from '@/theme';

type Preference = 'light' | 'dark' | 'system';
type Scheme = 'light' | 'dark';

const STORE_KEY = 'app_theme_preference';

interface ThemeCtx {
    preference: Preference;
    scheme: Scheme;
    isDark: boolean;
    colors: ThemeColors;
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
        // light → dark → system → light. Dùng functional update để đọc giá trị
        // mới nhất, đồng thời tự persist (setPreference chỉ nhận Preference, không
        // nhận updater nên không gọi nó với function ở đây).
        setPreferenceState((prev) => {
            const next: Preference =
                prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
            SecureStore.setItemAsync(STORE_KEY, next).catch(() => {});
            return next;
        });
    }, []);

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
