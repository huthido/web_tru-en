import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/contexts/auth-context';
import type { OAuthProvider } from '@/lib/api/oauth.service';
import type { RootNavigation } from '@/navigation/types';

export const LoginScreen: React.FC = () => {
    const { login, signInWith, signInWithApple } = useAuth();
    const nav = useNavigation<RootNavigation>();
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [appleAvailable, setAppleAvailable] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;
        AppleAuthentication.isAvailableAsync()
            .then((ok) => setAppleAvailable(ok))
            .catch(() => setAppleAvailable(false));
    }, []);

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

    const handleApple = async () => {
        setBusy(true);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            if (!credential.identityToken) {
                throw new Error('Apple không trả về identityToken');
            }
            await signInWithApple({
                identityToken: credential.identityToken,
                fullName: credential.fullName
                    ? { givenName: credential.fullName.givenName, familyName: credential.fullName.familyName }
                    : undefined,
            });
        } catch (e: any) {
            // ERR_REQUEST_CANCELED = user dismissed sheet.
            if (e?.code === 'ERR_REQUEST_CANCELED') return;
            Alert.alert('Đăng nhập Apple thất bại', e?.message || 'Lỗi không xác định');
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
                <Image
                    source={require('../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.appName}>YÊU</Text>
                <Text style={styles.subtitle}>Mạng Xã Hội Giải Trí Nghệ Thuật</Text>

                <TextInput
                    placeholder="Email hoặc username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={emailOrUsername}
                    onChangeText={setEmailOrUsername}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Mật khẩu"
                    placeholderTextColor="#999"
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
                    <Ionicons name="logo-google" size={20} color="#4285F4" />
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

                {Platform.OS === 'ios' && appleAvailable ? (
                    <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={10}
                        style={styles.appleButton}
                        onPress={handleApple}
                    />
                ) : null}

                <Text style={styles.note}>
                    Phiên bản di động — đọc truyện, ủng hộ tác giả và nạp xu trực tiếp qua App Store / Google Play.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF2F8' },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 12, borderRadius: 24 },
    appName: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', letterSpacing: 1, marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
    input: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 16, color: '#1a1a1a', borderWidth: 1, borderColor: '#e0e0e0' },
    forgotLink: { alignSelf: 'flex-end', paddingVertical: 6, marginBottom: 4 },
    forgotText: { color: '#e91e63', fontSize: 13, fontWeight: '600' },
    button: { backgroundColor: '#e91e63', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
    dividerText: { color: '#888', fontSize: 12, fontWeight: '600' },
    googleButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#fff', borderRadius: 10, paddingVertical: 13,
        borderWidth: 1, borderColor: '#bdc1c6',
        // Bóng nhẹ để nút tách khỏi nền hồng FFF2F8 (chuẩn brand Google: bg trắng).
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    googleButtonText: { color: '#1f1f1f', fontWeight: '600', fontSize: 15 },
    facebookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1877F2', borderRadius: 10, paddingVertical: 13, marginTop: 10 },
    facebookButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    appleButton: { height: 46, marginTop: 10 },
    note: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
