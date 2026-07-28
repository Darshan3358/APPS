import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, Image, ActivityIndicator, FlatList, Platform, Modal, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import * as Location from 'expo-location';

import { API_URL as LOCAL_API_URL } from '../../config/api';

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

interface Worker {
  id: string;
  name: string;
  profilePhoto?: string;
  profession: string;
  rating: number;
  reviewsCount: number;
  experience: string;
  location: string;
  availability: string;
  skills: string[];
  isOnline?: boolean;
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

export default function DashboardScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllProfessionals, setShowAllProfessionals] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>(user?.city || 'Ahmedabad');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const openLocationModal = () => {
    setLocationError(null);
    setCitySearch('');
    setLocationModalVisible(true);
  };

  const closeLocationModal = () => {
    setLocationError(null);
    setCitySearch('');
    setLocationModalVisible(false);
  };

  const detectRealLocation = async () => {
    setLocationError(null);
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission denied. Please enable location in Settings.');
        setDetectingLocation(false);
        return;
      }
      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      const city = place.city || place.district || place.subregion || place.region || 'Unknown';
      setSelectedCity(city);
      closeLocationModal();
    } catch (err) {
      setLocationError('GPS not available here. Please select a city below.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const filteredCities = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchWorkers();
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchWorkers();
      fetchUnreadCount();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/workers`);
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: Worker, b: Worker) => b.rating - a.rating);
        setWorkers(sorted);
      }
    } catch (err) {
      console.warn('Failed to fetch workers:', err);
    } finally {
      setLoading(false);
    }
  };

  const popularServices = [
    { name: 'Painting & Deco', icon: 'brush', color: '#FEE2E2', iconColor: '#EF4444', category: 'Painter' },
    { name: 'Lighting & Elec', icon: 'flash', color: '#FEF3C7', iconColor: '#F59E0B', category: 'Electrician' },
    { name: 'Plumbing', icon: 'water', color: '#EFF6FF', iconColor: '#3B82F6', category: 'Plumber' },
    { name: 'Furniture Repair', icon: 'hammer', color: '#FFF7ED', iconColor: '#F97316', category: 'Carpenter' },
    { name: 'Ghar Marammat', icon: 'construct', color: '#F3F4F6', iconColor: '#4B5563', category: 'Carpenter' },
    { name: 'Home Cleaning', icon: 'trash', color: '#F3E8FF', iconColor: '#A855F7', category: 'Cleaner' },
    { name: 'AC & Appliance', icon: 'snow', color: '#E0F2FE', iconColor: '#0EA5E9', category: 'Electrician' },
    { name: 'Pest Control', icon: 'bug', color: '#FFE4E6', iconColor: '#F43F5E', category: 'Cleaner' },
  ];

  const handleCategoryPress = (category: string) => {
    router.push({
      pathname: '/(tabs)/book',
      params: { selectedCategory: category }
    });
  };

  const handleWorkerPress = (worker: Worker) => {
    if (worker.isOnline === false) {
      showToast('This worker is currently offline and cannot be booked.', 'error');
      return;
    }
    router.push({
      pathname: '/(tabs)/book',
      params: { 
        selectedCategory: worker.profession,
        selectedWorkerId: worker.id
      }
    });
  };

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
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        
        {/* Location Picker Modal */}
        <Modal
          visible={locationModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeLocationModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeLocationModal}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              {/* Handle bar */}
              <View style={styles.sheetHandle} />

              <Text style={styles.modalTitle}>Select Location</Text>

              {/* GPS Button */}
              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={detectRealLocation}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="navigate" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.gpsBtnText}>
                  {detectingLocation ? 'Detecting...' : 'Use My Current Location'}
                </Text>
              </TouchableOpacity>

              {/* Inline error message */}
              {locationError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning-outline" size={15} color="#B45309" />
                  <Text style={styles.errorBannerText}>{locationError}</Text>
                </View>
              )}

              <Text style={styles.orText}>— or search a city —</Text>

              {/* Search */}
              <View style={styles.citySearchBar}>
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.citySearchInput}
                  placeholder="Search city..."
                  placeholderTextColor="#9CA3AF"
                  value={citySearch}
                  onChangeText={setCitySearch}
                  autoCorrect={false}
                />
              </View>

              {/* City List */}
              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item}
                style={styles.cityList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.cityItem,
                      selectedCity === item && styles.cityItemActive,
                    ]}
                    onPress={() => {
                      setSelectedCity(item);
                      setLocationModalVisible(false);
                      setCitySearch('');
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={selectedCity === item ? '#0F2C59' : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.cityItemText,
                        selectedCity === item && styles.cityItemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {selectedCity === item && (
                      <Ionicons name="checkmark" size={16} color="#0F2C59" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={openLocationModal}
          >
            <Ionicons name="location" size={20} color="#0F2C59" />
            <Text style={styles.locationText}>{selectedCity.toUpperCase()}</Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/chats')}>
              <Ionicons name="chatbubbles-outline" size={22} color="#0F2C59" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#0F2C59" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search services or professionals..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroSubTitle}>UP TO 20% OFF</Text>
            <Text style={styles.heroTitle}>On AC Repair Services</Text>
            <TouchableOpacity 
              style={styles.findBtn}
              onPress={() => handleCategoryPress('Electrician')}
            >
              <Text style={styles.findBtnText}>Book Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroImageContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=250' }}
              style={styles.heroImage}
            />
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Grid */}
        <View style={styles.gridContainer}>
          {popularServices.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.gridItem}
              onPress={() => handleCategoryPress(item.category)}
            >
              <View style={[styles.circleIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
              </View>
              <Text style={styles.gridItemText} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Rated Professionals Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Professionals</Text>
          <TouchableOpacity onPress={() => router.push('/all-professionals')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#0F2C59" style={{ marginVertical: 20 }} />
        ) : (
          <View>
            {/* First 5 workers */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {workers.slice(0, 5).map((worker) => (
                <TouchableOpacity
                  key={worker.id}
                  style={styles.workerCard}
                  onPress={() => handleWorkerPress(worker)}
                >
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{ uri: getProfilePhotoUri(worker.profilePhoto, worker.name) }}
                      style={styles.workerAvatar}
                    />
                    <View style={[styles.onlineBadge, { backgroundColor: (worker.isOnline === true || (worker as any).isOnline === 'true') ? '#10B981' : '#EF4444' }]} />
                  </View>
                  <Text style={styles.workerName} numberOfLines={1}>{worker.name}</Text>
                  <View style={styles.workerCategoryBadge}>
                    <Text style={styles.workerCategoryText}>{worker.profession}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.ratingText}>{worker.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewsText}>({worker.reviewsCount})</Text>
                  </View>
                  <Text style={styles.workerExp}>{worker.experience} exp</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* See More → navigates to full page */}
            {workers.length > 5 && (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => router.push('/all-professionals')}
              >
                <Text style={styles.seeMoreBtnText}>
                  See More ({workers.length - 5} more)
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#0F2C59" />
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2C59',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 20,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1A1A1A',
  },
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: '#0F2C59',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTextContainer: {
    flex: 1.2,
    marginRight: 10,
  },
  heroSubTitle: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 16,
  },
  findBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  findBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  heroImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
  },
  seeAllText: {
    color: '#0D9488',
    fontWeight: '700',
    fontSize: 13,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    width: '22%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  circleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemText: {
    fontSize: 10,
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 12,
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  horizontalScroll: {
    gap: 12,
    paddingRight: 20,
    paddingBottom: 12,
  },
  workerCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    alignItems: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  workerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E5E8EC',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  workerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  workerCategoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  workerCategoryText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewsText: {
    fontSize: 10,
    color: '#6B7280',
  },
  workerExp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E8EC',
    backgroundColor: '#FFFFFF',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  seeMoreBtnText: {
    color: '#0F2C59',
    fontWeight: '700',
    fontSize: 13,
  },
  // Location modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 16,
    textAlign: 'center',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F2C59',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  gpsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  orText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 14,
  },
  citySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    marginBottom: 10,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  cityList: {
    maxHeight: 320,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityItemActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
  },
  cityItemText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  cityItemTextActive: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
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
