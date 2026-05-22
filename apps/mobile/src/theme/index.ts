/**
 * Design tokens for the mobile app. Pink "YÊU" brand, light surfaces.
 * Keep this the single source of colour/spacing values — screens import
 * from here rather than hard-coding hex.
 */

export const colors = {
    primary: '#E91E63',
    primaryDark: '#C2185B',
    primarySoft: '#FCE4EC',
    bg: '#FFF7FB',
    surface: '#FFFFFF',
    text: '#1A1015',
    textMuted: '#8A7F85',
    border: '#F2DDE7',
    star: '#FFB300',
    coin: '#F4A100',
    success: '#2E7D32',
    danger: '#D32F2F',
    overlay: 'rgba(0,0,0,0.5)',
    white: '#FFFFFF',
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

/** Background/text pairs for the chapter reader's theme toggle. */
export const readerThemes = {
    light: { key: 'light', bg: '#FFFDF8', text: '#211A1E', muted: '#9A8F95' },
    sepia: { key: 'sepia', bg: '#F3E9D2', text: '#3B2F1B', muted: '#9B8B6A' },
    dark: { key: 'dark', bg: '#15131A', text: '#D9D3DB', muted: '#6E6776' },
} as const;

export type ReaderThemeKey = keyof typeof readerThemes;
