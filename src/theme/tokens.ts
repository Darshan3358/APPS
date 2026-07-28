import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 800;

export const scale = (size: number): number => {
  const scaled = (SCREEN_WIDTH / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const verticalScale = (size: number): number => {
  const scaled = (SCREEN_HEIGHT / BASE_HEIGHT) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const moderateScale = (size: number, factor = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

export const tokens = {
  colors: {
    primary: '#0F2C59',
    secondary: '#0D9488',
    accent: '#F59E0B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    textPrimary: '#0F2C59',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
  },
  typography: {
    display: 32,
    title: 24,
    header: 18,
    body: 14,
    caption: 12,
    button: 14,
  },
  touchTarget: {
    minHeight: 44,
  },
};
