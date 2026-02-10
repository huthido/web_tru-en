import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts';

export default function LoginScreen() {
    const { login } = useAuth();
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!emailOrUsername.trim() || !password.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập email/username và mật khẩu');
            return;
        }

        setIsLoading(true);
        try {
            await login({ emailOrUsername, password, rememberMe });
            router.replace('/(tabs)');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Đăng nhập thất bại';
            Alert.alert('Lỗi', message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.logo}>📚</Text>
                    <Text style={styles.title}>Web Truyện</Text>
                    <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email hoặc Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập email hoặc username"
                            placeholderTextColor="#94a3b8"
                            value={emailOrUsername}
                            onChangeText={setEmailOrUsername}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập mật khẩu"
                            placeholderTextColor="#94a3b8"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.rememberContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                    >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Đăng nhập</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Đăng ký ngay</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e2e8f0',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#f8fafc',
        borderWidth: 1,
        borderColor: '#334155',
    },
    rememberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#334155',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    checkmark: {
        color: '#fff',
        fontWeight: 'bold',
    },
    rememberText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    linkText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
});
