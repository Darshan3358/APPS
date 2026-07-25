import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProgressBarProps {
  currentStep: number; // 1, 2, 3
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  const steps = [1, 2, 3, 4];

  return (
    <View style={styles.container}>
      <Text style={styles.tagline}>
        Start calling your own shots. Earn more with 0% commission and get paid instantly.
      </Text>
      
      <View style={styles.stepsWrapper}>
        {steps.map((step, idx) => {
          const isCompleted = idx + 1 < currentStep;
          const isActive = idx + 1 === currentStep;
          
          return (
            <React.Fragment key={step}>
              {/* Step Circle */}
              <View style={styles.stepContainer}>
                {isActive && <View style={styles.dashedRing} />}
                <View style={[
                  styles.circle,
                  isCompleted && styles.completedCircle,
                  isActive && styles.activeCircle,
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.circleText,
                      isActive && styles.activeText,
                      isCompleted && styles.completedText
                    ]}>
                      {step}
                    </Text>
                  )}
                </View>
              </View>

              {/* Connector line between steps */}
              {idx < steps.length - 1 && (
                <View style={[
                  styles.line,
                  idx + 1 < currentStep && styles.activeLine
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  tagline: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 18,
  },
  stepsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '85%',
    marginVertical: 10,
  },
  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 44,
    height: 44,
  },
  dashedRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderStyle: 'dashed',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activeCircle: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  completedCircle: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  circleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  activeText: {
    color: '#FFFFFF',
  },
  completedText: {
    color: '#FFFFFF',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: -4,
    zIndex: 1,
  },
  activeLine: {
    backgroundColor: '#0F2C59',
  },
});
