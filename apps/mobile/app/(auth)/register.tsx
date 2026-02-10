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

export default function RegisterScreen() {
    const { register } = useAuth();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        if (!email.trim() || !username.trim() || !password.trim()) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setIsLoading(true);
        try {
            const result = await register({
                email,
                username,
                password,
                confirmPassword,
                displayName: displayName || username,
            });

            if (result.requiresVerification) {
                Alert.alert(
                    'Xác thực email',
                    `Vui lòng kiểm tra email ${result.email} để xác thực tài khoản`,
                    [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
                );
            } else {
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Đăng ký thất bại';
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
                    <Text style={styles.title}>Tạo tài khoản</Text>
                    <Text style={styles.subtitle}>Tham gia Web Truyện</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="email@example.com"
                            placeholderTextColor="#94a3b8"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="username"
                            placeholderTextColor="#94a3b8"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Tên hiển thị (tùy chọn)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tên của bạn"
                            placeholderTextColor="#94a3b8"
                            value={displayName}
                            onChangeText={setDisplayName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tối thiểu 6 ký tự"
                            placeholderTextColor="#94a3b8"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Xác nhận mật khẩu</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập lại mật khẩu"
                            placeholderTextColor="#94a3b8"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Đăng ký</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Đã có tài khoản? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Đăng nhập</Text>
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
        marginBottom: 32,
    },
    logo: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 28,
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
        marginBottom: 16,
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
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
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
