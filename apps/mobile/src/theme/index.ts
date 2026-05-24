/**
 * Design tokens — Luminous Petal theme từ `docs/stitch_mobile/luminous_petal/DESIGN.md`.
 *
 * Style: Minimalism với glassmorphism accents. Warm gray primary (#635d60) +
 * soft pink-white container (#fcf2f6) cho cảm giác premium "lifestyle".
 *
 * Alias cũ (`bg`, `text`, `textMuted`, `border`) trỏ về tokens mới để screens
 * chưa refactor vẫn chạy với palette mới (chỉ đổi hue, không vỡ layout).
 */

export const colors = {
    // === Luminous Petal tokens (Material Design 3-style) ===
    primary: '#635d60', // warm gray-brown — primary actions, focused borders
    primaryContainer: '#fcf2f6', // soft pink-white — large surface highlights
    onPrimary: '#ffffff',
    onPrimaryContainer: '#746e71',
    primaryFixed: '#eae0e4',
    primaryFixedDim: '#cdc4c8',

    secondary: '#5f5e5e',
    secondaryContainer: '#e4e2e1',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#656464',

    tertiary: '#6a5a61',
    tertiaryContainer: '#fff1f5',
    onTertiary: '#ffffff',
    onTertiaryContainer: '#7b6b72',

    background: '#f9f9f9',
    onBackground: '#1a1c1c',
    surface: '#f9f9f9',
    surfaceDim: '#dadada',
    surfaceBright: '#f9f9f9',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f3f3f3',
    surfaceContainer: '#eeeeee',
    surfaceContainerHigh: '#e8e8e8',
    surfaceContainerHighest: '#e2e2e2',
    onSurface: '#1a1c1c',
    onSurfaceVariant: '#4b4549',
    surfaceVariant: '#e2e2e2',
    surfaceTint: '#635d60',
    inverseSurface: '#2f3131',
    inverseOnSurface: '#f1f1f1',
    inversePrimary: '#cdc4c8',

    outline: '#7c7579',
    outlineVariant: '#cdc4c8',

    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#93000a',

    // === Functional ===
    star: '#FFB300',
    coin: '#F4A100',
    success: '#2E7D32',
    danger: '#ba1a1a',
    overlay: 'rgba(0,0,0,0.5)',
    white: '#FFFFFF',

    // === Backwards-compat alias — đừng dùng cho code mới, refactor screens
    // dần dần sang token chuẩn ở trên. ===
    primaryDark: '#4b4548', // ≈ on-primary-fixed-variant
    primarySoft: '#fcf2f6', // = primaryContainer
    bg: '#f9f9f9', // = background
    text: '#1a1c1c', // = onSurface
    textMuted: '#4b4549', // = onSurfaceVariant
    border: '#cdc4c8', // = outlineVariant
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
} as const;

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
} as const;

export const fontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
} as const;

/**
 * Typography presets — apply trực tiếp lên `<Text style={typography.bodyMd}>`.
 * Font family được load qua expo-google-fonts trong App.tsx; nếu chưa load xong,
 * RN fall back sang system font (App.tsx hold splash đến khi sẵn sàng).
 */
export const typography = {
    headlineXl: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 48,
        lineHeight: 56,
        letterSpacing: -0.96, // -0.02em ở 48px
    },
    headlineLg: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 32,
        lineHeight: 40,
        letterSpacing: -0.32,
    },
    headlineMd: {
        // Mobile heading default (theo design `headline-lg-mobile`)
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 28,
        lineHeight: 36,
    },
    headlineSm: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 22,
        lineHeight: 28,
    },
    bodyLg: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 18,
        lineHeight: 28,
    },
    bodyMd: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 16,
        lineHeight: 24,
    },
    bodySm: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 14,
        lineHeight: 20,
    },
    labelMd: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.28, // 0.02em
    },
    labelSm: {
        fontFamily: 'DMSans_700Bold',
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.6, // 0.05em
        textTransform: 'uppercase' as const,
    },
} as const;

/** Background/text pairs for the chapter reader's theme toggle. */
export const readerThemes = {
    light: { key: 'light', bg: '#fcf2f6', text: '#1a1c1c', muted: '#4b4549' },
    sepia: { key: 'sepia', bg: '#F3E9D2', text: '#3B2F1B', muted: '#9B8B6A' },
    dark: { key: 'dark', bg: '#15131A', text: '#D9D3DB', muted: '#6E6776' },
} as const;

export type ReaderThemeKey = keyof typeof readerThemes;
