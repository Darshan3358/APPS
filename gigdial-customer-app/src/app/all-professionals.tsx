import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, SafeAreaView, Image, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    const wProf = workerProf.toLowerCase();
    const target = cat.toLowerCase();
    const allSkills = (skills || []).map(s => s.toLowerCase()).join(' ');

    if (wProf.includes(target) || target.includes(wProf)) return true;
    if (allSkills.includes(target)) return true;

    if ((target.includes('plumb') || target.includes('water')) && (wProf.includes('plumb') || allSkills.includes('plumb'))) return true;
    if ((target.includes('electr') || target.includes('light')) && (wProf.includes('electr') || allSkills.includes('electr'))) return true;
    if ((target.includes('paint') || target.includes('deco')) && (wProf.includes('paint') || allSkills.includes('paint'))) return true;
    if ((target.includes('carpent') || target.includes('wood') || target.includes('furniture') || target.includes('marramat')) && (wProf.includes('carpent') || allSkills.includes('carpent'))) return true;
    if ((target.includes('clean') || target.includes('pest') || target.includes('housekeeping')) && (wProf.includes('clean') || allSkills.includes('clean'))) return true;
    if ((target.includes('ac') || target.includes('appliance')) && (wProf.includes('ac') || wProf.includes('electr') || allSkills.includes('ac'))) return true;

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

  const renderWorker = ({ item }: { item: Worker }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleBook(item)}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: getProfilePhotoUri(item.profilePhoto, item.name) }} style={styles.avatar} />
        <View style={[styles.onlineBadge, { backgroundColor: (item.isOnline === true || (item as any).isOnline === 'true') ? '#10B981' : '#EF4444' }]} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.workerName}>{item.name}</Text>
        <Text style={styles.workerProfession}>{item.profession}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          <Text style={styles.reviewsText}>({item.reviewsCount} reviews)</Text>
        </View>
        <Text style={styles.metaText}>
          {item.experience} exp  •  {item.location || 'India'}
        </Text>
      </View>
      <View style={styles.bookBtn}>
        <Text style={styles.bookBtnText}>Book</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F2C59" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Professionals</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
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

      {/* Active Selected Service Category Tag */}
      {selectedServiceCategory ? (
        <View style={styles.activeServiceBanner}>
          <Text style={styles.activeServiceText}>Service: {selectedServiceCategory}</Text>
          <TouchableOpacity onPress={() => setSelectedServiceCategory('')} style={styles.clearServiceBtn}>
            <Ionicons name="close-circle" size={16} color="#0F2C59" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Rating Filter */}
      <View style={styles.filterRow}>
        {STAR_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, minRating === f.value && styles.filterChipActive]}
            onPress={() => setMinRating(f.value)}
          >
            {f.value > 0 && <Ionicons name="star" size={12} color={minRating === f.value ? '#FFFFFF' : '#F59E0B'} style={{ marginRight: 2 }} />}
            <Text style={[styles.filterChipText, minRating === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E8EC',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 20,
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
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
    marginTop: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    marginLeft: 'auto',
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  workerProfession: {
    fontSize: 12,
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
    fontSize: 11,
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
    paddingVertical: 8,
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
  activeServiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  activeServiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginRight: 6,
  },
  clearServiceBtn: {
    padding: 2,
  },
});
