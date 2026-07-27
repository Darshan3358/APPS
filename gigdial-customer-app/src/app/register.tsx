import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Modal, TextInput, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Ahmedabad');
  const [error, setError] = useState('');
  const { register, isLoading, verifyOtp } = useAuth();
  const router = useRouter();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleRegister = async () => {
    setError('');
    if (!name || !phone || !email || !password || !city) {
      setError('Please fill in all fields.');
      return;
    }

    const res = await register(name, phone, email, password, city);
    if (res.success) {
      if (res.otpRequired) {
        setOtpEmail(res.email || email);
        setOtpModalVisible(true);
      } else {
        showToast('Account created successfully! Please login with your credentials.', 'success');
        setTimeout(() => {
          router.replace('/login');
        }, 1500);
      }
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (otpCode.length !== 4) {
      setOtpError('Please enter a valid 4-digit code.');
      return;
    }
    setVerifyingOtp(true);
    const res = await verifyOtp(otpEmail, otpCode);
    setVerifyingOtp(false);
    if (res.success) {
      setOtpModalVisible(false);
      showToast('Account created successfully! Please login with your credentials.', 'success');
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } else {
      setOtpError(res.error || 'Invalid OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
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
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F2C59" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.titleText}>Create Account</Text>
          <Text style={styles.subText}>Sign up to access direct, trusted professionals near you</Text>
        </View>

        <View style={styles.cardContainer}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="Full Name"
            placeholder="Full Name"
            iconName="person-outline"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Mobile Number"
            placeholder="Mobile Number"
            iconName="call-outline"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Input
            label="Email Address"
            placeholder="Email Address"
            iconName="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Password"
            placeholder="Password"
            secureTextEntry
            iconName="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
          />

          <Input
            label="City"
            placeholder="Ahmedabad"
            iconName="pin-outline"
            value={city}
            onChangeText={setCity}
          />

          <TouchableOpacity 
            style={[styles.registerBtn, isLoading && styles.disabledBtn]} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>REGISTER AS CUSTOMER</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerSection}>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.loginText}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Email OTP Verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Email OTP</Text>
            <Text style={styles.modalSub}>
              We have sent a 4-digit verification code to:{"\n"}
              <Text style={{ fontWeight: '700', color: '#0F2C59' }}>{otpEmail}</Text>
            </Text>
            
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="#9CA3AF"
              value={otpCode}
              onChangeText={setOtpCode}
            />

            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalCancelBtn, verifyingOtp && styles.disabledBtn]} 
                onPress={() => setOtpModalVisible(false)}
                disabled={verifyingOtp}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalSubmitBtn, (otpCode.length !== 4 || verifyingOtp) && styles.disabledBtn]} 
                onPress={handleVerifyOtp}
                disabled={otpCode.length !== 4 || verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 24,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C59',
  },
  subText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 20,
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
  registerBtn: {
    backgroundColor: '#0F2C59',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  registerBtnText: {
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
  loginText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    letterSpacing: 8,
    marginBottom: 12,
    color: '#0F2C59',
  },
  otpErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1.5,
    backgroundColor: '#0F2C59',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
