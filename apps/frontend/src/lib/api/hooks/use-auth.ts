import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService, LoginRequest, RegisterRequest, ChangePasswordRequest } from '../auth.service';

export const useAuth = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Get current user
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const response = await authService.getMe();
        return response.data?.user;
      } catch (err: any) {
        // If 401 or 404, user is not authenticated - return null silently
        if (err?.response?.status === 401 || err?.response?.status === 404) {
          return null;
        }
        // For other errors, throw to be handled by React Query
        throw err;
      }
    },
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: async () => {
      // Refetch user data and wait for it to complete before redirecting
      await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
      // Use replace instead of push to avoid adding to history
      router.replace('/');
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: async () => {
      // Refetch user data and wait for it to complete before redirecting
      await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
      // Use replace instead of push to avoid adding to history
      router.replace('/');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      router.push('/login');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
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
  };
};

