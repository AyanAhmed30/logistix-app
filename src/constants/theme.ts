/**
 * Logistix brand design system — elevated navy + teal with richer depth.
 */
export const colors = {
  brandNavy: '#0B1F3A',
  brandTeal: '#00A8A8',
  primary: '#0B1F3A',
  primaryDark: '#061426',
  primaryMid: '#143556',
  primaryLight: '#E8EEF5',
  accent: '#00A8A8',
  accentDark: '#008F8F',
  accentLight: '#D6F5F5',
  accentGlow: 'rgba(0, 168, 168, 0.22)',
  background: '#F2F5F9',
  backgroundAlt: '#EAF0F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F7FAFC',
  surfaceElevated: '#FFFFFF',
  border: '#DDE5EE',
  borderLight: '#EBF0F5',
  text: '#0B1F3A',
  textSecondary: '#5B6B7C',
  textMuted: '#8B9AAB',
  success: '#0D9488',
  successLight: '#CCFBF1',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',
  overlay: 'rgba(11, 31, 58, 0.55)',
  heroOverlay: 'rgba(6, 20, 38, 0.72)',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const, lineHeight: 40 },
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#00A8A8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export const motion = {
  fast: 180,
  normal: 320,
  slow: 520,
} as const;
