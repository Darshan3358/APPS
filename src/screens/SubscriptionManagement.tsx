import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

interface SubscriptionRecord {
  _id: string;
  partnerName: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  startDate?: string;
  endDate?: string;
  date?: string;
}

interface SubscriptionManagementProps {
  subscriptions: SubscriptionRecord[];
  onRefundSubscription: (id: string) => void;
  subscriptionRequests: any[];
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string, remarks: string) => void;
}

type TabType = 'All' | 'Active' | 'Expired' | 'Requests';

export default function SubscriptionManagement({
  subscriptions,
  onRefundSubscription,
  subscriptionRequests,
  onApproveRequest,
  onRejectRequest,
}: SubscriptionManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Active');

  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [planFilter, setPlanFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Rejection Dialog Modal State
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Extract unique plans and payment methods dynamically
  const uniquePlans = Array.from(
    new Set(
      [
        ...subscriptions.map((s) => s.planName || 'Premium'),
        ...subscriptionRequests.map((r) => r.plan || 'Premium'),
      ].filter(Boolean)
    )
  );

  const uniquePayments = Array.from(
    new Set(
      subscriptions.map((s) => s.paymentMethod || 'UPI').filter(Boolean)
    )
  );

  const filtered = activeTab === 'Requests'
    ? subscriptionRequests.filter(r => r.status === 'pending')
    : subscriptions.filter((s) => {
        // Tab check
        if (activeTab === 'Active' && s.status !== 'Active' && s.status !== 'approved') return false;
        if (activeTab === 'Expired' && s.status !== 'Expired' && s.status !== 'rejected') return false;
        
        // Plan Filter
        if (planFilter !== 'All') {
          const currentPlan = s.planName || 'Premium';
          if (currentPlan.toLowerCase() !== planFilter.toLowerCase()) return false;
        }

        // Payment Method Filter
        if (paymentFilter !== 'All') {
          const payment = s.paymentMethod || 'UPI';
          if (payment.toLowerCase() !== paymentFilter.toLowerCase()) return false;
        }

        return true;
      });

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'approved' || s === 'success') return styles.statusActive;
    if (s === 'expired' || s === 'rejected' || s === 'failed') return styles.statusExpired;
    return styles.statusPending;
  };

  const getStatusText = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'approved' || s === 'success') return 'Active';
    if (s === 'expired' || s === 'rejected' || s === 'failed') return 'Expired';
    return 'Pending';
  };

  const handleOpenRejectDialog = (requestId: string) => {
    setRejectingRequestId(requestId);
    setRejectionNotes('');
    setRejectionModalVisible(true);
  };

  const handleConfirmReject = () => {
    if (!rejectingRequestId) return;
    const notes = rejectionNotes.trim() || 'Payment verification failed';
    onRejectRequest(rejectingRequestId, notes);
    setRejectionModalVisible(false);
    setRejectingRequestId(null);
  };

  const activeFilterCount = 
    (planFilter !== 'All' ? 1 : 0) +
    (paymentFilter !== 'All' ? 1 : 0);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Search & Filter Row */}
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity 
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]} 
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons 
              name="filter-outline" 
              size={20} 
              color={activeFilterCount > 0 ? '#FFFFFF' : '#3B5BFF'} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {(['All', 'Active', 'Expired', 'Requests'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'Requests'
              ? subscriptionRequests.filter(r => r.status === 'pending').length
              : tab === 'All'
                ? subscriptions.length
                : tab === 'Active'
                  ? subscriptions.filter(s => s.status === 'Active' || s.status === 'approved').length
                  : subscriptions.filter(s => s.status === 'Expired' || s.status === 'rejected').length;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Subscription List */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No subscription records found</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const isRequest = activeTab === 'Requests';
              return (
                <View key={item._id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarIcon}>
                      <Ionicons name="person" size={20} color="#3B5BFF" />
                    </View>
                    <View style={styles.meta}>
                      <Text style={styles.partnerName}>{item.partnerName || item.workerName || '—'}</Text>
                      <Text style={styles.planName}>{item.planName || item.plan || 'Premium'} Plan</Text>
                    </View>
                    <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                      <Text style={[styles.statusBadgeText, getStatusStyle(item.status)]}>
                        {getStatusText(item.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Details grid */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={styles.detailValue}>₹{item.amount}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Start Date</Text>
                      <Text style={styles.detailValue}>
                        {item.startDate ? new Date(item.startDate).toLocaleDateString() : item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>End Date</Text>
                      <Text style={styles.detailValue}>
                        {item.endDate ? new Date(item.endDate).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  {isRequest ? (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => onApproveRequest(item._id)}
                      >
                        <Text style={styles.btnTextWhite}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleOpenRejectDialog(item._id)}
                      >
                        <Text style={styles.btnTextRed}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.manageBtn}
                        onPress={() => {
                          if (item.status === 'Active' || item.status === 'approved') {
                            onRefundSubscription(item._id);
                          } else {
                            Alert.alert('Info', 'Subscription is already inactive.');
                          }
                        }}
                      >
                        <Text style={styles.manageBtnText}>
                          {item.status === 'Active' || item.status === 'approved' ? 'Issue Refund' : 'Expired'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Filter Subscriptions</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
              {/* Plan Type Filter */}
              <Text style={styles.filterSectionTitle}>Plan Type</Text>
              <View style={styles.filterOptionsRow}>
                {['All', ...uniquePlans].map((planName) => (
                  <TouchableOpacity
                    key={planName}
                    style={[
                      styles.filterOptionBtn,
                      planFilter.toLowerCase() === planName.toLowerCase() && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setPlanFilter(planName)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      planFilter.toLowerCase() === planName.toLowerCase() && styles.filterOptionTextActive
                    ]}>{planName}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Method Filter */}
              <Text style={styles.filterSectionTitle}>Payment Method</Text>
              <View style={styles.filterOptionsRow}>
                {['All', ...uniquePayments].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.filterOptionBtn,
                      paymentFilter.toLowerCase() === method.toLowerCase() && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setPaymentFilter(method)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      paymentFilter.toLowerCase() === method.toLowerCase() && styles.filterOptionTextActive
                    ]}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setPlanFilter('All');
                  setPaymentFilter('All');
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Rejection Notes Dialogue Modal */}
      <Modal visible={rejectionModalVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { paddingBottom: 20 }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Provide Rejection Reason</Text>
              <TouchableOpacity onPress={() => setRejectionModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.dialogLabel}>Enter reason for rejection:</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="e.g. Transaction ID mismatch, incomplete payment..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={rejectionNotes}
                onChangeText={setRejectionNotes}
              />

              <View style={styles.dialogActions}>
                <TouchableOpacity 
                  style={[styles.dialogBtn, styles.cancelBtn]} 
                  onPress={() => setRejectionModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.dialogBtn, styles.confirmBtn]} 
                  onPress={handleConfirmReject}
                >
                  <Text style={styles.confirmBtnText}>Reject Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E2A47', marginBottom: 16 },
  searchRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  filterButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B5BFF',
    borderColor: '#3B5BFF',
  },
  filterButtonText: { fontSize: 14, fontWeight: '600', color: '#3B5BFF' },
  filterButtonTextActive: { color: '#FFFFFF' },
  tabsScroll: { marginBottom: 16 },
  tabsContent: { gap: 8 },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E8EC',
  },
  tabPillActive: { backgroundColor: '#3B5BFF' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  tabTextActive: { color: '#FFFFFF' },
  list: { gap: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  meta: { flex: 1 },
  partnerName: { fontSize: 15, fontWeight: 'bold', color: '#1E2A47' },
  planName: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusActive: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  statusExpired: { backgroundColor: '#FEE2E2', color: '#EF4444' },
  statusPending: { backgroundColor: '#FEF3C7', color: '#D97706' },
  detailsRow: { flexDirection: 'row', gap: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 12 },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1E2A47' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: '#16A34A' },
  rejectBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  btnTextWhite: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  btnTextRed: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  manageBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnText: { fontSize: 13, fontWeight: '700', color: '#1E2A47' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2A47',
    marginTop: 14,
    marginBottom: 8,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterOptionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  filterOptionBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#3B5BFF',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#3B5BFF',
  },
  resetFilterBtn: {
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFilterBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '700',
  },
  dialogLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '600',
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1E2A47',
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#EF4444',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E2A47' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
});
