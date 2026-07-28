import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, StatusBar, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';

const INDIAN_CITIES = [
  'Ahmedabad', 'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
  'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ludhiana', 'Agra', 'Nashik',
  'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad',
  'Dhanbad', 'Amritsar', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore',
  'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur',
  'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli', 'Mysore',
  'Tiruchirappalli', 'Bareilly', 'Aligarh', 'Moradabad', 'Kolhapur',
];

export default function RegisterStep1() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  
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
    if (!city.trim()) newErrors.city = 'City selection is required.';

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

          {/* City Selection Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.fieldLabel}>City</Text>
            <TouchableOpacity 
              style={[styles.citySelector, errors.city ? styles.inputErrorBorder : null]} 
              onPress={() => setShowCityModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="pin-outline" size={20} color="#9CA3AF" style={styles.fieldIcon} />
              <Text style={[styles.citySelectorText, !city ? styles.placeholderText : null]}>
                {city || 'Select city'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
          </View>

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

      {/* City Selection Modal */}
      <Modal visible={showCityModal} animationType="slide" transparent onRequestClose={() => setShowCityModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#0F2C59" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city..."
                placeholderTextColor="#9CA3AF"
                value={citySearch}
                onChangeText={setCitySearch}
              />
              {citySearch ? (
                <TouchableOpacity onPress={() => setCitySearch('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 350 }} keyboardShouldPersistTaps="handled">
              {INDIAN_CITIES
                .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
                .map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.cityItem, city === item ? styles.selectedCityItem : null]}
                    onPress={() => {
                      setCity(item);
                      setErrors({ ...errors, city: '' });
                      setShowCityModal(false);
                      setCitySearch('');
                    }}
                  >
                    <Ionicons 
                      name="location-outline" 
                      size={18} 
                      color={city === item ? '#0D9488' : '#6B7280'} 
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.cityItemText, city === item ? styles.selectedCityItemText : null]}>
                      {item}
                    </Text>
                    {city === item ? (
                      <Ionicons name="checkmark" size={20} color="#0D9488" />
                    ) : null}
                  </TouchableOpacity>
                ))}
            </ScrollView>
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
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F2C59',
    marginBottom: 6,
  },
  fieldIcon: {
    marginRight: 12,
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  citySelectorText: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 15,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2C59',
  },
  closeBtn: {
    padding: 4,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedCityItem: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
  },
  cityItemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  selectedCityItemText: {
    color: '#0D9488',
    fontWeight: '700',
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

