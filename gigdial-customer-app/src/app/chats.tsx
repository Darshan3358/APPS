import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_URL as LOCAL_API_URL } from '../config/api';

interface ChatThread {
  bookingId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerPhoto?: string;
  lastMessage: string;
  timestamp: string;
  updatedAt: number;
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/${user.id}/chats`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      }
    } catch (err) {
      console.log('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user?.id]);

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

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchChats}>
          <Ionicons name="refresh" size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F2C59" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {threads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={56} color="#9CA3AF" />
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubText}>When you book a service, you can message providers here.</Text>
            </View>
          ) : (
            threads.map((thread) => (
              <TouchableOpacity 
                key={thread.bookingId} 
                style={styles.threadItem}
                onPress={() => router.push({
                  pathname: '/chat-detail',
                  params: { 
                    bookingId: thread.bookingId, 
                    partnerId: thread.workerId,
                    partnerName: thread.workerName 
                  }
                })}
              >
                {/* Avatar */}
                <Image 
                  source={{ uri: getProfilePhotoUri(thread.workerPhoto, thread.workerName) }}
                  style={styles.avatar}
                />

                <View style={styles.threadContent}>
                  <View style={styles.threadHeader}>
                    <Text style={styles.workerName}>{thread.workerName}</Text>
                    <Text style={styles.timestamp}>{thread.timestamp}</Text>
                  </View>
                  <Text style={styles.jobTitle} numberOfLines={1}>{thread.jobTitle}</Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>{thread.lastMessage}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  refreshBtn: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 120,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  threadContent: {
    flex: 1,
    marginLeft: 12,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  jobTitle: {
    fontSize: 13,
    color: '#0F2C59',
    fontWeight: '600',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: '#6B7280',
  },
});
