import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  currentStep: number; // 1, 2, 3
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  const percentage = (currentStep / 3) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.stepText}>Step {currentStep} of 3</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F2C59',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  track: {
    width: '60%',
    height: 4,
    backgroundColor: '#E5E8EC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#0D9488', // Accent Green
    borderRadius: 2,
  },
});
