import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Platform, Modal, TextInput, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL as LOCAL_API_URL } from '../../config/api';

interface Booking {
  _id: string;
  title: string;
  description: string;
  address: string;
  schedule: string;
  price: number;
  status: string;
  customerId: string;
  workerId?: string;
  workerName?: string;
  customerName?: string;
  customerPhone?: string;
  rating?: number;
  review?: string;
}

function categoryMatchesLead(workerCategoryString: string, leadTitle: string, leadDescription: string): boolean {
  if (!workerCategoryString) return true;
  
  const workerCats = workerCategoryString.toLowerCase().split(',').map(c => c.trim()).filter(Boolean);
  const title = (leadTitle || '').toLowerCase();
  const desc = (leadDescription || '').toLowerCase();
  
  const keywordMap: Record<string, string[]> = {
    electrician: ['electric', 'wiring', 'light', 'switch', 'power', 'fan', 'ac', 'appliance', 'fuse', 'wire', 'board'],
    plumber: ['plumb', 'leak', 'pipe', 'tap', 'drain', 'water', 'basin', 'shower', 'sink', 'toilet'],
    carpenter: ['carpent', 'wood', 'door', 'lock', 'furniture', 'cabinet', 'chair', 'table', 'hinge', 'bed'],
    painter: ['paint', 'wall', 'waterproof', 'putty', 'color', 'colour', 'primer'],
    cleaner: ['clean', 'wash', 'sweep', 'dust', 'sofa', 'kitchen', 'vacuum', 'housekeep']
  };

  return workerCats.some((cat) => {
    if (title.includes(cat) || desc.includes(cat)) return true;
    const keywords = keywordMap[cat];
    if (keywords) {
      return keywords.some(keyword => title.includes(keyword) || desc.includes(keyword));
    }
    return false;
  });
}

type TabType = 'pending' | 'active' | 'completed' | 'cancelled';

