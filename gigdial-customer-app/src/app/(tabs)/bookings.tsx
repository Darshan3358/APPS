import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Modal, TextInput, SafeAreaView, Image, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

import { API_URL as LOCAL_API_URL } from '../../config/api';

interface Booking {
  _id: string;
  customerId: string;
  customerName: string;
  workerId: string;
  workerName: string;
  workerPhoto?: string;
  serviceName: string;
  title?: string;
  schedule?: string;
  date: string;
  time: string;
  address: string;
  description: string;
  status: string;
  rating?: number;
  review?: string;
  completionOtp?: string;
  otpGenerated?: boolean;
  createdAt: number;
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

export default function BookingsScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = StatusBar.currentHeight || insets.top;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Contacted' | 'Completed' | 'Cancelled'>('All');
  const [loading, setLoading] = useState(true);

  // Detail Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Rating Modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchBookings();
    if (user?.id) {
      const interval = setInterval(() => {
        fetchBookings();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user, token]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to fetch customer bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const doCancel = async () => {
      try {
        const res = await fetch(`${LOCAL_API_URL}/bookings/update-status/${bookingId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'cancelled' }),
        });
        if (res.ok) {
          if (Platform.OS === 'web') {
            window.alert('Your booking request has been cancelled.');
          } else {
            Alert.alert('Booking Cancelled', 'Your booking request has been cancelled.');
          }
          setShowDetailModal(false);
          fetchBookings();
        } else {
          const data = await res.json().catch(() => ({}));
          const errMsg = data.error || 'Failed to cancel booking.';
          if (Platform.OS === 'web') {
            window.alert(errMsg);
          } else {
            Alert.alert('Error', errMsg);
          }
        }
      } catch (err) {
        if (Platform.OS === 'web') {
          window.alert('Network error while cancelling booking.');
        } else {
          Alert.alert('Error', 'Network error.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to cancel this booking request?');
      if (confirmed) {
        doCancel();
      }
    } else {
      Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking request?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: doCancel
        }
      ]);
    }
  };

  const handleRateBooking = async () => {
    if (!selectedBooking) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/bookings/${selectedBooking._id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          review: reviewText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Thank You', 'Your rating has been submitted successfully!');
        if (data.completionOtp) {
          setSelectedBooking({
            ...selectedBooking,
            rating,
            review: reviewText,
            completionOtp: data.completionOtp
          });
        } else {
          setShowDetailModal(false);
        }
        setReviewText('');
        fetchBookings();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit rating.');
      }
    } catch (err) {
      Alert.alert('Error', 'Connection error.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleResendOtp = async () => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/customer/bookings/${selectedBooking._id}/resend-otp`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('OTP Resent', 'A new job completion OTP has been generated successfully.');
        setSelectedBooking({
          ...selectedBooking,
          completionOtp: data.completionOtp
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to resend OTP.');
      }
    } catch (err) {
      Alert.alert('Error', 'Connection error.');
    }
  };

  const handleChatPress = (booking: Booking) => {
    setShowDetailModal(false);
    router.push({
      pathname: '/chat-detail',
      params: { 
        bookingId: booking._id,
        title: booking.serviceName || 'Chat'
      }
    });
  };

  const getFilteredBookings = () => {
    if (activeTab === 'All') return bookings;
    const tabLower = activeTab.toLowerCase();
    if (tabLower === 'contacted' || tabLower === 'active') {
      return bookings.filter(b => ['contacted', 'accepted', 'on_the_way', 'in_progress'].includes(b.status.toLowerCase()));
    }
    return bookings.filter(b => b.status.toLowerCase() === tabLower);
  };

  const openDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setRating(booking.rating || 5);
    setReviewText(booking.review || '');
    setShowDetailModal(true);
  };

  const getStatusBadgeStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending') {
      return { container: styles.statusPending, text: styles.statusTextPending, label: 'PENDING' };
    } else if (s === 'completed') {
      return { container: styles.statusCompleted, text: styles.statusTextCompleted, label: 'COMPLETED' };
    } else if (s === 'contacted' || s === 'accepted' || s === 'on_the_way' || s === 'in_progress') {
      return { container: styles.statusContacted, text: styles.statusTextContacted, label: 'ACTIVE' };
    } else {
      return { container: styles.statusCancelled, text: styles.statusTextCancelled, label: status.toUpperCase() };
    }
  };

  const tabBarHeight = 75;
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={22} color="#0F2C59" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['All', 'Pending', 'Contacted', 'Completed', 'Cancelled'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === tab && styles.tabButtonTextActive
            ]}>
              {tab === 'Contacted' ? 'Active' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F2C59" />
        </View>
      ) : (
        <FlatList
          data={getFilteredBookings()}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const badge = getStatusBadgeStyles(item.status);
            return (
              <View style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                  <Image 
                    source={{ uri: getProfilePhotoUri(item.workerPhoto, item.workerName) }} 
                    style={styles.cardAvatar}
                  />
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.serviceName}>{item.serviceName}</Text>
                    <Text style={styles.workerName}>Provider: {item.workerName}</Text>
                    <Text style={styles.dateText}>
                      <Ionicons name="calendar-outline" size={12} color="#6B7280" /> {item.date} at {item.time}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => openDetail(item)}>
                    <Text style={styles.viewBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, badge.container]}>
                    <Text style={[styles.statusText, badge.text]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.locationText} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color="#6B7280" /> {item.address}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Bookings Found</Text>
              <Text style={styles.emptySubtitle}>
                You haven't requested any services in this category yet.
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal Sheet */}
      {selectedBooking && (
        <Modal
          visible={showDetailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Booking Details</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={24} color="#0F2C59" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalWorkerCard}>
                  <Image 
                    source={{ uri: getProfilePhotoUri(selectedBooking.workerPhoto, selectedBooking.workerName) }} 
                    style={styles.modalAvatar}
                  />
                  <View>
                    <Text style={styles.modalWorkerName}>{selectedBooking.workerName}</Text>
                    <Text style={styles.modalStatusText}>Service: {selectedBooking.serviceName}</Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <Text style={styles.modalLabel}>Description</Text>
                <Text style={styles.modalVal}>{selectedBooking.description || 'No description provided.'}</Text>

                <Text style={styles.modalLabel}>Schedule</Text>
                <Text style={styles.modalVal}>{selectedBooking.date} at {selectedBooking.time}</Text>

                <Text style={styles.modalLabel}>Address</Text>
                <Text style={styles.modalVal}>{selectedBooking.address}</Text>

                <Text style={styles.modalLabel}>Status</Text>
                <View style={[styles.statusBadge, getStatusBadgeStyles(selectedBooking.status).container, { alignSelf: 'flex-start', marginBottom: 16, paddingHorizontal: 12 }]}>
                  <Text style={[styles.statusText, getStatusBadgeStyles(selectedBooking.status).text]}>
                    {getStatusBadgeStyles(selectedBooking.status).label}
                  </Text>
                </View>

                {/* Rating & Review Section (if completed or in progress) */}
                {(selectedBooking.status.toLowerCase() === 'completed' || selectedBooking.status.toLowerCase() === 'in_progress') && (
                  <View style={styles.modalDivider} />
                )}

                {(selectedBooking.status.toLowerCase() === 'completed' || selectedBooking.status.toLowerCase() === 'in_progress') && (
                  <View>
                    {!selectedBooking.rating ? (
                      <View style={styles.ratingSection}>
                        <Text style={styles.ratingTitle}>Rate this Service</Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                              <Ionicons 
                                name={rating >= star ? 'star' : 'star-outline'} 
                                size={28} 
                                color="#F59E0B" 
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.reviewInput}
                          placeholder="Write a review (optional)..."
                          placeholderTextColor="#9CA3AF"
                          value={reviewText}
                          onChangeText={setReviewText}
                          multiline
                        />
                        <TouchableOpacity 
                          style={[styles.submitRatingBtn, submittingReview && styles.disabledBtn]} 
                          onPress={handleRateBooking}
                          disabled={submittingReview}
                        >
                          {submittingReview ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.submitRatingText}>Submit Review</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.ratedContainer}>
                        <Text style={styles.modalLabel}>Your Rating</Text>
                        <View style={styles.ratedStarsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons 
                              key={star} 
                              name={selectedBooking.rating! >= star ? 'star' : 'star-outline'} 
                              size={16} 
                              color="#F59E0B" 
                            />
                          ))}
                        </View>
                        {selectedBooking.review ? (
                          <Text style={styles.ratedReviewText}>"{selectedBooking.review}"</Text>
                        ) : null}
                      </View>
                    )}

                    {/* Reveal OTP if Rated */}
                    {selectedBooking.rating && selectedBooking.completionOtp && (
                      <View style={styles.otpRevealContainer}>
                        <Text style={styles.otpTitle}>Job Completion OTP</Text>
                        <Text style={styles.otpHelperText}>Share this OTP with the worker to confirm job completion:</Text>
                        <View style={styles.otpBox}>
                          <Text style={styles.otpText}>{selectedBooking.completionOtp}</Text>
                        </View>
                        {selectedBooking.status.toLowerCase() === 'in_progress' && (
                          <TouchableOpacity 
                            style={styles.resendOtpBtn} 
                            onPress={handleResendOtp}
                          >
                            <Ionicons name="refresh-circle" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                            <Text style={styles.resendOtpText}>Resend OTP</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
                
                <View style={{ height: 40 }} />
              </ScrollView>

              {/* Modal footer actions */}
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {selectedBooking.status.toLowerCase() !== 'cancelled' && (
                  <TouchableOpacity style={styles.chatButton} onPress={() => handleChatPress(selectedBooking)}>
                    <Ionicons name="chatbubbles-outline" size={18} color="#0F2C59" />
                    <Text style={styles.chatBtnText}>Chat with Provider</Text>
                  </TouchableOpacity>
                )}

                {selectedBooking.status.toLowerCase() === 'pending' && (
                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => handleCancelBooking(selectedBooking._id)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel Booking Request</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E8EC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
  },
  notificationBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F6FA',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  tabButtonActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    padding: 16,
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
    marginBottom: 14,
  },
  cardAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  workerName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  viewBtn: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewBtnText: {
    color: '#0F2C59',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F6FA',
    paddingTop: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusContacted: {
    backgroundColor: '#EFF6FF',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextCompleted: {
    color: '#10B981',
  },
  statusTextContacted: {
    color: '#0F2C59',
  },
  statusTextCancelled: {
    color: '#EF4444',
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#E5E8EC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
  },
  modalBody: {
    padding: 20,
  },
  modalWorkerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#E5E8EC',
  },
  modalWorkerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalStatusText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F5F6FA',
    marginVertical: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalVal: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 16,
  },
  ratingSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  reviewInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 16,
    color: '#1A1A1A',
  },
  submitRatingBtn: {
    backgroundColor: '#0F2C59',
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitRatingText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  ratedContainer: {
    marginTop: 10,
  },
  ratedStarsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  ratedReviewText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#E5E8EC',
    gap: 12,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#0F2C59',
    borderRadius: 12,
    height: 50,
    backgroundColor: '#FFFFFF',
  },
  chatBtnText: {
    color: '#0F2C59',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: '#EF4444',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  otpRevealContainer: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
  },
  otpTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 6,
  },
  otpHelperText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  otpBox: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  otpText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C59',
    letterSpacing: 4,
  },
  resendOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    width: '100%',
  },
  resendOtpText: {
    color: '#0D9488',
    fontSize: 13,
    fontWeight: '700',
  },
});
