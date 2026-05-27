import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loading, ErrorView } from '@/components/ui';
import { StoriesApi } from '@/lib/api/stories.service';
import type { RootNavigation, RootStackParamList } from '@/navigation/types';
import type { StoryAccessType } from '@/lib/api/types';
import { describeError } from '@/lib/error';
import { StoryForm, type StoryFormValues } from './StoryForm';

type R = RouteProp<RootStackParamList, 'EditStory'>;

export const EditStoryScreen: React.FC = () => {
    const route = useRoute<R>();
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const { storyId } = route.params;

    const q = useQuery({
        queryKey: ['author', 'story', storyId],
        queryFn: () => StoriesApi.getBySlug(storyId),
        enabled: !!storyId,
    });

    if (q.isLoading) return <Loading />;
    if (q.isError || !q.data)
        return <ErrorView message={describeError(q.error)} onRetry={() => q.refetch()} />;

    const initial: Partial<StoryFormValues> = {
        title: q.data.title,
        description: q.data.description ?? '',
        coverImage: q.data.coverImage ?? '',
        categoryIds: (q.data.storyCategories ?? []).map((sc) => sc.category.id),
        country: q.data.country ?? 'VN',
        accessType: q.data.accessType as StoryAccessType,
        price: String(q.data.price ?? ''),
    };

    return (
        <StoryForm
            initialValues={initial}
            submitLabel="Lưu thay đổi"
            storyId={q.data.id}
            initialAdRevenueEnabled={!!q.data.adRevenueEnabled}
            onSubmit={async (data) => {
                await StoriesApi.update(storyId, data);
                qc.invalidateQueries({ queryKey: ['author', 'my-stories'] });
                qc.invalidateQueries({ queryKey: ['author', 'story', storyId] });
                nav.goBack();
            }}
        />
    );
};
