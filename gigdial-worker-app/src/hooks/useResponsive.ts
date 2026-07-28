import { useWindowDimensions } from 'react-native';
import { scale, verticalScale, moderateScale, tokens } from '../theme/tokens';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmallMobile = width < 360;
  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const isLandscape = width > height;

  const numColumns = isDesktop ? 4 : isTablet ? 2 : 1;
  const maxContentWidth = isDesktop ? 1200 : isTablet ? 800 : 600;

  return {
    width,
    height,
    isSmallMobile,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    numColumns,
    maxContentWidth,
    scale,
    verticalScale,
    moderateScale,
    tokens,
  };
}
