export const theme = {
  colors: {
    primaryNavy: '#1E2A47',
    primaryNavyDark: '#1F2937',
    primaryBlue: '#3B5BFF',
    background: '#F4F6F9',
    cardWhite: '#FFFFFF',
    border: '#E5E8EC',
    dangerRed: '#EF4444',
    mutedGray: '#6B7280',
    
    // Status Pills
    success: {
      text: '#16A34A',
      bg: '#DCFCE7',
    },
    warning: {
      text: '#D97706',
      bg: '#FEF3C7',
    },
    info: {
      text: '#4F46E5',
      bg: '#E0E7FF',
    },
    teal: {
      text: '#0D9488',
      bg: '#CCFBF1',
    },
    danger: {
      text: '#EF4444',
      bg: '#FEE2E2',
    }
  },
  typography: {
    fontFamily: 'System', // Fallback to standard iOS/Android sans-serif
    title: {
      fontSize: 20,
      fontWeight: 'bold' as const,
    },
    sectionHeading: {
      fontSize: 24,
      fontWeight: 'bold' as const,
    },
    cardLabel: {
      fontSize: 13,
      fontWeight: 'normal' as const,
    },
    cardValue: {
      fontSize: 26,
      fontWeight: 'bold' as const,
    },
    tableHeader: {
      fontSize: 14,
      fontWeight: 'bold' as const,
    },
    tableCell: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600' as const,
    }
  },
  shadows: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2, // for Android
    }
  },
  layout: {
    paddingHorizontal: 16,
    cardRadius: 16,
    tableRowHeight: 64,
  }
};
