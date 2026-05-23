import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { ChaptersApi } from '@/lib/api/chapters.service';
import type { RootNavigation, RootStackParamList } from '@/navigation/types';
import { ChapterForm } from './ChapterForm';

type R = RouteProp<RootStackParamList, 'CreateChapter'>;

export const CreateChapterScreen: React.FC = () => {
    const route = useRoute<R>();
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();
    const { storySlug } = route.params;

    return (
        <ChapterForm
            submitLabel="Tạo chương"
            onSubmit={async (data, { publishImmediately }) => {
                const created = await ChaptersApi.create(storySlug, data);
                if (publishImmediately) {
                    try {
                        await ChaptersApi.publish(storySlug, created.id);
                    } catch {
                        // Truyện chưa được duyệt → backend reject; vẫn ok, chương ở draft.
                    }
                }
                qc.invalidateQueries({ queryKey: ['author', 'chapters', storySlug] });
                nav.goBack();
            }}
        />
    );
};
