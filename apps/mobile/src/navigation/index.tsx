import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useAuth } from '@/contexts/auth-context';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import { LoginScreen } from '@/screens/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { StoryDetailScreen } from '@/screens/StoryDetailScreen';
import { ReaderScreen } from '@/screens/ReaderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<keyof MainTabsParamList, { on: IoniconName; off: IoniconName }> = {
    Home: { on: 'home', off: 'home-outline' },
    Search: { on: 'search', off: 'search-outline' },
    Library: { on: 'library', off: 'library-outline' },
    Profile: { on: 'person', off: 'person-outline' },
};

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: colors.white,
                headerTitleStyle: { fontWeight: '700' },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarIcon: ({ color, size, focused }) => {
                    const icon = TAB_ICONS[route.name];
                    return (
                        <Ionicons
                            name={focused ? icon.on : icon.off}
                            size={size}
                            color={color}
                        />
                    );
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Khám phá' }} />
            <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
            <Tab.Screen
                name="Library"
                component={LibraryScreen}
                options={{ title: 'Thư viện' }}
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
                    headerStyle: { backgroundColor: colors.primary },
                    headerTintColor: colors.white,
                    headerTitleStyle: { fontWeight: '700' },
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
        backgroundColor: colors.bg,
    },
};
