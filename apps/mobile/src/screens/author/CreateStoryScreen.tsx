import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { RootNavigation } from '@/navigation/types';
import { StoriesApi } from '@/lib/api/stories.service';
import { StoryForm } from './StoryForm';

export const CreateStoryScreen: React.FC = () => {
    const nav = useNavigation<RootNavigation>();
    const qc = useQueryClient();

    return (
        <StoryForm
            submitLabel="Tạo truyện"
            onSubmit={async (data) => {
                const created = await StoriesApi.create(data);
                qc.invalidateQueries({ queryKey: ['author', 'my-stories'] });
                // Sau khi tạo → vào màn quản lý chương để thêm chương đầu tiên.
                nav.replace('ChapterList', {
                    storyId: created.id,
                    storySlug: created.slug,
                    storyTitle: created.title,
                });
            }}
        />
    );
};
