import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyItemsService, UpsertStoryItem } from '../story-items.service';

export function useStoryItems(storyId: string, enabled = true) {
    return useQuery({
        queryKey: ['story-items', storyId],
        queryFn: () => storyItemsService.listForStory(storyId),
        enabled: !!storyId && enabled,
        staleTime: 60_000,
    });
}

export function useManageStoryItems(storyId: string) {
    return useQuery({
        queryKey: ['story-items', 'manage', storyId],
        queryFn: () => storyItemsService.manage(storyId),
        enabled: !!storyId,
        staleTime: 30_000,
    });
}

export function useMyStoryItems() {
    return useQuery({
        queryKey: ['story-items', 'me'],
        queryFn: () => storyItemsService.myItems(),
        staleTime: 30_000,
    });
}

export function useCreateStoryItem(storyId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: UpsertStoryItem) => storyItemsService.create(storyId, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['story-items', 'manage', storyId] });
            qc.invalidateQueries({ queryKey: ['story-items', storyId] });
        },
    });
}

export function useUpdateStoryItem(storyId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<UpsertStoryItem> }) => storyItemsService.update(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['story-items', 'manage', storyId] });
            qc.invalidateQueries({ queryKey: ['story-items', storyId] });
        },
    });
}

export function useRemoveStoryItem(storyId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => storyItemsService.remove(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['story-items', 'manage', storyId] });
            qc.invalidateQueries({ queryKey: ['story-items', storyId] });
        },
    });
}

export function useBuyStoryItem(storyId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, quantity }: { id: string; quantity: number }) => storyItemsService.buy(id, quantity),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['story-items', storyId] });
            qc.invalidateQueries({ queryKey: ['story-items', 'me'] });
            qc.invalidateQueries({ queryKey: ['wallet'] });
        },
    });
}
