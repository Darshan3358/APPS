import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

import { API_URL as LOCAL_API_URL } from '../config/api';

interface SavedWorker {
  _id: string;
  customerId: string;
  workerId: string;
  workerName: string;
  profession: string;
  rating: number;
}

export default function SavedWorkersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [savedWorkers, setSavedWorkers] = useState<SavedWorker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSavedWorkers();
    }
  }, [user]);

  const fetchSavedWorkers = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/users/${user.id}/saved-workers`);
      if (res.ok) {
        const data = await res.json();
        setSavedWorkers(data);
      }
    } catch (err) {
      console.error('Failed to fetch saved workers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = async (workerId: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/users/${user.id}/saved-workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Worker removed from saved list.');
        fetchSavedWorkers();
      } else {
        Alert.alert('Error', 'Failed to remove worker.');
      }
    } catch (err) {
      Alert.alert('Error', 'Connection error.');
    }
  };

  const handleBookPress = (worker: SavedWorker) => {
    router.push({
      pathname: '/(tabs)/book',
      params: { 
        selectedCategory: worker.profession,
        selectedWorkerId: worker.workerId
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Workers</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0F2C59" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={savedWorkers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.workerCard}>
              <View style={styles.workerLeft}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=80' }}
                  style={styles.workerAvatar}
                />
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{item.workerName}</Text>
                  <Text style={styles.workerProfession}>{item.profession}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '5.0'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.workerRight}>
                <TouchableOpacity 
                  style={styles.bookBtn}
                  onPress={() => handleBookPress(item)}
                >
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.removeBtn}
                  onPress={() => handleToggleSave(item.workerId)}
                >
                  <Ionicons name="bookmark" size={22} color="#0D9488" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Saved Workers</Text>
              <Text style={styles.emptySubtitle}>Workers you save will appear here for quick booking.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  workerInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  workerProfession: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  workerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookBtn: {
    backgroundColor: '#0F2C59',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
