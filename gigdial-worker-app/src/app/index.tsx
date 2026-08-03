import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { token, user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.replace('/login');
    } else {
      // Check if registration is incomplete
      if (user && user.registrationStep && user.registrationStep < 3) {
        if (user.registrationStep === 1) {
          router.replace('/register-step2');
        } else if (user.registrationStep === 2) {
          router.replace('/register-step3');
        } else {
          router.replace('/register-step1');
        }
      } else if (user && !user.isApproved) {
        logout();
        router.replace('/login');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [token, user, isLoading]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="small" color="#0D9488" style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 280,
    height: 280,
  },
});
