import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import { API_URL as LOCAL_API_URL } from '../config/api';
import Input from '../components/Input';

const STATIC_LANGUAGES = ['Hindi', 'English', 'Gujarati', 'Marathi', 'Punjabi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Urdu', 'Malayalam', 'Odia'];

// List of 45 home and local services
const ALL_CATEGORIES = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'Cleaner',
  'AC Repair & Service',
  'Appliance Repair',
  'Pest Control',
  'Gardener / Landscaping',
  'Waterproofing',
  'Welder / Metal Fabrication',
  'Mason / Bricklayer',
  'Tiler (Flooring & Wall)',
  'Packers & Movers',
  'Car Wash & Detailing',
  'Barber / Hairdresser',
  'Beautician / Salon',
  'Massage Therapist',
  'Physiotherapist',
  'Nanny / Babysitter',
  'Elder Care Taker',
  'Chef / Cook',
  'Maid / Domestic Helper',
  'Driver',
  'Security Guard',
  'CCTV & Smart Home Installer',
  'Computer / Laptop Repair',
  'Mobile & Tablet Repair',
  'Dry Cleaning / Laundry',
  'Tailor & Alterations',
  'Tutor / Home Teacher',
  'Fitness Trainer / Yoga',
  'Dog Walker / Pet Groomer',
  'Photographer / Videographer',
  'Event Decorator',
  'DJ / Sound System Setup',
  'RO Water Purifier Service',
  'Chimney Cleaning',
  'Sofa & Carpet Cleaning',
  'Locksmith (Key Maker)',
  'Interior Designer',
  'Handyman (General)',
  'Wallpaper Installation',
  'Sanitization & Disinfection',
  'Discard / Junk Removal'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = Array.from({ length: 2016 - 1950 }, (_, i) => 1950 + i).reverse(); // 2015 down to 1950

