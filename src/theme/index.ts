export const colors = {
  primary: '#FF9026',
  primaryDark: '#B85C00',
  primarySoft: '#FFF1E4',
  background: '#DADADA',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F5F4',
  border: '#E7E7E7',
  text: '#191919',
  textMuted: '#858585',
  success: '#2E9E5B',
  successSoft: '#E6F5EC',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#C0392B',
  dangerSoft: '#FDECEA',
  info: '#2563EB',
  infoSoft: '#E8F0FE',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(36, 28, 21, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const layout = {
  formMaxWidth: 320,
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  layout,
} as const;
