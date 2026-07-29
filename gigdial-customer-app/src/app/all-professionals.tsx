import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, SafeAreaView, Image, ActivityIndicator, StatusBar,
  Platform, ScrollView, useWindowDimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL as LOCAL_API_URL } from '../config/api';

interface Worker {
  id: string;
  name: string;
  profilePhoto?: string;
  profession: string;
  rating: number;
  reviewsCount: number;
  experience: string;
  location: string;
  skills: string[];
  isOnline?: boolean;
}

const getProfilePhotoUri = (photo: string | undefined, fallbackName: string = 'Professional'): string => {
  if (!photo || photo.includes('default-avatar.png') || photo.includes('worker_ramesh.png')) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0F2C59&color=fff&size=128`;
  }
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) return photo;
  const serverRoot = LOCAL_API_URL.replace('/api', '');
  const cleanPhoto = photo.startsWith('/') ? photo : `/${photo}`;
  return `${serverRoot}${cleanPhoto}`;
};

const STAR_FILTERS = [
  { label: 'All', value: 0 },
  { label: '4.5+', value: 4.5 },
  { label: '4.0+', value: 4.0 },
  { label: '3.5+', value: 3.5 },
];

export default function AllProfessionalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ category?: string; service?: string; selectedCategory?: string }>();
  
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>(
    params.category || params.service || params.selectedCategory || ''
  );
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/workers`);
      if (res.ok) {
        const data = await res.json();
        setWorkers(data.sort((a: Worker, b: Worker) => b.rating - a.rating));
      }
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    } finally {
      setLoading(false);
    }
  };

  const isServiceMatch = (workerProf: string = '', cat: string = '', skills: string[] = []) => {
    if (!cat) return true;
    const wProf = (workerProf || '').toLowerCase();
    const target = (cat || '').toLowerCase();
    const allSkills = (skills || []).map(s => String(s).toLowerCase()).join(' ');
    const combined = `${wProf} ${allSkills}`;

    if (wProf.includes(target) || target.includes(wProf)) return true;
    if (allSkills.includes(target) || target.includes(allSkills)) return true;

    if (target.includes('plumb') || target.includes('water')) {
      return combined.includes('plumb') || combined.includes('water') || combined.includes('tap') || combined.includes('leak') || combined.includes('drain');
    }
    if (target.includes('electr') || target.includes('light')) {
      return combined.includes('electr') || combined.includes('light') || combined.includes('wire') || combined.includes('switch');
    }
    if (target.includes('paint') || target.includes('deco')) {
      return combined.includes('paint') || combined.includes('deco') || combined.includes('wall') || combined.includes('putty');
    }
    if (target.includes('carpent') || target.includes('wood') || target.includes('furniture') || target.includes('marramat')) {
      return combined.includes('carpent') || combined.includes('wood') || combined.includes('furniture') || combined.includes('marramat') || combined.includes('door');
    }
    if (target.includes('clean') || target.includes('pest') || target.includes('housekeeping')) {
      return combined.includes('clean') || combined.includes('pest') || combined.includes('wash') || combined.includes('housekeeping');
    }
    if (target.includes('ac') || target.includes('appliance')) {
      return combined.includes('ac') || combined.includes('appliance') || combined.includes('cool') || combined.includes('electr');
    }

    return false;
  };

  const filtered = workers.filter((w) => {
    const matchCategory = isServiceMatch(w.profession, selectedServiceCategory, w.skills);
    const matchSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.profession.toLowerCase().includes(search.toLowerCase());
    const matchRating = w.rating >= minRating;
    return matchCategory && matchSearch && matchRating;
  });

  const handleBook = (worker: Worker) => {
    if (worker.isOnline === false) {
      showToast('This worker is currently offline and cannot be booked.', 'error');
      return;
    }
    router.push({
      pathname: '/(tabs)/book',
      params: { selectedCategory: worker.profession, selectedWorkerId: worker.id },
    });
  };

  const topPadding = Math.max(insets.top + (Platform.OS === 'android' ? 12 : 8), 24);

  const renderWorker = ({ item }: { item: Worker }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleBook(item)} activeOpacity={0.88}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: getProfilePhotoUri(item.profilePhoto, item.name) }} style={styles.avatar} />
        <View style={[styles.onlineBadge, { backgroundColor: (item.isOnline === true || (item as any).isOnline === 'true') ? '#10B981' : '#EF4444' }]} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.workerName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.workerProfession} numberOfLines={1}>{item.profession}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          <Text style={styles.reviewsText}>({item.reviewsCount} reviews)</Text>
        </View>
        <Text style={styles.metaText} numberOfLines={2}>
          {item.experience} exp  •  {item.location || 'India'}
        </Text>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(item)}>
        <Text style={styles.bookBtnText}>Book</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {toast && (
        <View style={[styles.toastContainer, { top: topPadding + 60 }, toast.type === 'error' && styles.toastError]}>
          <Ionicons 
            name={toast.type === 'success' ? "checkmark-circle" : "alert-circle"} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Main Container with Desktop/Tablet Max-Width Constraints */}
      <View style={[styles.container, windowWidth > 800 && styles.desktopContainer]}>
        
        {/* Header with Safe Area Handling */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={20} color="#0F2C59" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Professionals</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or profession..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Selected Service Category Tag */}
        {selectedServiceCategory ? (
          <View style={styles.serviceBannerContainer}>
            <View style={styles.activeServiceBanner}>
              <Text style={styles.activeServiceText} numberOfLines={1}>
                Service: {selectedServiceCategory}
              </Text>
              <TouchableOpacity onPress={() => setSelectedServiceCategory('')} style={styles.clearServiceBtn}>
                <Ionicons name="close-circle" size={16} color="#0F2C59" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Rating Filter Row with Horizontal Scroll for Small Screens */}
        <View style={styles.filterSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {STAR_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, minRating === f.value && styles.filterChipActive]}
                onPress={() => setMinRating(f.value)}
              >
                {f.value > 0 && <Ionicons name="star" size={12} color={minRating === f.value ? '#FFFFFF' : '#F59E0B'} style={{ marginRight: 3 }} />}
                <Text style={[styles.filterChipText, minRating === f.value && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.countText}>{filtered.length} found</Text>
        </View>

        {/* Worker List */}
        {loading ? (
          <ActivityIndicator size="large" color="#0F2C59" style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={52} color="#D1D5DB" />
            <Text style={styles.emptyText}>No professionals found</Text>
            <Text style={styles.emptySubText}>Try a different search or filter</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderWorker}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  desktopContainer: {
    maxWidth: 840,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E8EC',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  serviceBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  activeServiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    maxWidth: '100%',
  },
  activeServiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginRight: 6,
    flexShrink: 1,
  },
  clearServiceBtn: {
    padding: 2,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
    marginTop: 2,
  },
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  countText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginLeft: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#E5E8EC',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
    paddingRight: 8,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  workerProfession: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewsText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  bookBtn: {
    backgroundColor: '#0F2C59',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C59',
    marginTop: 14,
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
  },
  toastContainer: {
    position: 'absolute',
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
