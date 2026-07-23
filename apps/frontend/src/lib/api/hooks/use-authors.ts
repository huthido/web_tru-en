import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthorsService } from '../authors.service';

export function useAuthorProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['author', 'profile', username],
    queryFn: () => AuthorsService.getProfileByUsername(username!),
    enabled: !!username,
    staleTime: 60 * 1000,
  });
}

export function useAuthorStories(
  userId: string | undefined,
  page = 1,
  limit = 12,
) {
  return useQuery({
    queryKey: ['author', 'stories', userId, page, limit],
    queryFn: () => AuthorsService.listStories(userId!, page, limit),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useToggleAuthorFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (authorId: string) => AuthorsService.followToggle(authorId),
    onSuccess: (_data, authorId) => {
      qc.invalidateQueries({ queryKey: ['author', 'profile'] });
      qc.invalidateQueries({ queryKey: ['author', 'follower-count', authorId] });
      qc.invalidateQueries({ queryKey: ['author', 'is-following', authorId] });
    },
  });
}

/** Trạng thái caller có đang follow tác giả không. */
export function useIsFollowingAuthor(authorId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['author', 'is-following', authorId],
    queryFn: () => AuthorsService.isFollowing(authorId!),
    enabled: !!authorId && enabled,
    staleTime: 60 * 1000,
  });
}

/** Danh sách người theo dõi của tác giả (chỉ chính chủ). */
export function useAuthorFollowers(
  authorId: string | undefined,
  page = 1,
  limit = 20,
  enabled = true,
) {
  return useQuery({
    queryKey: ['author', 'followers', authorId, page, limit],
    queryFn: () => AuthorsService.listFollowers(authorId!, page, limit),
    enabled: !!authorId && enabled,
    staleTime: 30 * 1000,
  });
}
