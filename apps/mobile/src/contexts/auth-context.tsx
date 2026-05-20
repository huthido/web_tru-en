import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi, AuthUser } from '@/lib/api/auth.service';
import { registerAuthFailureHandler, tokenStorage } from '@/lib/api/client';

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isBooting: boolean;
    login: (emailOrUsername: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isBooting, setIsBooting] = useState(true);

    // On forced logout from the API client (refresh failed), clear state.
    useEffect(() => {
        registerAuthFailureHandler(() => setUser(null));
    }, []);

    // Boot: if a token exists, try `/auth/me`. Cheap if it succeeds; clears
    // the token pair if not.
    useEffect(() => {
        let mounted = true;
        (async () => {
            const token = await tokenStorage.getAccess();
            if (!token) {
                if (mounted) setIsBooting(false);
                return;
            }
            const me = await AuthApi.me();
            if (mounted) {
                setUser(me);
                setIsBooting(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const login = useCallback(async (emailOrUsername: string, password: string) => {
        const u = await AuthApi.login({ emailOrUsername, password });
        setUser(u);
    }, []);

    const logout = useCallback(async () => {
        await AuthApi.logout();
        setUser(null);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ user, isAuthenticated: !!user, isBooting, login, logout }),
        [user, isBooting, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
