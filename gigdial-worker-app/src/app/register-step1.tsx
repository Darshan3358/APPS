import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';

export default function RegisterStep1() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  const [errors, setErrors] = useState<any>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { registerStep1 } = useAuth();
  const router = useRouter();

  const handleNext = async () => {
    setSubmitError('');
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = 'Full Name is required.';
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid Email is required.';
    if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    if (!phone.trim() || phone.length < 10) newErrors.phone = 'Valid Phone number is required.';
    if (!city.trim()) newErrors.city = 'City is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitError('Please correct the highlighted fields.');
      return;
    }

    setSubmitting(true);
    const res = await registerStep1({
      name,
      email,
      password,
      phone,
      city,
      address,
      profilePhoto
    });
    setSubmitting(false);

    if (res.success) {
      setSubmitError('');
      router.push('/register-step2');
    } else {
      setSubmitError(res.error || 'Something went wrong.');
    }
  };

  const handlePhotoUpload = () => {
    Alert.alert(
      'Profile Photo',
      'Choose a mock profile photo for your profile.',
      [
        {
          text: 'Avatar Male',
          onPress: () => setProfilePhoto('assets/images/worker_ramesh.png')
        },
        {
          text: 'Avatar Female',
          onPress: () => setProfilePhoto('assets/images/worker_sita.png')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ProgressBar currentStep={1} />
        </View>

        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionSub}>Step 1 of 3: Provide your personal profile details</Text>
          
          {submitError ? (
            <Text style={styles.errorBanner}>{submitError}</Text>
          ) : null}

          {/* Photo upload mock button */}
          <View style={styles.photoUploadContainer}>
            <TouchableOpacity style={styles.photoBox} onPress={handlePhotoUpload}>
              {profilePhoto ? (
                <View style={styles.photoSelected}>
                  <Ionicons name="checkmark-circle" size={26} color="#0D9488" />
                  <Text style={styles.photoText}>Photo Selected</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.photoText}>UPLOAD PHOTO</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Input
            label="Full Name"
            placeholder="Enter full name"
            iconName="person-outline"
            value={name}
            onChangeText={(val) => { setName(val); setErrors({ ...errors, name: '' }); }}
            error={errors.name}
          />

          <Input
            label="Email"
            placeholder="Enter email"
            iconName="mail-outline"
            value={email}
            onChangeText={(val) => { setEmail(val); setErrors({ ...errors, email: '' }); }}
            error={errors.email}
            autoCapitalize="none"
          />

          <Input
            label="Phone Number"
            placeholder="Enter phone number"
            iconName="call-outline"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(val) => { setPhone(val); setErrors({ ...errors, phone: '' }); }}
            error={errors.phone}
          />

          <Input
            label="City"
            placeholder="Select city"
            iconName="pin-outline"
            value={city}
            onChangeText={(val) => { setCity(val); setErrors({ ...errors, city: '' }); }}
            error={errors.city}
          />

          <Input
            label="Address"
            placeholder="Enter full address"
            multiline
            numberOfLines={2}
            value={address}
            onChangeText={setAddress}
          />

          <Input
            label="Password"
            placeholder="••••••"
            secureTextEntry
            iconName="lock-closed-outline"
            value={password}
            onChangeText={(val) => { setPassword(val); setErrors({ ...errors, password: '' }); }}
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="••••••"
            secureTextEntry
            iconName="lock-closed-outline"
            value={confirmPassword}
            onChangeText={(val) => { setConfirmPassword(val); setErrors({ ...errors, confirmPassword: '' }); }}
            error={errors.confirmPassword}
          />

          <TouchableOpacity style={[styles.nextBtn, submitting && styles.disabledBtn]} onPress={handleNext} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextText}>CONTINUE TO STEP 2</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/login')}>
          <Text style={styles.backText}>Cancel Registration</Text>
        </TouchableOpacity>
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
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  photoUploadContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoBox: {
    width: 80,
    height: 80,
    borderWidth: 1.5,
    borderColor: '#E5E8EC',
    borderStyle: 'dashed',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6FA',
  },
  photoSelected: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    marginTop: 2,
    letterSpacing: 0.5,
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
  nextBtn: {
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
  nextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.7,
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
});
