import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/auth-context';
import type { OAuthProvider } from '@/lib/api/oauth.service';
import type { RootNavigation } from '@/navigation/types';

export const LoginScreen: React.FC = () => {
    const { login, signInWith } = useAuth();
    const nav = useNavigation<RootNavigation>();
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!emailOrUsername.trim() || !password) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập email/username và mật khẩu.');
            return;
        }
        setBusy(true);
        try {
            await login(emailOrUsername.trim(), password);
        } catch (e: any) {
            Alert.alert('Đăng nhập thất bại', e?.response?.data?.message || e?.message || 'Lỗi không xác định');
        } finally {
            setBusy(false);
        }
    };

    const handleOAuth = async (provider: OAuthProvider) => {
        setBusy(true);
        try {
            await signInWith(provider);
        } catch (e: any) {
            const msg = e?.message || 'Lỗi không xác định';
            // User-initiated cancel — don't pop an alert for that.
            if (!/đã huỷ/i.test(msg)) {
                Alert.alert('Đăng nhập thất bại', msg);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>Web Truyện HungYeu</Text>
                <Text style={styles.subtitle}>Đăng nhập để đọc và ủng hộ tác giả</Text>

                <TextInput
                    placeholder="Email hoặc username"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={emailOrUsername}
                    onChangeText={setEmailOrUsername}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Mật khẩu"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                />

                <TouchableOpacity
                    style={styles.forgotLink}
                    onPress={() => nav.navigate('ForgotPassword')}
                    disabled={busy}
                >
                    <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>HOẶC</Text>
                    <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={() => handleOAuth('google')}
                    disabled={busy}
                >
                    <Ionicons name="logo-google" size={18} color="#444" />
                    <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.facebookButton}
                    onPress={() => handleOAuth('facebook')}
                    disabled={busy}
                >
                    <Ionicons name="logo-facebook" size={18} color="#fff" />
                    <Text style={styles.facebookButtonText}>Tiếp tục với Facebook</Text>
                </TouchableOpacity>

                <Text style={styles.note}>
                    Phiên bản di động — chỉ cho đọc & ủng hộ. Nạp xu vẫn dùng web cho tới khi tích hợp Apple IAP / Google Play.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF2F8' },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
    input: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0' },
    forgotLink: { alignSelf: 'flex-end', paddingVertical: 6, marginBottom: 4 },
    forgotText: { color: '#e91e63', fontSize: 13, fontWeight: '600' },
    button: { backgroundColor: '#e91e63', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
    dividerText: { color: '#888', fontSize: 12, fontWeight: '600' },
    googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 13, borderWidth: 1, borderColor: '#dadce0' },
    googleButtonText: { color: '#3c4043', fontWeight: '600', fontSize: 15 },
    facebookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1877F2', borderRadius: 10, paddingVertical: 13, marginTop: 10 },
    facebookButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    note: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
