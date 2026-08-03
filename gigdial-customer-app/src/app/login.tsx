import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { TOAST } from '../constants/toastMessages';
import { ResponsiveContainer } from '../components/ResponsiveContainer';

export default function LoginScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleLogin = async () => {
    setError('');
    if (!emailOrPhone || !password) {
      const emptyMsg = '⚠️ Please enter both email/phone and password.';
      setError(emptyMsg);
      showToast(emptyMsg, 'error');
      return;
    }

    const res = await login(emailOrPhone, password);
    if (res.success) {
      showToast(TOAST.AUTH.WELCOME || TOAST.AUTH.LOGIN_SUCCESS || '✅ Welcome back! Login successful.', 'success');
      setTimeout(() => {
        router.replace((redirect as any) || '/(tabs)/dashboard');
      }, 1000);
    } else {
      const errMsg = res.error || TOAST.AUTH.INVALID_CREDENTIALS || TOAST.AUTH.LOGIN_FAILED || '❌ Invalid email or password.';
      showToast(errMsg, 'error');
      setError(errMsg);
    }
  };

  return (
    <ResponsiveContainer maxWidth={520}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      {toast && (
        <View style={[styles.toastContainer, toast.type === 'error' && styles.toastError]}>
          <Ionicons 
            name={toast.type === 'success' ? "checkmark-circle" : "alert-circle"} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.subText}>Login to continue your search for verified local workers</Text>
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
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            iconName="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert('Forgot Password', 'Password reset flow initiated.')}>
            <Text style={styles.forgotText}>Forgot Passcode?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginBtn, isLoading && styles.disabledBtn]} 
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>LOGIN AS CUSTOMER</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerSection}>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.footerText}>
              Don't have an account? <Text style={styles.signUpText}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 10,
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
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E8EC',
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
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  signUpText: {
    color: '#0D9488',
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0D9488',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
