import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Image, StatusBar, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL as LOCAL_API_URL } from '../../config/api';

interface ChatThread {
  bookingId: string;
  jobTitle: string;
  customerName: string;
  customerPhone: string;
  customerPhoto?: string;
  lastMessage: string;
  timestamp: string;
  updatedAt: number;
}

export default function ChatsTab() {
  const { user } = useAuth();
  const router = useRouter();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const getProfilePhotoUri = (photo: string | undefined, fallbackName: string = 'User'): string => {
    if (!photo || photo.includes('default-avatar.png') || photo.includes('worker_ramesh.png')) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0D9488&color=fff&size=128`;
    }
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    const serverRoot = LOCAL_API_URL.replace('/api', '');
    const cleanPhoto = photo.startsWith('/') ? photo : `/${photo}`;
    return `${serverRoot}${cleanPhoto}`;
  };

  const fetchChats = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/worker/${user.id}/chats`);
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

    const interval = setInterval(() => {
      fetchChats();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : insets.top;
  const tabBarHeight = 75; 
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  const filteredThreads = threads.filter(t => 
    t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.safeContainer, { paddingTop: topPadding }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchChats}>
          <Ionicons name="refresh" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            placeholder="Search chats..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F2C59" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]}>
          {filteredThreads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={56} color="#9CA3AF" />
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubText}>When customers message you for booked jobs, they will appear here.</Text>
            </View>
          ) : (
            filteredThreads.map((thread) => (
              <TouchableOpacity 
                key={thread.bookingId} 
                style={styles.threadItem}
                onPress={() => router.push({
                  pathname: '/chat-detail',
                  params: { bookingId: thread.bookingId, title: thread.jobTitle }
                })}
              >
                {/* Avatar */}
                <Image 
                  source={{ uri: getProfilePhotoUri(thread.customerPhoto, thread.customerName) }}
                  style={styles.avatar}
                />

                <View style={styles.threadContent}>
                  <View style={styles.threadHeader}>
                    <Text style={styles.customerName}>{thread.customerName}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  refreshBtn: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  searchRow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EC',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F6FA',
    marginRight: 14,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  timestamp: {
    fontSize: 11,
    color: '#6B7280',
  },
  jobTitle: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
});
