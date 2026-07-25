import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Platform, StatusBar, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { API_URL as LOCAL_API_URL, PACKAGES_URL } from '../../config/api';

interface SubscriptionData {
  plan: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  remainingDays: number;
}

interface RequestHistoryItem {
  _id: string;
  plan: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminNotes?: string;
  requestedAt?: string;
  createdAt?: string;
}

export default function SubscriptionTab() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [subData, setSubData] = useState<SubscriptionData>({
    plan: 'none',
    isActive: false,
    startDate: null,
    endDate: null,
    remainingDays: 0,
  });
  const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const fetchSubscription = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/worker/${user.id}/subscription`);
      if (res.ok) {
        const data = await res.json();
        setSubData(data);
      }
    } catch (err) {
      console.log('Error fetching subscription:', err);
    }
  };

  const fetchRequestHistory = async () => {
    if (!token || !user?.id) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/subscription/requests/worker/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequestHistory(data);
        const pending = data.some((item: RequestHistoryItem) => item.status === 'pending');
        setHasPendingRequest(pending);
      }
    } catch (err) {
      console.log('Error fetching request history:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSubscription(), fetchRequestHistory()]);
      setLoading(false);
    };
    init();
  }, [user?.id, token]);

  useEffect(() => {
    if (!user?.id || !token) return;
    const socket = io(LOCAL_API_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join_user', user.id);
    });

    socket.on('subscription_updated', (data: any) => {
      fetchSubscription();
      fetchRequestHistory();
      Alert.alert(
        data.status === 'approved' ? 'Subscription Approved 🎉' : 'Subscription Update',
        data.message || 'Your membership status has been updated!'
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, token]);

  const handleBuySubscription = async () => {
    try {
      if (Platform.OS === 'web') {
        window.location.href = PACKAGES_URL;
      } else {
        await WebBrowser.openBrowserAsync(PACKAGES_URL);
      }
    } catch (err: any) {
      Linking.openURL(PACKAGES_URL).catch(() => {
        Alert.alert('Error', 'Could not open website packages page.');
      });
    }
  };

  const planFeatures = [
    'Unlimited Leads View',
    'Top Ranking & Higher Visibility',
    'Featured Profile Badge',
    'Priority Support',
    'Dedicated Business Account',
  ];

  const insets = useSafeAreaInsets();
  const tabBarHeight = 75;
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Subscription</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#0F2C59" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* Overview Card */}
            <Text style={styles.sectionTitle}>Current Membership</Text>
            <View style={styles.overviewCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.planName}>{subData.isActive ? 'GigDial Pro' : 'No Active Plan'}</Text>
                <View style={[styles.statusBadge, subData.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                  <Text style={[styles.statusBadgeText, subData.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                    {subData.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Price</Text>
                <Text style={styles.metaValue}>{subData.isActive ? '₹499 / Month' : '₹0'}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Remaining Days</Text>
                <Text style={styles.metaValue}>{subData.remainingDays} Days</Text>
              </View>
            </View>

            {/* Choose Plan (if inactive) */}
            {!subData.isActive && (
              <>
                <Text style={styles.sectionTitle}>Upgrade to Pro</Text>
                <View style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planCardTitle}>GigDial Pro Membership</Text>
                    <Text style={styles.planCardPrice}>₹499 / Month</Text>
                  </View>

                  <View style={styles.featuresList}>
                    {planFeatures.map((feat) => (
                      <View key={feat} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#0D9488" style={{ marginRight: 8 }} />
                        <Text style={styles.featureText}>{feat}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.buyBtn} onPress={handleBuySubscription}>
                    <Ionicons name="wallet-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.buyBtnText}>Upgrade Now</Text>
                  </TouchableOpacity>

                  <Text style={styles.secureText}>
                    🔒 Secure Single Sign-On Web Payment
                  </Text>
                </View>
              </>
            )}

            {/* Pending Verification Banner */}
            {!subData.isActive && hasPendingRequest && (
              <View style={styles.pendingCard}>
                <Ionicons name="time-outline" size={32} color="#D97706" style={{ marginBottom: 8 }} />
                <Text style={styles.pendingTitle}>Upgrade Verification Pending</Text>
                <Text style={styles.pendingDesc}>
                  Your UPI transaction is being verified manually by the admin. Your Pro upgrade will activate automatically once approved.
                </Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchSubscription}>
                  <Text style={styles.refreshBtnText}>Refresh Status</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Request History */}
            {requestHistory.length > 0 && (
              <View style={styles.historyContainer}>
                <Text style={styles.sectionTitle}>Request History</Text>
                {requestHistory.map((item) => (
                  <View key={item._id} style={styles.historyCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.historyTitle}>Pro Subscription</Text>
                      <View style={[
                        styles.historyBadge,
                        item.status === 'approved' ? styles.badgeApproved :
                        item.status === 'rejected' ? styles.badgeRejected : styles.badgePending
                      ]}>
                        <Text style={[
                          styles.historyBadgeText,
                          item.status === 'approved' ? styles.badgeTextApproved :
                          item.status === 'rejected' ? styles.badgeTextRejected : styles.badgeTextPending
                        ]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.historyMeta}>TXID: {item.transactionId}</Text>
                    <Text style={styles.historyMeta}>Amount: ₹{item.amount}</Text>
                    <Text style={styles.historyMeta}>
                      Requested: {item.requestedAt || item.createdAt ? new Date(item.requestedAt || item.createdAt!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </Text>

                    {item.adminNotes ? (
                      <View style={styles.adminNotesBlock}>
                        <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
                        <Text style={styles.adminNotesText}>{item.adminNotes}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EC',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 16,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2C59',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#E6F4EA',
  },
  statusBadgeInactive: {
    backgroundColor: '#FCE8E6',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusBadgeTextActive: {
    color: '#0D9488',
  },
  statusBadgeTextInactive: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F6FA',
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D9488',
  },
  planCardPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  featuresList: {
    marginBottom: 20,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  buyBtn: {
    backgroundColor: '#0D9488', // Accent Green
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secureText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 11,
    marginTop: 12,
    fontWeight: '500',
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#B45309',
    marginBottom: 4,
  },
  pendingDesc: {
    fontSize: 13,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  refreshBtn: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  historyContainer: {
    marginTop: 12,
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  historyBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeApproved: {
    backgroundColor: '#E6F4EA',
  },
  badgeRejected: {
    backgroundColor: '#FCE8E6',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgeTextApproved: {
    color: '#0D9488',
  },
  badgeTextRejected: {
    color: '#EF4444',
  },
  badgeTextPending: {
    color: '#D97706',
  },
  historyMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  adminNotesBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F6FA',
  },
  adminNotesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  adminNotesText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
});
