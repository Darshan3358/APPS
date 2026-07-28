import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  maxWidth?: number;
  enableKeyboardAvoiding?: boolean;
}

export function ResponsiveContainer({
  children,
  style,
  contentStyle,
  maxWidth = 600,
  enableKeyboardAvoiding = true,
}: ResponsiveContainerProps) {
  const { isDesktop, isTablet } = useResponsive();

  const containerContent = (
    <SafeAreaView style={[styles.safeArea, style]}>
      <View
        style={[
          styles.innerContainer,
          (isDesktop || isTablet) ? { maxWidth, alignSelf: 'center', width: '100%' } : null,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );

  if (enableKeyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {containerContent}
      </KeyboardAvoidingView>
    );
  }

  return containerContent;
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
  },
});
