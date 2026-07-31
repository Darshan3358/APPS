import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Platform, Modal, TextInput, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';
import { API_URL as LOCAL_API_URL } from '../config/api';

export default function RegisterStep3() {
  const router = useRouter();
  const { registerStep3, tempRegData, setTempRegData, verifyOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : insets.top;

  const [serviceType, setServiceType] = useState('Residency');
  const [aadhaarNumber, setAadhaarNumber] = useState<string>(tempRegData.aadhaarNumber || '');
  const [panNumber, setPanNumber] = useState<string>(tempRegData.panNumber || '');
  const [aadhaarUri, setAadhaarUri] = useState<string>('');
  const [panUri, setPanUri] = useState<string>('');
  
  const [aadhaarFile, setAadhaarFile] = useState<any>(null);
  const [panFile, setPanFile] = useState<any>(null);
  const [experienceCertUri, setExperienceCertUri] = useState<string>(tempRegData.experienceCertUri || '');
  const [experienceCertFile, setExperienceCertFile] = useState<any>(tempRegData.experienceCertFile || null);

  const [aadhaarBase64, setAadhaarBase64] = useState<string>('');
  const [panBase64, setPanBase64] = useState<string>('');
  const [experienceCertBase64, setExperienceCertBase64] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    // Redirect back if step 1 wasn't filled
    if (!tempRegData.email) {
      Alert.alert('Session Expired', 'Please enter your personal details first.');
      router.replace('/register-step1');
      return;
    }
  }, [tempRegData.email]);

  const handlePickAadhaar = async () => {
    if ((Platform.OS as string) === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setAadhaarFile(file);
          setAadhaarUri(URL.createObjectURL(file));
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            setAadhaarBase64(res ? res.split(',')[1] || res : '');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Permission to access media library is required to select photos.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const fileUri = Platform.OS === 'android' && !asset.uri.startsWith('file://') && !asset.uri.startsWith('content://')
            ? `file://${asset.uri}`
            : asset.uri;
          const fileName = asset.fileName || asset.uri.split('/').pop() || 'aadhaar.jpg';
          const match = /\.(\w+)$/.exec(fileName);
          const fileType = asset.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

          setAadhaarUri(fileUri);
          setAadhaarBase64(asset.base64 || '');
          setAadhaarFile({
            uri: fileUri,
            name: fileName,
            type: fileType
          });
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to select document from gallery.');
      }
    }
  };

  const handlePickPan = async () => {
    if ((Platform.OS as string) === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setPanFile(file);
          setPanUri(URL.createObjectURL(file));
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            setPanBase64(res ? res.split(',')[1] || res : '');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Permission to access media library is required to select photos.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const fileUri = Platform.OS === 'android' && !asset.uri.startsWith('file://') && !asset.uri.startsWith('content://')
            ? `file://${asset.uri}`
            : asset.uri;
          const fileName = asset.fileName || asset.uri.split('/').pop() || 'pan.jpg';
          const match = /\.(\w+)$/.exec(fileName);
          const fileType = asset.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

          setPanUri(fileUri);
          setPanBase64(asset.base64 || '');
          setPanFile({
            uri: fileUri,
            name: fileName,
            type: fileType
          });
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to select document from gallery.');
      }
    }
  };

  const handlePickExperienceCert = async () => {
    if ((Platform.OS as string) === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setExperienceCertFile(file);
          setExperienceCertUri(URL.createObjectURL(file));
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            setExperienceCertBase64(res ? res.split(',')[1] || res : '');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Permission to access media library is required to select photos.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const fileUri = Platform.OS === 'android' && !asset.uri.startsWith('file://') && !asset.uri.startsWith('content://')
            ? `file://${asset.uri}`
            : asset.uri;
          const fileName = asset.fileName || asset.uri.split('/').pop() || 'experience_cert.jpg';
          const match = /\.(\w+)$/.exec(fileName);
          const fileType = asset.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

          setExperienceCertUri(fileUri);
          setExperienceCertBase64(asset.base64 || '');
          setExperienceCertFile({
            uri: fileUri,
            name: fileName,
            type: fileType
          });
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to select document from gallery.');
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!serviceType) {
      setSubmitError('Please select a Service Type.');
      return;
    }
    if (!aadhaarNumber || aadhaarNumber.trim().length < 4) {
      setSubmitError('Please enter a valid Aadhaar Number.');
      return;
    }
    if (!panNumber || panNumber.trim().length < 4) {
      setSubmitError('Please enter a valid PAN Number.');
      return;
    }
    if (!aadhaarUri) {
      setSubmitError('Aadhaar Card document upload is required.');
      return;
    }
    if (!panUri) {
      setSubmitError('PAN Card document uploader is required.');
      return;
    }

    setSubmitting(true);
    
    try {
      const res = await registerStep3(
        serviceType,
        [],
        aadhaarUri,
        panUri,
        aadhaarFile,
        panFile,
        experienceCertUri,
        experienceCertFile,
        aadhaarNumber,
        panNumber,
        aadhaarBase64,
        panBase64,
        experienceCertBase64
      );
      setSubmitting(false);

      if (res.success) {
        if (res.otpRequired) {
          setOtpEmail(res.email || tempRegData.email || '');
          setOtpModalVisible(true);
        } else {
          Alert.alert(
            'Account Created Successfully',
            'Your professional profile has been created successfully. Please login with your credentials.',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
        }
      } else {
        let cleanErr = (res.error || 'Failed to submit documents.')
          .replace(/<[^>]*>?/gm, '')
          .replace(/<!DOCTYPE.*?>/gi, '')
          .trim();
        if (!cleanErr || cleanErr.includes('Internal Server Error') || cleanErr.includes('html')) {
          cleanErr = 'KYC submission failed. Please verify selected images and try again.';
        }
        setSubmitError(cleanErr);
      }
    } catch (err: any) {
      setSubmitting(false);
      let cleanErr = (err.message || 'Failed to connect to server.')
        .replace(/<[^>]*>?/gm, '')
        .replace(/<!DOCTYPE.*?>/gi, '')
        .trim();
      if (!cleanErr || cleanErr.includes('Internal Server Error') || cleanErr.includes('html')) {
        cleanErr = 'Network error. Please check your connection and try again.';
      }
      setSubmitError(cleanErr);
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
      Alert.alert(
        'Account Created Successfully',
        'Your professional profile has been created successfully. Please login with your credentials.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } else {
      setOtpError(res.error || 'Invalid OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { paddingTop: topPadding }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ProgressBar currentStep={3} />
        </View>

        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>KYC Verification</Text>
          {submitError ? (
            <View style={styles.errorToastContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.errorToastText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Service Type Selection */}
          <Text style={styles.label}>Service Type</Text>
          <View style={styles.serviceTypeRow}>
            {['Residency', 'Commercial', 'Both'].map((type) => {
              const active = serviceType === type;
              let iconName: any = 'home-outline';
              if (type === 'Commercial') iconName = 'business-outline';
              if (type === 'Both') iconName = 'grid-outline';

              return (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.serviceTypeBox, active && styles.serviceTypeBoxActive]}
                  onPress={() => setServiceType(type)}
                >
                  <Ionicons name={iconName} size={20} color={active ? '#0F2C59' : '#6B7280'} />
                  <Text style={[styles.serviceTypeText, active && styles.serviceTypeTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Aadhaar Number input */}
          <Input
            label="Aadhaar Number"
            placeholder="Enter Aadhaar number"
            iconName="document-text-outline"
            keyboardType="numeric"
            maxLength={12}
            value={aadhaarNumber}
            onChangeText={(val: string) => {
              setAadhaarNumber(val);
              setTempRegData((prev: any) => ({ ...prev, aadhaarNumber: val }));
            }}
          />

          {/* Aadhaar Upload Box */}
          <Text style={styles.label}>Aadhaar Front</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePickAadhaar}>
            {aadhaarUri ? (
              <View style={styles.uploadedContent}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#0D9488" />
                <Text style={styles.uploadedTitle}>Aadhaar Front Selected</Text>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="cloud-upload-outline" size={24} color="#9CA3AF" />
                <Text style={styles.uploadPlaceholderTitle}>Upload Front Image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* PAN Number Input */}
          <Input
            label="PAN Number"
            placeholder="Enter PAN card number"
            iconName="card-outline"
            autoCapitalize="characters"
            maxLength={10}
            value={panNumber}
            onChangeText={(val: string) => {
              setPanNumber(val);
              setTempRegData((prev: any) => ({ ...prev, panNumber: val }));
            }}
          />

          <Text style={styles.label}>PAN Image</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePickPan}>
            {panUri ? (
              <View style={styles.uploadedContent}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#0D9488" />
                <Text style={styles.uploadedTitle}>PAN Image Selected</Text>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="cloud-upload-outline" size={24} color="#9CA3AF" />
                <Text style={styles.uploadPlaceholderTitle}>Upload PAN Image</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.disabledBtn]} 
            onPress={handleSubmit} 
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit & Verify</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Verify OTP</Text>
            <Text style={styles.modalSub}>
              We have sent a verification code to:{"\n"}
              <Text style={{ fontWeight: 'bold' }}>{otpEmail}</Text>
            </Text>
            
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C59',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C59',
    marginBottom: 8,
    marginTop: 12,
  },
  optionalTag: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  serviceTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  serviceTypeBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  serviceTypeBoxActive: {
    borderColor: '#0F2C59',
    backgroundColor: '#EEF2F6',
    borderWidth: 2,
  },
  serviceTypeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
  },
  serviceTypeTextActive: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 6,
  },
  skillChip: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F6FA',
  },
  skillChipActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  skillChipText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  skillChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#E5E8EC',
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6FA',
    marginBottom: 16,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadPlaceholderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  uploadedContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },
  backBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#0F2C59',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  errorToastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorToastText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
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
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
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
    backgroundColor: '#F5F6FA',
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
