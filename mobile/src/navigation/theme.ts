/**
 * Design tokens for Namma Metro Journey Companion.
 * Inspired by Namma Metro purple branding, modernized.
 */

export const colors = {
  purple: {
    900: '#3D0A4D',
    800: '#4A0E5C',
    700: '#5C1A6E',
    600: '#7B2D8E',  // Primary — official Namma Metro purple
    500: '#8E3FA2',
    400: '#A855C7',
    300: '#C084DB',
    200: '#D8B4E8',
    100: '#F3E5F5',
    50: '#FCF4FF',
  },
  green: {
    700: '#2E7D32',
    600: '#388E3C',  // Green Line color
    500: '#4CAF50',
    400: '#66BB6A',
    100: '#E8F5E9',
    50: '#F1F8E9',
  },
  neutral: {
    900: '#1A1A1A',
    800: '#333333',
    700: '#4A4A4A',
    600: '#666666',
    500: '#888888',
    400: '#AAAAAA',
    300: '#CCCCCC',
    200: '#E0E0E0',
    150: '#EEEEEE',
    100: '#F5F5F5',
    50: '#FAFAFA',
    0: '#FFFFFF',
  },
  status: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: {
    primary: '#333333',
    secondary: '#666666',
    muted: '#999999',
    inverse: '#FFFFFF',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.text.primary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.text.secondary,
  },
  small: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: colors.text.muted,
  },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;
