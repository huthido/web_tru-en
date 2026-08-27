import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, User, AdminUpdateUserRequest, UsersQuery, UserStats, PublicProfile } from '../users.service';

/**
 * Get all users (admin only)
 */
export const useUsers = (query?: UsersQuery) => {
  return useQuery({
    queryKey: ['users', 'all', query],
    queryFn: () => usersService.getAll(query),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Update user mutation (admin only)
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminUpdateUserRequest }) =>
      usersService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/**
 * Get full user detail (admin only) — hồ sơ + ví + thống kê.
 */
export const useAdminUserDetail = (id: string | null) => {
  return useQuery({
    queryKey: ['users', 'admin-detail', id],
    queryFn: () => usersService.getAdminDetail(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

/**
 * Get user stats (current user)
 */
export const useUserStats = () => {
  return useQuery({
    queryKey: ['users', 'me', 'stats'],
    queryFn: () => usersService.getStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get public profile
 */
export const usePublicProfile = (userId: string) => {
  return useQuery({
    queryKey: ['users', 'public', userId],
    queryFn: () => usersService.getPublicProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

