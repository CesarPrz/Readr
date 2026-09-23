import type { Theme } from '@react-navigation/native';

// Palette inspired by the dark "e-bookshelf" reference: deep aubergine
// background with soft pastel accents on cards.
export const colors = {
  background: '#1B1023',
  surface: '#241531',
  surfaceAlt: '#2E1B3D',
  primaryText: '#F6F2FA',
  secondaryText: '#B6A6C9',
  placeholder: '#7C6A90',
  accentOrange: '#F2A65A',
  accentSage: '#8FB996',
  accentBlue: '#6FA8DC',
  accentPink: '#D98CB3',
  border: '#3A2748',
  danger: '#E17B7B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const typography = {
  hero: {
    fontFamily: 'serif' as const,
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.primaryText,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.primaryText,
  },
  body: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.secondaryText,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.accentOrange,
    background: colors.background,
    card: colors.surface,
    text: colors.primaryText,
    border: colors.border,
    notification: colors.accentPink,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

// One accent color per format, so the same badge always reads the same way.
export function accentForFormat(format: string): string {
  const f = format.toLowerCase();
  if (f.includes('audio')) return colors.accentBlue;
  if (f.includes('ebook') || f.includes('electronic')) return colors.accentSage;
  if (f.includes('paperback') || f.includes('broch')) return colors.accentOrange;
  return colors.accentPink;
}
