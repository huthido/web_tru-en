import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paintingsService } from '../paintings.service';

export const paintingKeys = {
  list: (params?: object) => ['paintings', 'list', params] as const,
  detail: (id: string) => ['paintings', 'detail', id] as const,
};

export function usePaintings(params?: { status?: string; authorId?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: paintingKeys.list(params),
    queryFn: ({ pageParam = 1 }) =>
      paintingsService.getList({ page: pageParam as number, limit: params?.limit ?? 20, ...params }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function usePainting(id: string) {
  return useQuery({
    queryKey: paintingKeys.detail(id),
    queryFn: () => paintingsService.getOne(id),
    enabled: !!id,
  });
}

export function useCreatePainting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paintingsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paintings'] }),
  });
}

export function useDeletePainting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paintingsService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paintings'] }),
  });
}

export function useMarkPaintingSold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paintingsService.markSold,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paintings'] }),
  });
}

export function useUploadPaintingImage() {
  return useMutation({ mutationFn: paintingsService.uploadImage });
}
