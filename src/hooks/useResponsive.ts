import { useWindowDimensions } from 'react-native';
import { scale, verticalScale, moderateScale, tokens } from '../theme/tokens';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;
  const isWide = width >= 1600;

  const numGridColumns = isWide ? 4 : isDesktop ? 3 : isTablet ? 2 : 1;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    numGridColumns,
    scale,
    verticalScale,
    moderateScale,
    tokens,
  };
}
