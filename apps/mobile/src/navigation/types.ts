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
    Withdrawals: undefined;
    Transactions: undefined;
};

export type MainTabsParamList = {
    Home: undefined;
    Search: undefined;
    Library: undefined;
    Wallet: undefined;
    Profile: undefined;
};

/** Navigation prop for pushing root-stack screens (StoryDetail / Reader). */
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Navigation prop for jumping between bottom tabs from a tab screen. */
export type TabNavigation = BottomTabNavigationProp<MainTabsParamList>;
