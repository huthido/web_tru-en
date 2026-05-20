import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';

export const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <Text style={styles.greeting}>Chào, {user?.displayName || user?.username || 'bạn'} 👋</Text>
                <Text style={styles.role}>{user?.role}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Đọc truyện</Text>
                <Text style={styles.placeholder}>Danh sách truyện sẽ xuất hiện ở đây (Phase 2).</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Ví xu</Text>
                <Text style={styles.placeholder}>
                    Số dư + lịch sử + nút Apple IAP / Google Play sẽ thêm sau khi Phase 3 (compliance + IAP) hoàn tất.
                </Text>
            </View>

            <TouchableOpacity style={styles.logout} onPress={logout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: '#FFF2F8', flexGrow: 1 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
    greeting: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
    role: { fontSize: 12, color: '#888', marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
    placeholder: { fontSize: 14, color: '#666', lineHeight: 20 },
    logout: { alignSelf: 'center', marginTop: 24, paddingHorizontal: 24, paddingVertical: 10 },
    logoutText: { color: '#e91e63', fontWeight: '600' },
});
