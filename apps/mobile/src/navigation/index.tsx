import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '@/theme';
import { useAuth } from '@/contexts/auth-context';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import { LoginScreen } from '@/screens/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { StoryDetailScreen } from '@/screens/StoryDetailScreen';
import { ReaderScreen } from '@/screens/ReaderScreen';
import { MyStoriesScreen } from '@/screens/author/MyStoriesScreen';
import { CreateStoryScreen } from '@/screens/author/CreateStoryScreen';
import { EditStoryScreen } from '@/screens/author/EditStoryScreen';
import { ChapterListScreen } from '@/screens/author/ChapterListScreen';
import { CreateChapterScreen } from '@/screens/author/CreateChapterScreen';
import { EditChapterScreen } from '@/screens/author/EditChapterScreen';
import { StoryAnalyticsScreen } from '@/screens/author/StoryAnalyticsScreen';
import { EarningsScreen } from '@/screens/author/EarningsScreen';
import { WithdrawalsScreen } from '@/screens/author/WithdrawalsScreen';
import { TransactionsScreen } from '@/screens/TransactionsScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { MainTabBar } from '@/components/MainTabBar';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

/** Logo + wordmark "Yêu" hiển thị ở giữa header tab. */
function BrandHeader() {
    return (
        <View style={styles.brandRow}>
            <Image
                source={require('../../assets/icon.png')}
                style={styles.brandLogo}
                resizeMode="contain"
            />
            <Text style={styles.brandText}>Yêu</Text>
        </View>
    );
}

/**
 * Upload là route placeholder — MainTabBar handle bấm FAB bằng cách navigate
 * sang `CreateStory` stack thay vì hiển thị màn này. Component render null là
 * fallback an toàn nếu user navigate trực tiếp.
 */
function UploadStub() {
    return null;
}

function MainTabs() {
    return (
        <Tab.Navigator
            tabBar={(props) => <MainTabBar {...props} />}
            screenOptions={{
                headerStyle: { backgroundColor: colors.primaryContainer },
                headerTintColor: colors.onSurface,
                headerTitleStyle: {
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: 18,
                },
                headerTitleAlign: 'center',
                headerTitle: () => <BrandHeader />,
                headerShadowVisible: false,
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Khám phá' }} />
            <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
            <Tab.Screen
                name="Upload"
                component={UploadStub}
                options={{ title: 'Đăng truyện' }}
            />
            <Tab.Screen
                name="Library"
                component={LibraryScreen}
                options={{ title: 'Thư viện' }}
            />
            <Tab.Screen
                name="Wallet"
                component={WalletScreen}
                options={{ title: 'Ví xu' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Cá nhân' }}
            />
        </Tab.Navigator>
    );
}

export const RootNavigator: React.FC = () => {
    const { isAuthenticated, isBooting } = useAuth();

    if (isBooting) {
        return (
            <View style={styles.booting}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    // Header Luminous Petal: soft pink background + dark text +
                    // hairline border (no heavy shadow elevation).
                    headerStyle: { backgroundColor: colors.primaryContainer },
                    headerTintColor: colors.onSurface,
                    headerTitleStyle: {
                        fontFamily: 'PlusJakartaSans_700Bold',
                        fontSize: 18,
                    },
                    headerShadowVisible: false,
                }}
            >
                {isAuthenticated ? (
                    <>
                        <Stack.Screen
                            name="MainTabs"
                            component={MainTabs}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="StoryDetail"
                            component={StoryDetailScreen}
                            options={{ title: 'Chi tiết truyện' }}
                        />
                        <Stack.Screen
                            name="Reader"
                            component={ReaderScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="MyStories"
                            component={MyStoriesScreen}
                            options={{ title: 'Truyện của tôi' }}
                        />
                        <Stack.Screen
                            name="CreateStory"
                            component={CreateStoryScreen}
                            options={{ title: 'Đăng truyện' }}
                        />
                        <Stack.Screen
                            name="EditStory"
                            component={EditStoryScreen}
                            options={{ title: 'Chỉnh sửa truyện' }}
                        />
                        <Stack.Screen
                            name="ChapterList"
                            component={ChapterListScreen}
                            options={{ title: 'Quản lý chương' }}
                        />
                        <Stack.Screen
                            name="CreateChapter"
                            component={CreateChapterScreen}
                            options={{ title: 'Thêm chương' }}
                        />
                        <Stack.Screen
                            name="EditChapter"
                            component={EditChapterScreen}
                            options={{ title: 'Sửa chương' }}
                        />
                        <Stack.Screen
                            name="StoryAnalytics"
                            component={StoryAnalyticsScreen}
                            options={{ title: 'Thống kê truyện' }}
                        />
                        <Stack.Screen
                            name="Earnings"
                            component={EarningsScreen}
                            options={{ title: 'Doanh thu' }}
                        />
                        <Stack.Screen
                            name="Withdrawals"
                            component={WithdrawalsScreen}
                            options={{ title: 'Rút xu' }}
                        />
                        <Stack.Screen
                            name="Transactions"
                            component={TransactionsScreen}
                            options={{ title: 'Lịch sử giao dịch' }}
                        />
                        <Stack.Screen
                            name="Notifications"
                            component={NotificationsScreen}
                            options={{ title: 'Thông báo' }}
                        />
                        <Stack.Screen
                            name="Settings"
                            component={SettingsScreen}
                            options={{ title: 'Cài đặt' }}
                        />
                    </>
                ) : (
                    <>
                        <Stack.Screen
                            name="Login"
                            component={LoginScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="ForgotPassword"
                            component={ForgotPasswordScreen}
                            options={{ title: 'Quên mật khẩu' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = {
    booting: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.background,
    },
    brandRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    brandLogo: {
        width: 28,
        height: 28,
        borderRadius: 6,
    },
    brandText: {
        // Header brand "Yêu" — Plus Jakarta editorial trên primary-container
        // (soft pink) cho cảm giác premium. Đặt color onSurface vì background
        // sáng nay (#fcf2f6).
        color: colors.onSurface,
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.3,
    },
};
