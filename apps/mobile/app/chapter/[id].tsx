import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { storyService } from '../../src/services';
import { Ionicons } from '@expo/vector-icons';

const FONT_SIZES = [14, 16, 18, 20, 22, 24];
const LINE_HEIGHTS = [1.6, 1.8, 2.0, 2.2];

export default function ChapterReaderScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { width } = useWindowDimensions();
    const [fontSize, setFontSize] = useState(18);
    const [lineHeight, setLineHeight] = useState(1.8);
    const [showSettings, setShowSettings] = useState(false);

    const {
        data: chapter,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['chapter', id],
        queryFn: () => storyService.getChapter(id!),
        enabled: !!id,
    });

    const increaseFontSize = useCallback(() => {
        setFontSize((prev) => {
            const idx = FONT_SIZES.indexOf(prev);
            return idx < FONT_SIZES.length - 1 ? FONT_SIZES[idx + 1] : prev;
        });
    }, []);

    const decreaseFontSize = useCallback(() => {
        setFontSize((prev) => {
            const idx = FONT_SIZES.indexOf(prev);
            return idx > 0 ? FONT_SIZES[idx - 1] : prev;
        });
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (error || !chapter) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Không thể tải chương này</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: '#0f172a' },
                    headerTintColor: '#fff',
                    headerTitle: `Chương ${chapter.chapterNumber}`,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => setShowSettings(!showSettings)}
                            style={styles.headerButton}
                        >
                            <Ionicons name="settings-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    ),
                }}
            />

            {/* Settings Panel */}
            {showSettings && (
                <View style={styles.settingsPanel}>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Cỡ chữ</Text>
                        <View style={styles.settingControls}>
                            <TouchableOpacity onPress={decreaseFontSize} style={styles.settingButton}>
                                <Ionicons name="remove" size={20} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.settingValue}>{fontSize}</Text>
                            <TouchableOpacity onPress={increaseFontSize} style={styles.settingButton}>
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>

                <Text
                    style={[
                        styles.content,
                        {
                            fontSize,
                            lineHeight: fontSize * lineHeight,
                        },
                    ]}
                >
                    {chapter.content}
                </Text>

                {/* Navigation */}
                <View style={styles.navigationContainer}>
                    <TouchableOpacity
                        style={[styles.navButton, styles.navButtonDisabled]}
                        disabled={true}
                    >
                        <Ionicons name="chevron-back" size={20} color="#64748b" />
                        <Text style={styles.navButtonTextDisabled}>Chương trước</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.chaptersButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="list" size={20} color="#3b82f6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navButton, styles.navButtonDisabled]}
                        disabled={true}
                    >
                        <Text style={styles.navButtonTextDisabled}>Chương sau</Text>
                        <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 20,
    },
    errorText: {
        color: '#f87171',
        fontSize: 18,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    headerButton: {
        padding: 8,
    },
    settingsPanel: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLabel: {
        color: '#e2e8f0',
        fontSize: 16,
    },
    settingControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingButton: {
        backgroundColor: '#334155',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        width: 30,
        textAlign: 'center',
    },
    chapterTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 24,
        textAlign: 'center',
    },
    content: {
        color: '#e2e8f0',
        textAlign: 'justify',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 40,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#1e293b',
        gap: 4,
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    navButtonTextDisabled: {
        color: '#64748b',
        fontSize: 14,
    },
    chaptersButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#1e293b',
    },
});
