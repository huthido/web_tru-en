import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService, LoginRequest, RegisterRequest, ChangePasswordRequest } from '../auth.service';
import { hasSessionHint, setSessionHint } from '../session-hint';

export const useAuth = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 🔥 SIMPLIFIED: Listen for logout event from interceptor
  useEffect(() => {
    const handleLogout = () => {
      setSessionHint(false);
      queryClient.setQueryData(['auth', 'me'], null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', handleLogout);
      return () => window.removeEventListener('auth:logout', handleLogout);
    }
  }, [queryClient]);

  // 🔥 FIXED: Get current user - only fetch when needed
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    // Chỉ hỏi /auth/me khi trình duyệt này từng đăng nhập (có cờ phiên).
    // Khách vãng lai bỏ qua hẳn → console không còn dòng 401 đỏ.
    enabled: hasSessionHint(),
    queryFn: async () => {
      try {
        const response = await authService.getMe();
        return response.data?.user;
      } catch (error: any) {
        // 401 = cờ phiên cũ nhưng cookie đã hết hạn. Dọn cờ, coi như khách.
        if (error.response?.status === 401) {
          setSessionHint(false);
          console.info('ℹ️ Phiên đăng nhập đã kết thúc — bạn đang xem với tư cách khách.');
          return null;
        }
        throw error;
      }
    },
    retry: false, // Don't retry on error
    retryOnMount: false,
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: (previousData) => previousData,
    throwOnError: false,
  });

  // 🔥 Register mutation - handle both verification and auto-login cases
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: async (response) => {
      // If email verification is required, redirect to success page
      if (response.data?.requiresVerification) {
        router.replace(`/auth/registration-success?email=${encodeURIComponent(response.data.email || '')}`);
      } else if (response.data?.accessToken && response.data?.user) {
        // If no verification required, user is auto-logged in
        setSessionHint(true);
        // Wait for cookies to be set by the interceptor
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Invalidate all queries to force fresh fetch with new auth
        await queryClient.invalidateQueries();
        
        // Wait a bit more to ensure queries start fetching
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Redirect to home
        router.replace('/');
      } else {
        // Fallback: redirect to home
        await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
        router.replace('/');
      }
    },
  });

  // 🔥 FIXED: Login mutation - wait for cookies then invalidate all queries
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: async () => {
      setSessionHint(true);
      // Wait for cookies to be set by the interceptor
      await new Promise(resolve => setTimeout(resolve, 800));

      // Invalidate all queries to force fresh fetch with new auth
      await queryClient.invalidateQueries();

      // Wait a bit more to ensure queries start fetching
      await new Promise(resolve => setTimeout(resolve, 200));

      // Redirect to home
      router.replace('/');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      setSessionHint(false);
      queryClient.setQueryData(['auth', 'me'], null);
      router.push('/login');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
  });

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: (email: string) => authService.updateEmail(email),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
    },
  });

  return {
    user: userData,
    isLoading,
    error,
    isAuthenticated: !!userData,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    changePassword: changePasswordMutation.mutate,
    changePasswordAsync: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    updateEmail: updateEmailMutation.mutateAsync,
    isUpdatingEmail: updateEmailMutation.isPending,
  };
};