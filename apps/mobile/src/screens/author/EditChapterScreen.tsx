import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loading, ErrorView, EmptyView } from '@/components/ui';
import { ChaptersApi } from '@/lib/api/chapters.service';
import type { RootNavigation, RootStackParamList } from '@/navigation/types';
import { describeError } from '@/lib/error';
import { ChapterForm, type ChapterFormValues } from './ChapterForm';

type R = RouteProp<RootStackParamList, 'EditChapter'>;

export const EditChapterScreen: React.FC = () => {
    const route = useRoute<R>();
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const { storyId, storySlug, chapterId } = route.params;

    const q = useQuery({
        queryKey: ['author', 'chapter', chapterId],
        queryFn: () => ChaptersApi.getById(storySlug, chapterId),
    });

    if (q.isLoading) return <Loading />;
    if (q.isError) return <ErrorView message={describeError(q.error)} onRetry={() => q.refetch()} />;
    if (!q.data) return <EmptyView message="Không tìm thấy chương." />;

    const initial: Partial<ChapterFormValues> = {
        title: q.data.title,
        content: q.data.content,
        price: String(q.data.price ?? 0),
    };

    return (
        <ChapterForm
            initialValues={initial}
            submitLabel="Lưu thay đổi"
            hidePublishToggle
            onSubmit={async (data) => {
                await ChaptersApi.update(storySlug, chapterId, data);
                qc.invalidateQueries({ queryKey: ['author', 'chapters', storySlug] });
                qc.invalidateQueries({ queryKey: ['author', 'chapter', chapterId] });
                nav.goBack();
            }}
        />
    );
};
