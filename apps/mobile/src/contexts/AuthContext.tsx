import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, LoginDto, RegisterDto } from '../services';
import { getAccessToken, clearTokens } from '../services/api';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginDto) => Promise<void>;
    register: (data: RegisterDto) => Promise<{ requiresVerification: boolean; email?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const token = await getAccessToken();
                if (token) {
                    const userData = await authService.getMe();
                    setUser(userData);
                }
            } catch (error) {
                await clearTokens();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuthStatus();
    }, []);

    const login = async (data: LoginDto) => {
        const response = await authService.login(data);
        setUser(response.user);
    };

    const register = async (data: RegisterDto) => {
        const response = await authService.register(data);
        if (response.user) {
            setUser(response.user);
        }
        return {
            requiresVerification: response.requiresVerification || false,
            email: response.email,
        };
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const userData = await authService.getMe();
            setUser(userData);
        } catch {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;

