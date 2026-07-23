import { apiClient, unwrap } from './client';
import type { AuthUser } from './auth.service';
import type { RNFileLike } from './stories.service';

/**
 * Cập nhật hồ sơ người dùng hiện tại. Backend: PATCH /users/me (displayName,
 * bio, avatar) và POST /users/me/avatar/upload (multipart) — dùng chung với web.
 */
export const UsersApi = {
    async updateProfile(data: {
        displayName?: string;
        bio?: string;
        avatar?: string;
    }): Promise<AuthUser> {
        const res = await apiClient.patch('/users/me', data);
        return unwrap<AuthUser>(res);
    },

    /** Upload ảnh đại diện từ expo-image-picker ({ uri, type, name }). */
    async uploadAvatar(file: RNFileLike): Promise<{ avatar: string }> {
        const formData = new FormData();
        // RN's FormData chấp nhận object {uri,type,name} — TS tưởng chỉ nhận File.
        formData.append('file', {
            uri: file.uri,
            type: file.type ?? 'image/jpeg',
            name: file.name ?? 'avatar.jpg',
        } as any);
        const res = await apiClient.post('/users/me/avatar/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap<{ avatar: string }>(res);
    },
};
