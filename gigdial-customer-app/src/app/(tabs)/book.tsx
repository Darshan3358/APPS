import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, ActivityIndicator, Alert, Image, Modal, FlatList, Platform, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

import { API_URL as LOCAL_API_URL } from '../../config/api';

const ALL_SERVICES_LIST = [
  'Painting and Decoration',
  'Lighting and Electrical',
  'Plumbing',
  'Furniture Repair and Assembly',
  'Ghar ki Marramat and Nirman',
  'Home Cleaning',
  'AC and Appliance Repair',
  'Pest Control',
  'Carpentry',
  'House Shifting',
  'Heavy Lifting',
  'Local Delivery',
  'Import-Export Support',
  'Vehicle Rental Assistance',
  'Courier Services',
  'Waiter and Catering',
  'Event Planning',
  'Photography',
  'Decoration',
  'Bartending',
  'Sound and DJ Services',
  'Laptop/Mobile Repair',
  'Smart Home Installation',
  'Network and Wi-Fi Support',
  'Digital Marketing',
  'Website Development',
  'App Installation and Support',
  'Tuition',
  'Business Guide',
  'Stock Analysis',
  'Career Counseling',
  'Language Training',
  'Skill Workshops',
  'Pet Grooming and Care',
  'Sustainable Gardening',
  'Elderly Care',
  'DIY Craft and Workshops',
  'Local Tour Guide',
  'Home-Based Meal Prep',
  'Personalized Gifts',
  'Fitness Coaching',
  'Home Organization',
  'Astrology/Numerology',
  'Content Writing',
  'Tailoring and Fashion Design'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM'
];

