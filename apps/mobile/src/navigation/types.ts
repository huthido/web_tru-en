import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
    Login: undefined;
    ForgotPassword: undefined;
    MainTabs: undefined;
    StoryDetail: { slug: string };
    Reader: { storySlug: string; chapterSlug: string };
    // Author flows
    MyStories: undefined;
    CreateStory: undefined;
    EditStory: { storyId: string };
    ChapterList: { storyId: string; storySlug: string; storyTitle?: string };
    CreateChapter: { storyId: string; storySlug: string };
    EditChapter: { storyId: string; storySlug: string; chapterId: string };
    StoryAnalytics: { storyId: string; storyTitle?: string };
    Earnings: undefined;
    Eligibility: undefined;
    Withdrawals: undefined;
    Wallet: undefined;
    Transactions: undefined;
    Notifications: undefined;
    Settings: undefined;
    UserProfile: { username: string };
    // Thư viện rời tab bar (PDF fix nav) — truy cập từ Tài khoản.
    Library: undefined;
};

// Thứ tự tab theo docs/Fix vài điểm trên app web.pdf:
// Trang chủ · Khám phá · [FAB Đăng truyện] · Kiếm tiền · Cửa hàng · Tài khoản.
export type MainTabsParamList = {
    Home: undefined;
    Search: undefined;
    // Upload là route trung tâm FAB — bấm sẽ navigate sang CreateStoryScreen stack.
    // Render screen `UploadStub` để có route entry; tabBar tự handle FAB click.
    Upload: undefined;
    Earn: undefined;
    Shop: undefined;
    Profile: undefined;
};

/** Navigation prop for pushing root-stack screens (StoryDetail / Reader). */
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Navigation prop for jumping between bottom tabs from a tab screen. */
export type TabNavigation = BottomTabNavigationProp<MainTabsParamList>;
