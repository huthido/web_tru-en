import * as SecureStore from 'expo-secure-store';

/**
 * Child-safety state — Google Play Families Policy.
 *
 * Two mechanisms, both persisted locally (encrypted, expo-secure-store):
 *
 * 1. Age / safety gate: on first launch the user must confirm they are 18+
 *    (or a responsible parent/guardian of a child using the app) and must
 *    acknowledge the in-app online-safety reminder. Until confirmed, the app
 *    shows the blocking AgeGateModal instead of the navigator.
 *
 * 2. Adult-controlled social features: a parent/guardian can enable/disable
 *    social capabilities (comments, art upload, follow). These flags gate the
 *    corresponding screens/actions on the client.
 *
 * NOTE: this is the client-side enforcement. For full Families compliance the
 * same flags should also live on the user record server-side so they survive
 * reinstall and are enforced by the API — see plan in docs.
 */

const AGE_GATE_KEY = 'webtruyen.ageGateAcknowledged';
const SOCIAL_KEY = 'webtruyen.socialControls';
const ADULT_KEY = 'webtruyen.allowAdultContent';

export interface SocialControls {
    /** Allow posting/viewing bình luận */
    comments: boolean;
    /** Allow đăng ảnh nghệ thuật (UGC art feed) */
    artUpload: boolean;
    /** Allow theo dõi tác giả / người khác */
    follow: boolean;
}

export const DEFAULT_SOCIAL_CONTROLS: SocialControls = {
    comments: true,
    artUpload: true,
    follow: true,
};

export interface SafetyState {
    acknowledged: boolean;
    controls: SocialControls;
    /** Cho phép xem nội dung người lớn (MATURE) — quyền do phụ huynh/người giám hộ cấp, hoặc tự xác nhận 18+. */
    allowAdultContent: boolean;
}

const mergeControls = (raw: string | null): SocialControls => {
    try {
        const parsed = JSON.parse(raw ?? '{}') as Partial<SocialControls>;
        return {
            comments: parsed.comments ?? DEFAULT_SOCIAL_CONTROLS.comments,
            artUpload: parsed.artUpload ?? DEFAULT_SOCIAL_CONTROLS.artUpload,
            follow: parsed.follow ?? DEFAULT_SOCIAL_CONTROLS.follow,
        };
    } catch {
        return { ...DEFAULT_SOCIAL_CONTROLS };
    }
};

export const safetyStorage = {
    async load(): Promise<SafetyState> {
        let acknowledged = false;
        let controls = { ...DEFAULT_SOCIAL_CONTROLS };
        let allowAdultContent = false;
        try {
            acknowledged = (await SecureStore.getItemAsync(AGE_GATE_KEY)) === '1';
        } catch {
            /* ignore */
        }
        try {
            controls = mergeControls(await SecureStore.getItemAsync(SOCIAL_KEY));
        } catch {
            /* ignore */
        }
        try {
            allowAdultContent = (await SecureStore.getItemAsync(ADULT_KEY)) === '1';
        } catch {
            /* ignore */
        }
        return { acknowledged, controls, allowAdultContent };
    },

    async setAcknowledged(acknowledged: boolean): Promise<void> {
        try {
            await SecureStore.setItemAsync(AGE_GATE_KEY, acknowledged ? '1' : '0');
        } catch {
            /* ignore */
        }
    },

    async saveControls(controls: SocialControls): Promise<void> {
        try {
            await SecureStore.setItemAsync(SOCIAL_KEY, JSON.stringify(controls));
        } catch {
            /* ignore */
        }
    },

    async saveAllowAdultContent(allow: boolean): Promise<void> {
        try {
            await SecureStore.setItemAsync(ADULT_KEY, allow ? '1' : '0');
        } catch {
            /* ignore */
        }
    },

    /** Đọc cờ cho phép xem nội dung người lớn — dùng khi build request query. */
    async isAllowAdultContent(): Promise<boolean> {
        try {
            return (await SecureStore.getItemAsync(ADULT_KEY)) === '1';
        } catch {
            return false;
        }
    },
};