const DEFAULT_WORK_DETAILS: Record<string, { title: string; desc: string }> = {
  'Painting and Decoration': { title: 'Full House Painting', desc: 'Need professional painting for 3BHK flat interior walls.' },
  'Lighting and Electrical': { title: 'LED Light Repair', desc: 'Need to replace 4 ceiling spot lights and repair a faulty switchboard.' },
  'Plumbing': { title: 'Water Leakage Repair', desc: 'Bathroom tap is leaking continuously and water pressure is low.' },
  'Furniture Repair and Assembly': { title: 'Sofa Assembly', desc: 'Need to assemble a newly purchased 3-seater wooden sofa.' },
  'Ghar ki Marramat and Nirman': { title: 'Wall Patching', desc: 'Repair a small crack in the living room plaster wall.' },
  'Home Cleaning': { title: 'Deep Kitchen Cleaning', desc: 'Deep cleaning of kitchen chimney, cabinets, and tiles.' },
  'AC and Appliance Repair': { title: 'AC Filter Cleaning', desc: 'Split AC is not cooling properly, needs service and filter wash.' },
  'Pest Control': { title: 'Cockroach Pest Control', desc: 'Need pest control treatment for kitchen and bathrooms.' },
  'Carpentry': { title: 'Door Latch Repair', desc: 'Main door latch is jammed and needs alignment or replacement.' },
  'House Shifting': { title: '2BHK House Shifting', desc: 'Shift household items to a new apartment 5km away.' },
  'Heavy Lifting': { title: 'Wardrobe Relocation', desc: 'Need help moving a heavy wooden wardrobe to the first floor.' },
  'Local Delivery': { title: 'Package Pickup and Drop', desc: 'Deliver a box of clothes to a local courier office.' },
  'Import-Export Support': { title: 'Customs Documentation', desc: 'Need help preparing import clearance documents for goods.' },
  'Vehicle Rental Assistance': { title: 'Mini Truck Rental', desc: 'Need helper and mini truck to transport timber planks.' },
  'Courier Services': { title: 'Document Delivery', desc: 'Urgent document pick-up and hand delivery across town.' },
  'Waiter and Catering': { title: 'Buffet Counter Service', desc: 'Need 2 professional waiters for a private family dinner.' },
  'Event Planning': { title: 'Birthday Party Setup', desc: 'Plan and execute decorations for a child\'s 5th birthday.' },
  'Photography': { title: 'Wedding Photography', desc: 'Professional photographer needed for pre-wedding shoot.' },
  'Decoration': { title: 'Balloon Decoration', desc: 'Theme-based balloon decoration for anniversary party.' },
  'Bartending': { title: 'Cocktail Counter Setup', desc: 'Need 1 bartender to mix drinks for a small house party.' },
  'Sound and DJ Services': { title: 'Sound System Rental', desc: 'Rent speakers and mic setup for outdoor society function.' },
  'Laptop/Mobile Repair': { title: 'Screen Replacement', desc: 'iPhone 13 screen is cracked and touch response is broken.' },
  'Smart Home Installation': { title: 'Smart Door Lock Setup', desc: 'Install and configure a smart digital door lock.' },
  'Network and Wi-Fi Support': { title: 'Router Configuration', desc: 'Configure a new dual-band Wi-Fi router for home office.' },
  'Digital Marketing': { title: 'Social Media Ads Run', desc: 'Set up Google Ads campaign for a local retail store.' },
  'Website Development': { title: 'Business Landing Page', desc: 'Create a clean, responsive business website on WordPress.' },
  'App Installation and Support': { title: 'Smart TV App Setup', desc: 'Set up streaming apps and link accounts on smart TV.' },
  'Tuition': { title: 'Class 10 Math Tutor', desc: 'Need a math tutor for CBSE Class 10 board exam preparation.' },
  'Business Guide': { title: 'Business Setup and Audit', desc: 'Consultation to apply for a new business registration and audits.' },
  'Stock Analysis': { title: 'Portfolio Review', desc: 'Review existing stock portfolio and suggest rebalancing.' },
  'Career Counseling': { title: 'Resume Building', desc: 'Professional advice to optimize resume for IT roles.' },
  'Language Training': { title: 'English Speaking Practice', desc: 'One-on-one conversational English training for interviews.' },
  'Skill Workshops': { title: 'Robotics Workshop', desc: 'Conduct a basic DIY robotics workshop for school kids.' },
  'Pet Grooming and Care': { title: 'Dog Bath and Grooming', desc: 'Full grooming service including bath, hair trim, and nail clipping.' },
  'Sustainable Gardening': { title: 'Balcony Garden setup', desc: 'Set up pot plants and organic herb garden on flat balcony.' },
  'Elderly Care': { title: 'Daily Companion Visit', desc: 'Daily companion to assist elderly grandparent with walks and reading.' },
  'DIY Craft and Workshops': { title: 'Pottery Making Class', desc: 'Organize a weekend beginner pottery workshop.' },
  'Local Tour Guide': { title: 'City Heritage Walk', desc: 'Guided tour of historical monuments and local food joints.' },
  'Home-Based Meal Prep': { title: 'Weekly Lunch Prep', desc: 'Prepare healthy lunch meals for the upcoming work week.' },
  'Personalized Gifts': { title: 'Handmade Birthday Card', desc: 'Create a custom pop-up scrapbook card for a birthday.' },
  'Fitness Coaching': { title: 'Weight Loss Personal Trainer', desc: '3-week home workout plan with personal training sessions.' },
  'Home Organization': { title: 'Wardrobe Decluttering', desc: 'Help organize and tidy bedroom wardrobes and storage.' },
  'Astrology/Numerology': { title: 'Kundali Analysis', desc: 'Detailed horoscope reading and birth chart analysis.' },
  'Content Writing': { title: 'SEO Blog Post Writing', desc: 'Write a 1500-word SEO-friendly blog post for a travel blog.' },
  'Tailoring and Fashion Design': { title: 'Blouse Stitching', desc: 'Custom stitching of a designer saree blouse.' }
};

interface Worker {
  id: string;
  name: string;
  profession: string;
  rating: number;
  reviewsCount: number;
  experience: string;
  location: string;
  availability: string;
  skills: string[];
  profilePhoto?: string;
}

