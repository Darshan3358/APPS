import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

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
    background: '#F5F6FA',
    card: '#FFFFFF',
    textPrimary: '#0F2C59',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E8EC',
    error: '#EF4444',
    errorBg: '#FEE2E2',
    success: '#0D9488',
    successBg: '#F0FDF4',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
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
    sm: 8,
    md: 14,
    lg: 20,
    xl: 24,
    pill: 999,
  },
  typography: {
    display: moderateScale(28),
    title: moderateScale(22),
    header: moderateScale(18),
    body: moderateScale(15),
    subText: moderateScale(13),
    caption: moderateScale(12),
    button: moderateScale(15),
  },
  touchTarget: {
    minHeight: 48,
    buttonHeight: 54,
  },
  shadow: Platform.select({
    web: {
      shadowColor: '#0F2C59',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    default: {
      shadowColor: '#0F2C59',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
  }),
};
