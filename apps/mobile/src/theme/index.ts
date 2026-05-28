/**
 * Design tokens — Luminous Petal (light) + Vivid Reader (dark).
 * Alias cũ (`bg`, `text`, `textMuted`, `border`) trỏ về tokens mới để screens
 * chưa refactor vẫn chạy.
 */

export const lightColors = {
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
    primaryDark: '#4b4548',
    primarySoft: '#fcf2f6',
    bg: '#f9f9f9',
    text: '#1a1c1c',
    textMuted: '#4b4549',
    border: '#cdc4c8',
} as const;

/** Backward-compat alias — code cũ import `colors` vẫn dùng được. */
export const colors = lightColors;

/** Dark palette — Vivid Reader (warm dark surface). */
export const darkColors = {
    primary: '#cdc4c8',
    primaryContainer: '#3a2f35',
    onPrimary: '#352e31',
    onPrimaryContainer: '#eae0e4',
    primaryFixed: '#eae0e4',
    primaryFixedDim: '#cdc4c8',

    secondary: '#c8c6c5',
    secondaryContainer: '#4a4948',
    onSecondary: '#323130',
    onSecondaryContainer: '#c4c2c1',

    tertiary: '#d5bfc8',
    tertiaryContainer: '#52424a',
    onTertiary: '#3a2c34',
    onTertiaryContainer: '#f2dde8',

    background: '#141218',
    onBackground: '#e6e1e5',
    surface: '#141218',
    surfaceDim: '#141218',
    surfaceBright: '#3b383e',
    surfaceContainerLowest: '#0f0d12',
    surfaceContainerLow: '#1c1b1f',
    surfaceContainer: '#201e22',
    surfaceContainerHigh: '#2b292d',
    surfaceContainerHighest: '#36343a',
    onSurface: '#e6e1e5',
    onSurfaceVariant: '#cac4ce',
    surfaceVariant: '#49454f',
    surfaceTint: '#cdc4c8',
    inverseSurface: '#e6e1e5',
    inverseOnSurface: '#313033',
    inversePrimary: '#635d60',

    outline: '#948f99',
    outlineVariant: '#49454f',

    error: '#ffb4ab',
    errorContainer: '#93000a',
    onError: '#690005',
    onErrorContainer: '#ffdad6',

    star: '#FFB300',
    coin: '#F4A100',
    success: '#4CAF50',
    danger: '#ffb4ab',
    overlay: 'rgba(0,0,0,0.65)',
    white: '#FFFFFF',

    primaryDark: '#b0aaad',
    primarySoft: '#3a2f35',
    bg: '#141218',
    text: '#e6e1e5',
    textMuted: '#cac4ce',
    border: '#49454f',
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
