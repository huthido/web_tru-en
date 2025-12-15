import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, User, AdminUpdateUserRequest, UsersQuery } from '../users.service';

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

