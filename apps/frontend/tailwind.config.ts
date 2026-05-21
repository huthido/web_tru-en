import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Body / UI — Inter. Headlines — Be Vietnam Pro (Vietnamese-native grotesk).
        sans: ['var(--font-body)', 'Inter', 'sans-serif'],
        display: ['var(--font-display)', 'Be Vietnam Pro', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'rgb(var(--md-primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground))',
          container: 'rgb(var(--md-primary-container) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        // === Vivid Reader theme tokens (Material Design 3) ===
        surface: {
          DEFAULT: 'rgb(var(--md-surface) / <alpha-value>)',
          variant: 'rgb(var(--md-surface-variant) / <alpha-value>)',
          container: 'rgb(var(--md-surface-container) / <alpha-value>)',
          'container-lowest': 'rgb(var(--md-surface-container-lowest) / <alpha-value>)',
          'container-low': 'rgb(var(--md-surface-container-low) / <alpha-value>)',
          'container-high': 'rgb(var(--md-surface-container-high) / <alpha-value>)',
          'container-highest': 'rgb(var(--md-surface-container-highest) / <alpha-value>)',
        },
        'on-surface': {
          DEFAULT: 'rgb(var(--md-on-surface) / <alpha-value>)',
          variant: 'rgb(var(--md-on-surface-variant) / <alpha-value>)',
        },
        'on-primary': {
          DEFAULT: 'rgb(var(--md-on-primary) / <alpha-value>)',
          container: 'rgb(var(--md-on-primary-container) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--md-tertiary) / <alpha-value>)',
          container: 'rgb(var(--md-tertiary-container) / <alpha-value>)',
        },
        'on-tertiary': {
          DEFAULT: 'rgb(var(--md-on-tertiary) / <alpha-value>)',
          container: 'rgb(var(--md-on-tertiary-container) / <alpha-value>)',
        },
        outline: {
          DEFAULT: 'rgb(var(--md-outline) / <alpha-value>)',
          variant: 'rgb(var(--md-outline-variant) / <alpha-value>)',
        },
      },
    },
    keyframes: {
      'slide-in-right': {
        '0%': {
          opacity: '0',
          transform: 'translateX(30px)',
        },
        '100%': {
          opacity: '1',
          transform: 'translateX(0)',
        },
      },
    },
    animation: {
      'slide-in-right': 'slide-in-right 0.3s ease-out',
    },
  },

  plugins: [],
};

export default config;