export default function LeadsTab() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('error');

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [currentSelectedStatus, setCurrentSelectedStatus] = useState<string>('');

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      // Fetch subscription status
      const subRes = await fetch(`${LOCAL_API_URL}/worker/${user.id}/subscription`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscriptionActive(subData.isActive);
      }

      // 1. Fetch Pending Leads
      const pendRes = await fetch(`${LOCAL_API_URL}/bookings/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (pendRes.ok) {
        const pendData = await pendRes.json();
        const filtered = user.mainCategory 
          ? pendData.filter((b: any) => {
              if (b.workerId === user.id) return true;
              return categoryMatchesLead(user.mainCategory!, b.title, b.description);
            })
          : pendData;
        setPendingBookings(filtered);
      }

      // 2. Fetch Active & Completed Leads for worker
      const activeRes = await fetch(`${LOCAL_API_URL}/bookings/active/${user.id}`);
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveBookings(activeData);
      }
    } catch (err) {
      console.log('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const handleAcceptJob = async (bookingId: string) => {
    if (!user?.id) return;

    if (!subscriptionActive) {
      showToast('Subscription Required: You need an active subscription to accept leads.', 'error');
      setTimeout(() => {
        router.push('/(tabs)/subscription');
      }, 1500);
      return;
    }

    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/accept/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: user.id })
      });

      if (res.ok) {
        showToast('Job Accepted: Added to your Active list.', 'success');
        fetchData();
        setActiveTab('active');
      } else {
        const data = await res.json();
        if (res.status === 402 || data.error === 'SUBSCRIBER_REQUIRED') {
          showToast('Subscription Required: You need an active subscription to accept leads.', 'error');
          setTimeout(() => {
            router.push('/(tabs)/subscription');
          }, 1500);
        } else {
          showToast(data.error || 'Failed to accept job.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to connect to server.', 'error');
    }
  };

  const handleRejectJob = async (bookingId: string) => {
    const userId = user?.id || (user as any)?._id;
    setPendingBookings(prev => prev.filter(b => b._id !== bookingId));
    showToast('Lead Rejected', 'error');

    try {
      await fetch(`${LOCAL_API_URL}/bookings/reject/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: userId })
      });
      fetchData();
    } catch (err) {
      console.log('Error rejecting lead:', err);
    }
  };

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/update-status/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        showMessage('Error', data.error || 'Failed to update status.');
      }
    } catch (err: any) {
      showMessage('Error', err.message || 'Failed to connect to server.');
    }
  };

  const handleInitiateCompletion = async (bookingId: string) => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/generate-otp/${bookingId}`, {
        method: 'POST',
      });
      if (res.ok) {
        setSelectedBookingId(bookingId);
        setOtpCode('');
        setOtpModalVisible(true);
      } else {
        const data = await res.json();
        showMessage('Error', data.error || 'Failed to initiate job completion.');
      }
    } catch (err: any) {
      showMessage('Error', err.message || 'Connection error.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!selectedBookingId) return;
    setVerifyingOtp(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/verify-otp/${selectedBookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode })
      });

      if (res.ok) {
        setOtpModalVisible(false);
        if (Platform.OS === 'web') {
          alert('Job Completed! You have earned points for this service.');
        } else {
          Alert.alert('Job Completed', 'You have earned points for this service.');
        }
        fetchData();
        setActiveTab('completed');
      } else {
        const data = await res.json();
        showMessage('Error', data.error || 'Invalid OTP code.');
      }
    } catch (err: any) {
      showMessage('Error', err.message || 'Failed to verify OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const renderStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return '#D97706';
      case 'accepted': return '#0F2C59';
      case 'on_the_way': return '#0D9488';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getFilteredBookings = (): Booking[] => {
    if (activeTab === 'pending') {
      return pendingBookings;
    }
    if (activeTab === 'active') {
      return activeBookings.filter(b => ['accepted', 'on_the_way', 'in_progress'].includes(b.status));
    }
    if (activeTab === 'completed') {
      return activeBookings.filter(b => b.status === 'completed');
    }
    if (activeTab === 'cancelled') {
      return activeBookings.filter(b => b.status === 'cancelled');
    }
    return [];
  };

  const insets = useSafeAreaInsets();
  const tabBarHeight = 75; 
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  const currentList = getFilteredBookings();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Leads</Text>
        <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#0F2C59" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'pending' && styles.activeTabButton]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending ({pendingBookings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'active' && styles.activeTabButton]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
              Active ({activeBookings.filter(b => ['accepted', 'on_the_way', 'in_progress'].includes(b.status)).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Completed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'cancelled' && styles.activeTabButton]}
            onPress={() => setActiveTab('cancelled')}
          >
            <Text style={[styles.tabText, activeTab === 'cancelled' && styles.activeTabText]}>
              Cancelled
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F2C59" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]}>
          {currentList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No leads available in this category</Text>
            </View>
          ) : (
            currentList.map((booking) => {
              const statusColor = renderStatusBadgeColor(booking.status);
              return (
                <View key={booking._id} style={styles.leadCard}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedBooking(booking);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Card Title & Status Badge */}
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{booking.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: activeTab === 'pending' ? '#FEF3C7' : statusColor + '15' }]}>
                        <Text style={[styles.statusBadgeText, { color: activeTab === 'pending' ? '#D97706' : statusColor }]}>
                          {booking.status.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardDesc}>{booking.description}</Text>

                    {/* Booking details */}
                    <View style={styles.detailsBlock}>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={styles.detailText}>{booking.schedule || 'Flexible Schedule'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={styles.detailText} numberOfLines={1}>{booking.address}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Actions */}
                  {activeTab === 'pending' ? (
                    <View style={styles.btnRow}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectJob(booking._id)}>
                        <Text style={styles.rejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptJob(booking._id)}>
                        {!subscriptionActive && (
                          <Ionicons name="lock-closed" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.acceptText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  ) : activeTab === 'active' ? (
                    <View style={styles.activeActionsRow}>
                      <TouchableOpacity 
                        style={styles.chatBtn}
                        onPress={() => router.push({
                          pathname: '/chat-detail',
                          params: { bookingId: booking._id, title: booking.title }
                        })}
                      >
                        <Ionicons name="chatbox-outline" size={18} color="#0D9488" style={{ marginRight: 4 }} />
                        <Text style={styles.chatBtnText}>Chat</Text>
                      </TouchableOpacity>

                      {booking.status === 'accepted' && (
                        <TouchableOpacity 
                          style={styles.statusUpdateBtn} 
                          onPress={() => handleUpdateBookingStatus(booking._id, 'on_the_way')}
                        >
                          <Text style={styles.statusUpdateBtnText}>On The Way</Text>
                        </TouchableOpacity>
                      )}

                      {booking.status === 'on_the_way' && (
                        <TouchableOpacity 
                          style={styles.statusUpdateBtn} 
                          onPress={() => handleUpdateBookingStatus(booking._id, 'in_progress')}
                        >
                          <Text style={styles.statusUpdateBtnText}>Start Job</Text>
                        </TouchableOpacity>
                      )}

                      {booking.status === 'in_progress' && (
                        <TouchableOpacity 
                          style={[styles.statusUpdateBtn, { backgroundColor: '#0D9488' }]} 
                          onPress={() => handleInitiateCompletion(booking._id)}
                        >
                          <Text style={styles.statusUpdateBtnText}>Complete Job</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}

                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Lead Details Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.detailModalCard]}>
            <View style={styles.detailHeaderRow}>
              <Text style={styles.detailModalTitle}>Lead Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.detailScroll} 
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedBooking && (
                <>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValueText}>{selectedBooking.title}</Text>

                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValueText}>{selectedBooking.description || 'No description provided.'}</Text>

                  <Text style={styles.detailLabel}>Client Name</Text>
                  <Text style={styles.detailValueText}>{selectedBooking.customerName || 'Amit Sharma'}</Text>

                  <View style={styles.detailRowSplit}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Price / Budget</Text>
                      <Text style={styles.detailPriceText}>₹{selectedBooking.price || 1000}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View style={[styles.statusBadgeDetail, { backgroundColor: renderStatusBadgeColor(selectedBooking.status) + '15' }]}>
                        <Text style={[styles.statusBadgeTextDetail, { color: renderStatusBadgeColor(selectedBooking.status) }]}>
                          {selectedBooking.status.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.detailLabel}>Schedule</Text>
                  <View style={styles.detailIconRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text style={styles.detailValueTextSimple}>{selectedBooking.schedule || 'Flexible Schedule'}</Text>
                  </View>

                  <Text style={styles.detailLabel}>Address</Text>
                  <View style={styles.detailIconRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text style={styles.detailValueTextSimple}>{selectedBooking.address}</Text>
                  </View>

                  {/* Customer Review (Only if completed) */}
                  {selectedBooking.status === 'completed' && (
                    <View style={styles.reviewSectionContainer}>
                      <View style={styles.detailModalDivider} />
                      <Text style={styles.detailLabel}>Customer's Review</Text>
                      {selectedBooking.rating ? (
                        <View style={styles.reviewCard}>
                          <View style={styles.starsRowDetail}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons 
                                key={star} 
                                name={selectedBooking.rating! >= star ? 'star' : 'star-outline'} 
                                size={20} 
                                color="#F59E0B" 
                                style={{ marginRight: 4 }}
                              />
                            ))}
                            <Text style={styles.ratingNumberText}>({selectedBooking.rating}/5)</Text>
                          </View>
                          {selectedBooking.review ? (
                            <Text style={styles.reviewTextComment}>"{selectedBooking.review}"</Text>
                          ) : (
                            <Text style={styles.reviewTextCommentNoComment}>No written comment provided.</Text>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.noReviewText}>No rating or review submitted by customer yet.</Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeBtnFooter} 
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.closeBtnFooterText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* OTP verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <Text style={styles.modalSub}>Ask customer for job completion OTP</Text>
            
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
              value={otpCode}
              onChangeText={setOtpCode}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveStatusBtn, (otpCode.length !== 4 || verifyingOtp) && styles.disabledBtn]} 
                onPress={handleVerifyOtp}
                disabled={otpCode.length !== 4 || verifyingOtp}
              >
                <Text style={styles.saveStatusText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <Ionicons 
              name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'} 
              size={18} 
              color={toastType === 'success' ? '#10B981' : '#EF4444'} 
              style={{ marginRight: 8 }} 
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E8EC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E8EC',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  activeTabButton: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '500',
  },
  detailsBlock: {
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F2C59',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  statusUpdateBtn: {
    flex: 1,
    backgroundColor: '#0F2C59',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusUpdateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 320,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    letterSpacing: 8,
    color: '#0F2C59',
    backgroundColor: '#F5F6FA',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  cancelModalText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '700',
  },
  saveStatusBtn: {
    flex: 1.5,
    backgroundColor: '#0F2C59',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2C59',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    maxWidth: '95%',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  detailModalCard: {
    maxHeight: '85%',
    width: '95%',
    maxWidth: 450,
    alignItems: 'stretch',
    padding: 20,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EC',
    paddingBottom: 12,
    marginBottom: 16,
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C59',
  },
  closeModalBtn: {
    padding: 4,
  },
  detailScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  detailScrollContent: {
    paddingBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 12,
  },
  detailValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailValueTextSimple: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  detailRowSplit: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  detailPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
    backgroundColor: '#EEF2F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeDetail: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeTextDetail: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailModalDivider: {
    height: 1,
    backgroundColor: '#E5E8EC',
    marginVertical: 16,
  },
  reviewSectionContainer: {
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  starsRowDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 8,
  },
  reviewTextComment: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#78350F',
    lineHeight: 20,
    fontWeight: '500',
  },
  reviewTextCommentNoComment: {
    fontSize: 14,
    color: '#D97706',
    fontStyle: 'italic',
  },
  noReviewText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  closeBtnFooter: {
    backgroundColor: '#0F2C59',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnFooterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