export default function RegisterStep2() {
  const router = useRouter();
  const { registerStep2, tempRegData } = useAuth();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    tempRegData.mainCategory 
      ? tempRegData.mainCategory.split(',').map((c: string) => c.trim()).filter(Boolean)
      : []
  );
  const [dob, setDob] = useState(tempRegData.dob || '');
  const [expertise, setExpertise] = useState(tempRegData.expertise || 'Residency');
  const [experience, setExperience] = useState(tempRegData.experience ? String(tempRegData.experience) : '');
  const [description, setDescription] = useState(tempRegData.serviceDescription || '');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(tempRegData.languages || []);

  // Experience Certificate upload (optional)
  const [experienceCertUri, setExperienceCertUri] = useState<string>('');
  const [experienceCertFile, setExperienceCertFile] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Modals visibility states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(6); // Default to July
  const [calendarYear, setCalendarYear] = useState(1995); // Default birth year
  const [calendarViewMode, setCalendarViewMode] = useState<'calendar' | 'year' | 'month'>('calendar');

  useEffect(() => {
    // Redirect back to step 1 if we don't have step 1 data
    if (!tempRegData.email) {
      Alert.alert('Session Expired', 'Please enter your personal details first.');
      router.replace('/register-step1');
      return;
    }
  }, [tempRegData.email]);

  useEffect(() => {
    if (dob) {
      const parts = dob.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          setCalendarMonth(month);
          setCalendarYear(year);
        }
      }
    }
  }, [dob]);

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.filter(c => c !== cat));
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleSelectDay = (day: number) => {
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(calendarMonth + 1).padStart(2, '0');
    setDob(`${formattedDay}/${formattedMonth}/${calendarYear}`);
    setShowDatePicker(false);
  };

  const handlePickExperienceCert = async () => {
    if ((Platform.OS as string) === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setExperienceCertFile(file);
          setExperienceCertUri(URL.createObjectURL(file));
        }
      };
      input.click();
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Permission to access media library is required.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
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
          setExperienceCertFile({ uri: fileUri, name: fileName, type: fileType });
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to select image.');
      }
    }
  };

  const handleNext = async () => {
    setSubmitError('');
    if (selectedCategories.length === 0) {
      setSubmitError('Please select at least one Category.');
      return;
    }
    if (!dob.trim() || !/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      setSubmitError('Please enter a valid Date of Birth (DD/MM/YYYY).');
      return;
    }
    if (!experience.trim() || isNaN(Number(experience))) {
      setSubmitError('Please enter valid Years of Experience.');
      return;
    }

    setSubmitting(true);
    const res = await registerStep2({
      mainCategory: selectedCategories.join(', '),
      dob: dob,
      experience: Number(experience),
      serviceDescription: description,
      languages: selectedLanguages,
      experienceCertUri: experienceCertUri || undefined,
      experienceCertFile: experienceCertFile || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      setSubmitError('');
      router.push('/register-step3');
    } else {
      setSubmitError(res.error || 'Failed to validate professional details.');
    }
  };

  const filteredCats = ALL_CATEGORIES.filter(c => 
    c.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ProgressBar currentStep={2} />
        </View>

        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          {submitError ? (
            <Text style={styles.errorBanner}>{submitError}</Text>
          ) : null}

          {/* Select main category */}
          <Text style={styles.label}>Select Category</Text>
          <TouchableOpacity 
            style={styles.dropdownTrigger} 
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownTriggerContent}>
              <Ionicons name="construct-outline" size={20} color="#9CA3AF" style={styles.dropdownIcon} />
              <Text style={selectedCategories.length > 0 ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder} numberOfLines={1}>
                {selectedCategories.length > 0 
                  ? selectedCategories.join(', ') 
                  : 'Select Categories'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          {selectedCategories.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              {selectedCategories.map(cat => (
                <View key={cat} style={styles.selectedTagChip}>
                  <Text style={styles.selectedTagText}>{cat}</Text>
                  <TouchableOpacity onPress={() => handleRemoveCategory(cat)} style={styles.removeTagBtn}>
                    <Ionicons name="close-circle" size={16} color="#0D9488" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Date of Birth Input (Not enterable, opens calendar) */}
          <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <View pointerEvents="none">
              <Input
                label="Date of Birth"
                placeholder="DD/MM/YYYY"
                iconName="calendar-outline"
                value={dob}
                editable={false}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Expertise Option</Text>
          <View style={styles.pickerContainer}>
            {['Residency', 'Commercial', 'Both'].map((opt) => (
              <TouchableOpacity 
                key={opt} 
                style={[styles.pickerItem, expertise === opt && styles.pickerItemActive]}
                onPress={() => setExpertise(opt)}
              >
                <Text style={[styles.pickerText, expertise === opt && styles.pickerTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Years of Experience"
            placeholder="e.g. 5"
            iconName="medal-outline"
            keyboardType="numeric"
            value={experience}
            onChangeText={setExperience}
          />

          {/* Experience Certificate Upload - Optional */}
          <Text style={styles.label}>
            Experience Certificate{' '}
            <Text style={styles.optionalTag}>(Optional)</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.uploadBtn,
              experienceCertUri ? styles.uploadBtnSelected : null,
            ]}
            onPress={handlePickExperienceCert}
            activeOpacity={0.8}
          >
            <Ionicons
              name={experienceCertUri ? 'checkmark-circle' : 'document-attach-outline'}
              size={20}
              color={experienceCertUri ? '#0D9488' : '#6B7280'}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.uploadBtnText, experienceCertUri ? styles.uploadBtnTextSelected : null]}>
              {experienceCertUri ? 'Certificate Selected ✓' : 'Upload Experience Certificate'}
            </Text>
          </TouchableOpacity>

          <Input
            label="Service Details (Description)"
            placeholder="Describe your services..."
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Languages Known</Text>
          <View style={styles.languagesContainer}>
            {STATIC_LANGUAGES.map((lang) => {
              const selected = selectedLanguages.includes(lang);
              return (
                <TouchableOpacity 
                  key={lang} 
                  style={[styles.langChip, selected && styles.langChipActive]}
                  onPress={() => toggleLanguage(lang)}
                >
                  <Text style={[styles.langChipText, selected && styles.langChipTextActive]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.nextBtn, submitting && styles.disabledBtn]} onPress={handleNext} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Categories Dropdown Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search categories..."
                placeholderTextColor="#9CA3AF"
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
              />
            </View>

            {/* Category List */}
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredCats.length === 0 ? (
                <Text style={styles.emptySearchText}>No categories found</Text>
              ) : (
                filteredCats.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.modalListItem, isSelected && styles.modalListItemActive]}
                      onPress={() => toggleCategory(cat)}
                    >
                      <Text style={[styles.modalListText, isSelected && styles.modalListTextActive]}>
                        {cat}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Done Button */}
            <TouchableOpacity 
              style={styles.modalDoneBtn}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalDoneText}>Done ({selectedCategories.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContent}>
            
            {/* Header / Selector controls */}
            <View style={styles.datePickerHeader}>
              {calendarViewMode === 'calendar' ? (
                <>
                  <TouchableOpacity onPress={handlePrevMonth}>
                    <Ionicons name="chevron-back" size={24} color="#0F2C59" />
                  </TouchableOpacity>
                  
                  <View style={styles.datePickerTitleRow}>
                    <TouchableOpacity onPress={() => setCalendarViewMode('month')}>
                      <Text style={styles.datePickerTitle}>{MONTHS[calendarMonth]}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setCalendarViewMode('year')}>
                      <Text style={styles.datePickerTitle}>{calendarYear}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleNextMonth}>
                    <Ionicons name="chevron-forward" size={24} color="#0F2C59" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.datePickerTitle}>
                    Select {calendarViewMode === 'year' ? 'Year' : 'Month'}
                  </Text>
                  <TouchableOpacity onPress={() => setCalendarViewMode('calendar')}>
                    <Text style={styles.backToCalText}>Back to Calendar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Render depending on view mode */}
            {calendarViewMode === 'calendar' && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, index) => (
                    <Text key={index} style={styles.weekdayText}>{d}</Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {/* Empty offsets */}
                  {Array.from({ length: getFirstDayOfMonth(calendarMonth, calendarYear) }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                  ))}
                  
                  {/* Day Cells */}
                  {Array.from({ length: getDaysInMonth(calendarMonth, calendarYear) }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = dob === `${String(day).padStart(2, '0')}/${String(calendarMonth + 1).padStart(2, '0')}/${calendarYear}`;
                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                        onPress={() => handleSelectDay(day)}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {calendarViewMode === 'year' && (
              <ScrollView style={styles.yearScroll} contentContainerStyle={styles.yearGrid} keyboardShouldPersistTaps="handled">
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearCell, calendarYear === y && styles.yearCellActive]}
                    onPress={() => {
                      setCalendarYear(y);
                      setCalendarViewMode('calendar');
                    }}
                  >
                    <Text style={[styles.yearText, calendarYear === y && styles.yearTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {calendarViewMode === 'month' && (
              <ScrollView style={styles.monthScroll} contentContainerStyle={styles.monthGrid} keyboardShouldPersistTaps="handled">
                {MONTHS.map((m, index) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthCell, calendarMonth === index && styles.monthCellActive]}
                    onPress={() => {
                      setCalendarMonth(index);
                      setCalendarViewMode('calendar');
                    }}
                  >
                    <Text style={[styles.monthText, calendarMonth === index && styles.monthTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
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
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  pickerItem: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F5F6FA',
  },
  pickerItemActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  pickerText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 6,
  },
  langChip: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F6FA',
  },
  langChipActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  langChipText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  langChipTextActive: {
    color: '#FFFFFF',
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
  optionalTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E8EC',
    borderRadius: 14,
    borderStyle: 'dashed',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  uploadBtnSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    borderStyle: 'solid',
  },
  uploadBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  uploadBtnTextSelected: {
    color: '#0D9488',
    fontWeight: '700',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownTextPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  dropdownTextSelected: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  selectedTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  selectedTagText: {
    color: '#0F2C59',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  removeTagBtn: {
    padding: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
  },
  closeModalBtn: {
    padding: 4,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    height: '100%',
  },
  modalList: {
    marginBottom: 16,
  },
  emptySearchText: {
    textAlign: 'center',
    color: '#6B7280',
    marginVertical: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  modalListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
  },
  modalListItemActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  modalListText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  modalListTextActive: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  modalDoneBtn: {
    backgroundColor: '#0F2C59',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  datePickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  datePickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C59',
    backgroundColor: '#F5F6FA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  backToCalText: {
    color: '#0D9488',
    fontWeight: '700',
    fontSize: 14,
  },
  weekdaysRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekdayText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 252,
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginBottom: 4,
  },
  dayCellSelected: {
    backgroundColor: '#0F2C59',
  },
  dayCellEmpty: {
    width: 36,
    height: 36,
  },
  dayText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  yearScroll: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 16,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  yearCell: {
    width: 70,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  yearCellActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  yearText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  yearTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthScroll: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 16,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  monthCell: {
    width: 85,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  monthCellActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  monthText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  monthTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
