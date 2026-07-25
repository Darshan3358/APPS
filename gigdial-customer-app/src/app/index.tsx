import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Index() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  // If logged in, skip onboarding and redirect to dashboard
  useEffect(() => {
    if (!isLoading && token) {
      router.replace('/(tabs)/dashboard');
    }
  }, [token, isLoading]);

  if (isLoading || token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F2C59" />
      </View>
    );
  }

  const handleNext = () => {
    if (currentSlide < 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.replace('/login');
    }
  };

  const handleSkip = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Top Header - Skip button */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.slideContainer}>
        {currentSlide === 0 ? (
          // Slide 1: Welcome & Value Proposition
          <View style={styles.content}>
            <View style={styles.illustrationContainer}>
              <View style={styles.illustrationCircle}>
                <Ionicons name="people-sharp" size={70} color="#0F2C59" />
                <View style={styles.illustrationSubIcon}>
                  <Ionicons name="ribbon" size={26} color="#0D9488" />
                </View>
              </View>
            </View>

            <Text style={styles.slideTitle}>Your Services,{"\n"}Just a Tap Away</Text>
            <Text style={styles.slideDescription}>
              Find trusted, verified local professionals near you for all your service needs with no middleman.
            </Text>

            <View style={styles.featuresWrapper}>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={16} color="#0D9488" />
                <Text style={styles.featureText}>Verified Workers</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="flash" size={16} color="#0D9488" />
                <Text style={styles.featureText}>Direct Chat</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="card" size={16} color="#0D9488" />
                <Text style={styles.featureText}>Best Pricing</Text>
              </View>
            </View>
          </View>
        ) : (
          // Slide 2: How It Works & Connect
          <View style={styles.content}>
            <View style={styles.illustrationContainer}>
              <View style={[styles.illustrationCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="chatbubbles" size={70} color="#0D9488" />
                <View style={[styles.illustrationSubIcon, { backgroundColor: '#0F2C59' }]}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>

            <Text style={styles.slideTitle}>Book. Connect.{"\n"}Get It Done.</Text>
            <Text style={styles.slideDescription}>
              Enjoy quick booking, real-time secure chat, and direct job completions with complete transparency.
            </Text>

            <View style={styles.featuresWrapper}>
              <View style={styles.featureItem}>
                <Ionicons name="calendar-sharp" size={16} color="#0F2C59" />
                <Text style={styles.featureText}>Flexible Schedule</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="chatbox-ellipses" size={16} color="#0F2C59" />
                <Text style={styles.featureText}>Direct Contact</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.featureText}>Top Rated</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Navigation Indicators & Button */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, currentSlide === 0 ? styles.activeDot : null]} />
          <View style={[styles.dot, currentSlide === 1 ? styles.activeDot : null]} />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentSlide === 0 ? 'Next' : 'Get Started'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    height: 60,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  illustrationSubIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F2C59',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  featuresWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  featureText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  activeDot: {
    backgroundColor: '#0F2C59',
    width: 24,
  },
  button: {
    backgroundColor: '#0F2C59',
    width: '100%',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
