import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LeadData {
  id: string;
  title: string;
  customerName: string;
  customerPhoto?: string;
  address: string;
  distance?: string;
  date: string;
  time: string;
  serviceNeeded: string;
}

function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function categoryMatchesLead(workerCategoryString: string, leadTitle: string, leadDescription: string): boolean {
  if (!workerCategoryString || workerCategoryString.trim() === '' || workerCategoryString === 'All') return true;
  
  const workerCats = workerCategoryString.toLowerCase().split(',').map(c => c.trim()).filter(Boolean);
  const title = (leadTitle || '').toLowerCase();
  const desc = (leadDescription || '').toLowerCase();
  
  if (!title) return true;

  const keywordMap: Record<string, string[]> = {
    electrician: ['electric', 'wiring', 'light', 'switch', 'power', 'fan', 'ac', 'appliance', 'fuse', 'wire', 'board', 'house', 'clean', 'filter', 'install', 'repair'],
    plumber: ['plumb', 'leak', 'pipe', 'tap', 'drain', 'water', 'basin', 'shower', 'sink', 'toilet', 'repair', 'install'],
    carpenter: ['carpent', 'wood', 'door', 'lock', 'furniture', 'cabinet', 'chair', 'table', 'hinge', 'bed', 'repair', 'assembly'],
    painter: ['paint', 'wall', 'waterproof', 'putty', 'color', 'colour', 'primer', 'texture'],
    cleaner: ['clean', 'wash', 'sweep', 'dust', 'sofa', 'kitchen', 'vacuum', 'housekeep', 'filter', 'deep']
  };

  const isMatched = workerCats.some((cat) => {
    // 1. Direct substring match
    if (title.includes(cat) || desc.includes(cat) || cat.includes(title)) return true;
    
    // 2. Cross-match based on individual words in category name
    const catWords = cat.split(/\s+/).filter(w => w.length > 2 && w !== 'repair' && w !== 'service' && w !== 'services');
    if (catWords.length > 0 && catWords.some(word => title.includes(word) || desc.includes(word))) {
      return true;
    }

    // 3. Fallback to mapped keywords
    const keywords = keywordMap[cat];
    if (keywords) {
      return keywords.some(keyword => title.includes(keyword) || desc.includes(keyword));
    }
    
    return true;
  });

  return isMatched;
}

const globalSeenLeadIds = new Set<string>();
let isStorageLoaded = false;

function AppContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<{
    title: string;
    message: string;
    type?: string;
  } | null>(null);

  // New lead popup states
  const [newLeadModalVisible, setNewLeadModalVisible] = useState(false);
  const [activeLead, setActiveLead] = useState<LeadData | null>(null);

  const getProfilePhotoUri = (photo: string | undefined, fallbackName: string = 'Customer'): string => {
    if (!photo || photo.includes('default-avatar.png') || photo.includes('worker_ramesh.png')) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0D9488&color=fff&size=128`;
    }
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    const serverRoot = API_URL.replace('/api', '');
    const cleanPhoto = photo.startsWith('/') ? photo : `/${photo}`;
    return `${serverRoot}${cleanPhoto}`;
  };

  useEffect(() => {
    const userId = user?.id || (user as any)?._id;
    if (!user || !userId) return;

    const todayStr = getTodayDateString();
    const storageKey = `@seen_lead_ids_${userId}_${todayStr}`;

    const isLiveLeadForCurrentDay = (lead: any): boolean => {
      if (!lead) return false;
      const now = new Date();
      const tYyyy = now.getFullYear();
      const tMm = String(now.getMonth() + 1).padStart(2, '0');
      const tDd = String(now.getDate()).padStart(2, '0');
      const currentDayFormatted = `${tYyyy}-${tMm}-${tDd}`;

      // Check schedule text
      const sched = (lead.schedule || lead.date || '').toLowerCase();
      if (sched.includes('today') || sched.includes(currentDayFormatted)) return true;

      // Check creation timestamp (must be created today)
      if (lead.createdAt) {
        const created = new Date(lead.createdAt);
        const cYyyy = created.getFullYear();
        const cMm = String(created.getMonth() + 1).padStart(2, '0');
        const cDd = String(created.getDate()).padStart(2, '0');
        if (`${cYyyy}-${cMm}-${cDd}` === currentDayFormatted) return true;
      }
      return false;
    };

    const checkNewLeadsAndNotifications = async () => {
      try {
        // Ensure seen lead storage for today is loaded once BEFORE checking
        if (!isStorageLoaded) {
          try {
            const stored = await AsyncStorage.getItem(storageKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                parsed.forEach((id: string) => globalSeenLeadIds.add(id));
              }
            }
          } catch (e) {}
          isStorageLoaded = true;
        }

        const workerCategory = user.mainCategory || (user as any).category || '';
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/worker/notifications`, { headers });
        if (res.ok) {
          const notifications = await res.json();
          if (Array.isArray(notifications) && notifications.length > 0) {
            const latestLead = notifications.find((n: any) => {
              const leadId = n.bookingId || n.id || n._id || '';
              if (!leadId || globalSeenLeadIds.has(leadId)) return false;
              return n.type === 'new_lead' || (n.status || '').toLowerCase() === 'pending';
            });

            if (latestLead) {
              const leadId = latestLead.bookingId || latestLead.id || latestLead._id || '';
              globalSeenLeadIds.add(leadId);
              AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(globalSeenLeadIds))).catch(() => {});

              let schedDate = latestLead.date || 'Today';
              let schedTime = latestLead.time || '10:30 AM';

              setActiveLead({
                id: leadId,
                title: latestLead.title || 'Service Request',
                customerName: latestLead.customerName || 'Customer',
                customerPhoto: latestLead.customerPhoto || undefined,
                address: latestLead.address || 'Address not specified',
                distance: '2.5 km away',
                date: schedDate,
                time: schedTime,
                serviceNeeded: latestLead.title || 'Service Request'
              });
              setNewLeadModalVisible(true);
            }
          }
        }
      } catch (err) {
        // Silently ignore HTTP polling errors
      }
    };

    checkNewLeadsAndNotifications();
    const interval = setInterval(checkNewLeadsAndNotifications, 5000);

    return () => clearInterval(interval);
  }, [user, token]);

  const handleToastPress = () => {
    if (!activeToast) return;
    setActiveToast(null);
    router.push('/notifications');
  };

  const markLeadAsSeen = (leadId: string) => {
    if (!leadId) return;
    globalSeenLeadIds.add(leadId);
    const userId = user?.id || (user as any)?._id;
    if (userId) {
      const todayStr = getTodayDateString();
      const storageKey = `@seen_lead_ids_${userId}_${todayStr}`;
      AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(globalSeenLeadIds))).catch(() => {});
    }
  };

  const handleViewLead = () => {
    if (activeLead?.id) {
      markLeadAsSeen(activeLead.id);
    }
    setNewLeadModalVisible(false);
    router.push('/(tabs)/leads');
  };

  const handleDismissLead = () => {
    if (activeLead?.id) {
      markLeadAsSeen(activeLead.id);
    }
    setNewLeadModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register-step1" />
        <Stack.Screen name="register-step2" />
        <Stack.Screen name="register-step3" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat-detail" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="manage-categories" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
      </Stack>

      {/* Premium New Lead Popup Modal */}
      {newLeadModalVisible && activeLead && (
        <Modal
          visible={newLeadModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDismissLead}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.leadCardContainer}>
              
              {/* Outer Neon Glow Top Frame */}
              <View style={styles.glowTopFrame}>
                {/* Glowing Bell Icon Container */}
                <View style={styles.bellRingOuter}>
                  <View style={styles.bellRingInner}>
                    <Ionicons name="notifications" size={26} color="#0D9488" />
                  </View>
                </View>
                
                <Text style={styles.modalNewLeadTitle}>New Lead</Text>
                <Text style={styles.modalLeadCategory}>{activeLead.title}</Text>
              </View>

              {/* White Card Section */}
              <View style={styles.whiteCardBody}>
                
                {/* Customer Details Row */}
                <View style={styles.customerRow}>
                  <Image
                    source={{ uri: getProfilePhotoUri(activeLead.customerPhoto, activeLead.customerName) }}
                    style={styles.customerAvatar}
                  />
                  <View style={styles.customerMeta}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.customerName}>{activeLead.customerName}</Text>
                      <Ionicons name="checkmark-circle" size={15} color="#1E90FF" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.customerSubtitle}>Customer</Text>
                  </View>
                </View>

                {/* Location Block */}
                <View style={styles.infoBlockContainer}>
                  <View style={styles.pinIconBg}>
                    <Ionicons name="location" size={18} color="#1E90FF" />
                  </View>
                  <View style={styles.blockTextContent}>
                    <Text style={[styles.blockBoldTitle, { color: '#0F2C59', fontWeight: '700' }]} numberOfLines={2}>{activeLead.address}</Text>
                  </View>
                  <TouchableOpacity style={styles.navigateBtn}>
                    <Ionicons name="navigate" size={16} color="#1E90FF" />
                  </TouchableOpacity>
                </View>

                {/* Service Needed Block */}
                <View style={[styles.infoBlockContainer, { backgroundColor: '#EFF6FF' }]}>
                  <View style={[styles.pinIconBg, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="flash" size={18} color="#1E90FF" />
                  </View>
                  <View style={styles.blockTextContent}>
                    <Text style={[styles.blockBoldTitle, { color: '#0F2C59' }]}>Service Needed</Text>
                    <Text style={[styles.blockSubText, { fontWeight: '700', color: '#1E2937' }]}>{activeLead.serviceNeeded}</Text>
                  </View>
                </View>

                {/* Metadata Cards Row (Calendar & Clock, Budget omitted) */}
                <View style={styles.metadataCardsRow}>
                  <View style={styles.metaCardItem}>
                    <Ionicons name="calendar" size={16} color="#10B981" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.metaCardLabel}>Today</Text>
                      <Text style={styles.metaCardValue}>{activeLead.date}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.metaCardItem}>
                    <Ionicons name="time" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.metaCardLabel}>Time</Text>
                      <Text style={styles.metaCardValue}>{activeLead.time}</Text>
                    </View>
                  </View>
                </View>

                {/* Verified Customer Banner */}
                <View style={styles.verifiedBanner}>
                  <Ionicons name="shield-checkmark" size={18} color="#10B981" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifiedBannerTitle}>Verified Customer</Text>
                    <Text style={styles.verifiedBannerSub}>High Priority Lead</Text>
                  </View>
                  <Ionicons name="ribbon" size={20} color="#10B981" />
                </View>

                {/* Actions Buttons */}
                <TouchableOpacity style={styles.viewLeadBtn} onPress={handleViewLead}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.viewLeadBtnText}>VIEW</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dismissLeadBtn} onPress={handleDismissLead}>
                  <Ionicons name="close-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.dismissLeadBtnText}>DISMISS</Text>
                </TouchableOpacity>

              </View>

            </View>
          </View>
        </Modal>
      )}

      {activeToast && (
        <TouchableOpacity 
          style={styles.toast} 
          onPress={handleToastPress}
          activeOpacity={0.9}
        >
          <View style={styles.toastContent}>
            <Ionicons name="notifications" size={22} color="#3B5BFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{activeToast.title}</Text>
              <Text style={styles.toastMessage} numberOfLines={1}>{activeToast.message}</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveToast(null)}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E2A47',
  },
  toastMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  
  // New Lead Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  leadCardContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0A101D', // Dark theme background
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#0D9488', // Green glow matching border
    overflow: 'hidden',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  glowTopFrame: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  bellRingOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F2C59',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 12,
  },
  bellRingInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNewLeadTitle: {
    color: '#10B981', // Neon green label
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modalLeadCategory: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  whiteCardBody: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F6FA',
    borderWidth: 1.5,
    borderColor: '#EFF6FF',
  },
  customerMeta: {
    marginLeft: 12,
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C59',
  },
  customerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  infoBlockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  pinIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blockTextContent: {
    flex: 1,
  },
  blockBoldTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C59',
  },
  blockSubText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  navigateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metadataCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaCardItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 12,
    padding: 10,
  },
  metaCardLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaCardValue: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '700',
    marginTop: 2,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  verifiedBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  verifiedBannerSub: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  viewLeadBtn: {
    flexDirection: 'row',
    backgroundColor: '#0F2C59',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  viewLeadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dismissLeadBtn: {
    flexDirection: 'row',
    backgroundColor: '#0A101D',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissLeadBtnText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
