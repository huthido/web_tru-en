'use client';

import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '@/lib/api/hooks/use-auth';

interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    displayName?: string;
  }) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isLoading,
    isAuthenticated,
    loginAsync: loginFn,
    logoutAsync: logoutFn,
    registerAsync: registerFn,
    updateEmail: updateEmailFn,
    isLoggingIn,
    isRegistering,
    isLoggingOut,
  } = useAuthHook();

  const login = async (emailOrUsername: string, password: string, rememberMe?: boolean) => {
    await loginFn({ emailOrUsername, password, rememberMe });
  };

  const logout = async () => {
    await logoutFn();
  };

  const register = async (data: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    displayName?: string;
  }) => {
    await registerFn(data);
  };

  const updateEmail = async (email: string) => {
    await updateEmailFn(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user as User | null,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        updateEmail,
        isLoggingIn,
        isRegistering,
        isLoggingOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

