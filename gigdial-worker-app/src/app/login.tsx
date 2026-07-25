import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Image, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';

export default function LoginScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!emailOrPhone || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const res = await login(emailOrPhone, password);
    if (res.success) {
      router.replace((redirect as any) || '/(tabs)/dashboard');
    } else if (res.incomplete) {
      // Incomplete registration, redirect to step 2 or 3
      Alert.alert(
        'Incomplete Registration',
        res.error || 'Please complete your registration to access the dashboard.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Continue',
            onPress: () => {
              if (res.registrationStep === 1) {
                router.push('/register-step2');
              } else if (res.registrationStep === 2) {
                router.push('/register-step3');
              } else {
                router.push('/register-step1');
              }
            }
          }
        ]
      );
    } else {
      setError(res.error || 'Login failed. Please check credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.welcomeText}>Partner Portal</Text>
          <Text style={styles.subText}>Login to manage your bookings and find local jobs</Text>
        </View>

        <View style={styles.cardContainer}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="Email or Mobile Number"
            placeholder="name@example.com or 10-digit mobile"
            iconName="mail-outline"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            autoCapitalize="none"
          />

          <Input
            label="Passcode"
            placeholder="••••••"
            secureTextEntry
            iconName="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert('Forgot Password', 'Password reset flow is initiated in the background.')}>
            <Text style={styles.forgotText}>Forgot Passcode?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginBtn, isLoading && styles.disabledBtn]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>LOGIN AS WORKER</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerSection}>
          <TouchableOpacity onPress={() => router.push('/register-step1')}>
            <Text style={styles.footerText}>
              Don't have an account? <Text style={styles.signUpText}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 140,
    height: 60,
    alignSelf: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C59',
    marginTop: 12,
  },
  subText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  errorBanner: {
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#0F2C59',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  signUpText: {
    color: '#0D9488',
    fontWeight: '700',
  },
});
