import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const { user, isAuthenticated, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(tabs)');
                    },
                },
            ]
        );
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Tài khoản</Text>
                </View>

                <View style={styles.notLoggedIn}>
                    <Ionicons name="person-circle-outline" size={80} color="#334155" />
                    <Text style={styles.notLoggedInText}>
                        Đăng nhập để xem thông tin tài khoản
                    </Text>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => router.push('/(auth)/login')}
                    >
                        <Text style={styles.loginButtonText}>Đăng nhập</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={() => router.push('/(auth)/register')}
                    >
                        <Text style={styles.registerButtonText}>Tạo tài khoản</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tài khoản</Text>
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                <Image
                    source={{
                        uri: user?.avatar || 'https://ui-avatars.com/api/?name=User',
                    }}
                    style={styles.avatar}
                />
                <View style={styles.profileInfo}>
                    <Text style={styles.displayName}>{user?.displayName}</Text>
                    <Text style={styles.username}>@{user?.username}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                        <Ionicons name="bookmark-outline" size={24} color="#3b82f6" />
                        <Text style={styles.menuItemText}>Truyện đã lưu</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                        <Ionicons name="time-outline" size={24} color="#3b82f6" />
                        <Text style={styles.menuItemText}>Lịch sử đọc</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                        <Ionicons name="settings-outline" size={24} color="#3b82f6" />
                        <Text style={styles.menuItemText}>Cài đặt</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#f87171" />
                <Text style={styles.logoutButtonText}>Đăng xuất</Text>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    notLoggedIn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 100,
    },
    notLoggedInText: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    loginButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 48,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    registerButton: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 48,
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: '600',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#3b82f6',
    },
    profileInfo: {
        marginLeft: 16,
        flex: 1,
    },
    displayName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    username: {
        fontSize: 14,
        color: '#3b82f6',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#94a3b8',
    },
    menuSection: {
        marginHorizontal: 20,
        backgroundColor: '#1e293b',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    menuItemText: {
        fontSize: 16,
        color: '#e2e8f0',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        padding: 16,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        gap: 12,
    },
    logoutButtonText: {
        color: '#f87171',
        fontSize: 16,
        fontWeight: '600',
    },
    bottomPadding: {
        height: 100,
    },
});