const getProfilePhotoUri = (photo: string | undefined, fallbackName: string = 'Provider'): string => {
  if (!photo || photo.includes('default-avatar.png') || photo.includes('worker_ramesh.png')) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0F2C59&color=fff&size=128`;
  }
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
    return photo;
  }
  const serverRoot = LOCAL_API_URL.replace('/api', '');
  const cleanPhoto = photo.startsWith('/') ? photo : `/${photo}`;
  return `${serverRoot}${cleanPhoto}`;
};

export default function BookScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Booking Wizard State
  const [step, setStep] = useState(1); // 1, 2, or 3

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };
  
  // Step 1 Form Fields
  const [category, setCategory] = useState('Electrician');
  const [workTitle, setWorkTitle] = useState('House Wiring');
  const [date, setDate] = useState('10 Jul 2026');
  const [time, setTime] = useState('10:00 AM');
  const [address, setAddress] = useState('Naroda, Ahmedabad');
  const [description, setDescription] = useState('I need to do new house wiring in 2BHK flat.');
  
  // Step 2 Worker Selection
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [categories, setCategories] = useState(['Electrician', 'Plumber', 'Carpenter', 'Painter', 'Cleaner']);

  // Category Selector Modal States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Date/Time Modal States
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const filteredServices = ALL_SERVICES_LIST.filter(srv =>
    srv.toLowerCase().includes(modalSearch.toLowerCase())
  );

  // Handle route params
  useEffect(() => {
    if (params.selectedCategory) {
      const selected = params.selectedCategory as string;
      setCategory(selected);
      const details = DEFAULT_WORK_DETAILS[selected];
      if (details) {
        setWorkTitle(details.title);
        setDescription(details.desc);
      }
      setCategories(prev => {
        if (!prev.includes(selected)) {
          return [...prev, selected];
        }
        return prev;
      });
    }
  }, [params.selectedCategory]);

  useEffect(() => {
    if (step === 2) {
      fetchWorkers();
    }
  }, [step, category]);

  useEffect(() => {
    if (workers.length > 0 && params.selectedWorkerId) {
      const match = workers.find(w => w.id === params.selectedWorkerId);
      if (match) setSelectedWorker(match);
    }
  }, [workers, params.selectedWorkerId]);

  const handleDateSelect = (day: number) => {
    const monthStr = MONTH_NAMES[currentMonth].substring(0, 3);
    const dayStr = String(day).padStart(2, '0');
    setDate(`${dayStr} ${monthStr} ${currentYear}`);
    setShowDatePickerModal(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/workers`);
      if (res.ok) {
        const data: Worker[] = await res.json();
        // Filter workers by selected category
        const filtered = data.filter(w => 
          w.profession.toLowerCase() === category.toLowerCase()
        );
        setWorkers(filtered.length > 0 ? filtered : data); // Fallback to all if none in category
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleStep1Continue = () => {
    if (!workTitle.trim() || !date.trim() || !time.trim() || !address.trim() || !description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields to continue.');
      return;
    }
    setStep(2);
  };

  const handleStep2Continue = () => {
    if (!selectedWorker) {
      Alert.alert('Select Professional', 'Please select a worker to continue.');
      return;
    }
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedWorker) return;
    setConfirming(true);

    const bookingPayload = {
      customerId: user.id,
      customerName: user.name,
      workerId: selectedWorker.id,
      workerName: selectedWorker.name,
      title: workTitle,
      serviceName: workTitle,
      schedule: `${date} at ${time}`,
      price: 1000,
      date: date,
      time: time,
      address: address,
      description: description,
      status: 'Pending',
    };

    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Booking request sent successfully!', 'success');
        if ((Platform.OS as string) === 'web') {
          setTimeout(() => {
            setStep(1);
            setSelectedWorker(null);
            router.push('/(tabs)/bookings');
          }, 1500);
        } else {
          Alert.alert('Booking Confirmed', 'Your booking request has been sent successfully!', [
            {
              text: 'View Bookings',
              onPress: () => {
                setStep(1);
                setSelectedWorker(null);
                router.push('/(tabs)/bookings');
              }
            }
          ]);
        }
      } else {
        showToast(data.error || 'Failed to create booking.', 'error');
        if ((Platform.OS as string) !== 'web') {
          Alert.alert('Error', data.error || 'Failed to create booking.');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Connection error.', 'error');
      if ((Platform.OS as string) !== 'web') {
        Alert.alert('Error', err.message || 'Connection error.');
      }
    } finally {
      setConfirming(false);
    }
  };

  // Helper variables for calendar days generation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  const insets = useSafeAreaInsets();
  const tabBarHeight = 75; // 65 height + 10 bottom spacing
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
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
        {step > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <Text style={styles.headerTitle}>Book Service</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {/* Step 1 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 1 ? styles.stepCircleActive : null, step > 1 ? styles.stepCircleDone : null]}>
            {step > 1 ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepNum, step >= 1 ? styles.stepNumActive : null]}>1</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, step >= 1 ? styles.stepLabelActive : null]}>Select Service</Text>
        </View>

        <View style={[styles.progressLine, step >= 2 ? styles.progressLineActive : null]} />

        {/* Step 2 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 2 ? styles.stepCircleActive : null, step > 2 ? styles.stepCircleDone : null]}>
            {step > 2 ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepNum, step >= 2 ? styles.stepNumActive : null]}>2</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, step >= 2 ? styles.stepLabelActive : null]}>Select Worker</Text>
        </View>

        <View style={[styles.progressLine, step >= 3 ? styles.progressLineActive : null]} />

        {/* Step 3 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 3 ? styles.stepCircleActive : null]}>
            <Text style={[styles.stepNum, step >= 3 ? styles.stepNumActive : null]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 3 ? styles.stepLabelActive : null]}>Confirm</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          // STEP 1 FORM
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Service Category</Text>
            <TouchableOpacity 
              style={styles.dropdownBtn}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.dropdownBtnText}>{category || 'Select Service Category'}</Text>
              <Ionicons name="chevron-down" size={20} color="#4B5563" />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Work Title</Text>
            <TextInput
              style={styles.textInput}
              value={workTitle}
              onChangeText={setWorkTitle}
              placeholder="e.g. House Wiring, Tap leak repair"
            />

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeCol}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.textInputIconBtn} 
                  onPress={() => setShowDatePickerModal(true)}
                >
                  <Text style={styles.textInputBtnText}>{date || 'Select Date'}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.dateTimeCol}>
                <Text style={styles.fieldLabel}>Time</Text>
                <TouchableOpacity 
                  style={styles.textInputIconBtn} 
                  onPress={() => setShowTimePickerModal(true)}
                >
                  <Text style={styles.textInputBtnText}>{time || 'Select Time'}</Text>
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Service Address</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter complete location details"
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe details of the job request"
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.actionBtn} onPress={handleStep1Continue}>
              <Text style={styles.actionBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          // STEP 2: SELECT WORKER
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Select Available Professional</Text>

            {loadingWorkers ? (
              <ActivityIndicator size="large" color="#0F2C59" style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.workersList}>
                {workers.map((worker) => {
                  const isSelected = selectedWorker?.id === worker.id;
                  return (
                    <TouchableOpacity 
                      key={worker.id}
                      style={[styles.workerCard, isSelected && styles.workerCardSelected]}
                      onPress={() => setSelectedWorker(worker)}
                    >
                      <View style={styles.workerLeft}>
                        <Image
                          source={{ uri: getProfilePhotoUri(worker.profilePhoto, worker.name) }}
                          style={styles.workerAvatar}
                        />
                        <View style={styles.workerInfo}>
                          <Text style={styles.workerName}>{worker.name}</Text>
                          <Text style={styles.workerExp}>{worker.experience || '3 Years Experience'}</Text>
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <Text style={styles.ratingText}>{worker.rating?.toFixed(1) || '4.9'}</Text>
                            <Text style={styles.reviewsText}>({worker.reviewsCount || 10} Reviews)</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={styles.actionBtn} onPress={handleStep2Continue}>
              <Text style={styles.actionBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && selectedWorker && (
          // STEP 3: CONFIRM SUMMARY
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Confirm Booking Details</Text>

            <View style={styles.summaryCard}>
              <View style={styles.workerHeader}>
                <Image
                  source={{ uri: getProfilePhotoUri(selectedWorker.profilePhoto, selectedWorker.name) }}
                  style={styles.summaryAvatar}
                />
                <View style={styles.workerMeta}>
                  <Text style={styles.summaryWorkerName}>{selectedWorker.name}</Text>
                  <Text style={styles.summaryWorkerProfession}>{selectedWorker.profession}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryDetailRow}>
                <Text style={styles.detailLabel}>Work Type</Text>
                <Text style={styles.detailVal}>{workTitle}</Text>
              </View>

              <View style={styles.summaryDetailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailVal}>{date}</Text>
              </View>

              <View style={styles.summaryDetailRow}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailVal}>{time}</Text>
              </View>

              <View style={styles.summaryDetailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailVal}>{address}</Text>
              </View>

              <View style={styles.summaryDetailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailVal}>{description}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, confirming && styles.disabledBtn]} 
              onPress={handleConfirmBooking}
              disabled={confirming}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Category Dropdown Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          />
          <View style={styles.modalContent}>
            {/* Modal Drag Indicator */}
            <View style={styles.dragIndicator} />
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Service Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.modalSearchIcon} />
              <TextInput
                placeholder="Search 45+ services..."
                placeholderTextColor="#9CA3AF"
                style={styles.modalSearchInput}
                value={modalSearch}
                onChangeText={setModalSearch}
              />
            </View>

            {/* List of Services */}
            <FlatList
              data={filteredServices}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalListItem,
                    category === item && styles.modalListItemSelected
                  ]}
                  onPress={() => {
                    setCategory(item);
                    const details = DEFAULT_WORK_DETAILS[item];
                    if (details) {
                      setWorkTitle(details.title);
                      setDescription(details.desc);
                    }
                    setShowCategoryModal(false);
                    setModalSearch('');
                  }}
                >
                  <Text style={[
                    styles.modalListItemText,
                    category === item && styles.modalListItemTextSelected
                  ]}>
                    {item}
                  </Text>
                  {category === item && (
                    <Ionicons name="checkmark" size={20} color="#0F2C59" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDatePickerModal(false)}
          />
          <View style={[styles.modalContent, { height: '60%' }]}>
            <View style={styles.dragIndicator} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigation Header */}
            <View style={styles.calendarNavHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrow}>
                <Ionicons name="chevron-back" size={22} color="#0F2C59" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrow}>
                <Ionicons name="chevron-forward" size={22} color="#0F2C59" />
              </TouchableOpacity>
            </View>

            {/* Week Days Header Row */}
            <View style={styles.weekDaysRow}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.calendarGrid}>
                {calendarCells.map((day, cellIdx) => {
                  if (day === null) {
                    return <View key={`empty-${cellIdx}`} style={styles.calendarCellEmpty} />;
                  }

                  const formattedMonthStr = MONTH_NAMES[currentMonth].substring(0, 3);
                  const formattedDayStr = String(day).padStart(2, '0');
                  const cellDateStr = `${formattedDayStr} ${formattedMonthStr} ${currentYear}`;
                  const isSelected = date === cellDateStr;

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.calendarCell,
                        isSelected && styles.calendarCellSelected
                      ]}
                      onPress={() => handleDateSelect(day)}
                    >
                      <Text style={[
                        styles.calendarCellText,
                        isSelected && styles.calendarCellTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowTimePickerModal(false)}
          />
          <View style={[styles.modalContent, { height: '55%' }]}>
            <View style={styles.dragIndicator} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Booking Time</Text>
              <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.timeSlotsGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = time === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeSlotCard,
                        isSelected && styles.timeSlotCardSelected
                      ]}
                      onPress={() => {
                        setTime(slot);
                        setShowTimePickerModal(false);
                      }}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotTextSelected
                      ]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2C59',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: {
    alignItems: 'center',
    width: 80,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    borderColor: '#0F2C59',
    backgroundColor: '#0F2C59',
  },
  stepCircleDone: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#0F2C59',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  progressLineActive: {
    backgroundColor: '#0F2C59',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  categoryBtnSelected: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  categoryBtnText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  categoryBtnTextSelected: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    height: 48,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeCol: {
    flex: 1,
  },
  inputIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 16,
  },
  textInputWithIcon: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    height: 48,
    paddingLeft: 12,
    paddingRight: 40,
    fontSize: 14,
    color: '#1F2937',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  actionBtn: {
    backgroundColor: '#0F2C59',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F2C59',
    marginBottom: 16,
  },
  workersList: {
    gap: 12,
    marginBottom: 20,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  workerCardSelected: {
    borderColor: '#0F2C59',
    backgroundColor: '#EFF6FF',
  },
  workerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  workerInfo: {
    justifyContent: 'center',
  },
  workerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  workerExp: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  reviewsText: {
    fontSize: 10,
    color: '#6B7280',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#0F2C59',
    backgroundColor: '#0F2C59',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 20,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  workerMeta: {
    justifyContent: 'center',
  },
  summaryWorkerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  summaryWorkerProfession: {
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  summaryDetailRow: {
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailVal: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    lineHeight: 20,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    height: 48,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  dropdownBtnText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  modalSearchIcon: {
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1F2937',
  },
  modalList: {
    flex: 1,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalListItemSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  modalListItemText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  modalListItemTextSelected: {
    color: '#0F2C59',
    fontWeight: 'bold',
  },
  textInputIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  textInputBtnText: {
    fontSize: 14,
    color: '#1F2937',
  },
  calendarNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navArrow: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#9CA3AF',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  calendarCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 20,
  },
  calendarCellSelected: {
    backgroundColor: '#0F2C59',
  },
  calendarCellEmpty: {
    width: 40,
    height: 40,
  },
  calendarCellText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  calendarCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeSlotCard: {
    width: '47%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSlotCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0F2C59',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#0F2C59',
    fontWeight: 'bold',
  },
  toastContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
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
