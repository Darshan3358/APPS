import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import StatusPill from '@/components/StatusPill';
import { SubscriptionData } from '@/constants/mockData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SubscriptionsScreenProps {
  subscriptions: SubscriptionData[];
  onRefundSubscription: (id: string) => void;
  subscriptionRequests?: any[];
  onApproveSubscriptionRequest?: (id: string) => void;
  onRejectSubscriptionRequest?: (id: string, remarks: string) => void;
}

function SubscriptionRow({
  sub,
  onRefundSubscription,
}: {
  sub: SubscriptionData;
  onRefundSubscription: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRefunded = sub.status.toLowerCase() === 'refunded';

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.rowCard}>
      {/* Primary: Partner Name + Plan + toggle */}
      <TouchableOpacity style={styles.primaryRow} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.primaryFields}>
          <Text style={styles.nameText} numberOfLines={1}>
            {sub.partnerName || '—'}
          </Text>
          <Text style={styles.subText}>{sub.planName || '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusPill status={sub.status} />
          <Ionicons
            name={expanded ? 'remove-circle' : 'add-circle'}
            size={22}
            color={expanded ? '#EF4444' : theme.colors.primaryBlue}
          />
        </View>
      </TouchableOpacity>

      {/* Dropdown panel */}
      {expanded && (
        <View style={styles.expandedPanel}>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Amount</Text>
            <Text style={[styles.expandValue, { fontWeight: '700', color: '#16A34A' }]}>₹{sub.amount ?? '—'}</Text>
          </View>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Payment</Text>
            <Text style={styles.expandValue}>{sub.paymentMethod || '—'}</Text>
          </View>
          {sub.startDate && (
            <View style={styles.expandedRow}>
              <Text style={styles.expandLabel}>Started</Text>
              <Text style={styles.expandValue}>
                {new Date(sub.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          )}
          {sub.endDate && (
            <View style={styles.expandedRow}>
              <Text style={styles.expandLabel}>Expires</Text>
              <Text style={[styles.expandValue, {
                color: new Date(sub.endDate) < new Date() ? '#EF4444' : '#16A34A',
                fontWeight: '700'
              }]}>
                {new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {new Date(sub.endDate) < new Date() ? '  ⚠ Expired' : '  ✓ Active'}
              </Text>
            </View>
          )}
          <View style={[styles.expandedRow, styles.actionRow]}>
            {isRefunded ? (
              <Text style={styles.finalText}>Already refunded</Text>
            ) : sub.status === 'Refund Pending' ? (
              <TouchableOpacity
                style={[styles.refundButton, { backgroundColor: '#D97706' }]}
                onPress={() => onRefundSubscription(String(sub._id))}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color="#FFFFFF" />
                <Text style={styles.refundButtonText}>Approve Refund Request</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.refundButton}
                onPress={() => onRefundSubscription(String(sub._id))}
              >
                <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
                <Text style={styles.refundButtonText}>Issue Refund</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function SubscriptionsScreen({
  subscriptions,
  onRefundSubscription,
  subscriptionRequests = [],
  onApproveSubscriptionRequest = () => {},
  onRejectSubscriptionRequest = () => {},
}: SubscriptionsScreenProps) {
  const [activeTab, setActiveTab] = useState<'payments' | 'approvals'>('payments');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubs = subscriptions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const partner = s.partnerName ? String(s.partnerName).toLowerCase() : '';
    const plan = s.planName ? String(s.planName).toLowerCase() : '';
    return partner.includes(q) || plan.includes(q);
  });

  const handleApprove = (id: string, name: string) => {
    const message = `Are you sure you want to approve the upgrade request for ${name}? This will instantly activate their GigDial Pro membership.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        onApproveSubscriptionRequest(id);
      }
    } else {
      Alert.alert('Approve Upgrade', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => onApproveSubscriptionRequest(id) }
      ]);
    }
  };

  const handleReject = (id: string, name: string) => {
    const remarks = Platform.OS === 'web' 
      ? window.prompt(`Enter rejection remarks for ${name}'s request:`, 'Payment verification failed')
      : 'Payment verification failed';

    if (remarks !== null) {
      onRejectSubscriptionRequest(id, remarks || 'Payment verification failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenHeader}>Partner Subscriptions</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'payments' && styles.tabButtonActive]}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
            Active Payments ({filteredSubs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'approvals' && styles.tabButtonActive]}
          onPress={() => setActiveTab('approvals')}
        >
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
            Upgrade Approvals ({subscriptionRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'payments' ? (
        <>
          {/* Export Button */}
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => alert('Exporting subscription report...')}
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" style={styles.exportIcon} />
            <Text style={styles.exportButtonText}>Export Report</Text>
          </TouchableOpacity>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color={theme.colors.mutedGray} style={styles.searchIcon} />
            <TextInput
              placeholder="Search Partner / Plan"
              placeholderTextColor={theme.colors.mutedGray}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.colors.mutedGray} />
              </TouchableOpacity>
            )}
          </View>

          {/* Column Header */}
          <View style={styles.columnHeaderRow}>
            <Text style={[styles.columnHeaderText, { flex: 1 }]}>Partner</Text>
            <Text style={[styles.columnHeaderText, { flex: 1 }]}>Plan</Text>
            <Text style={[styles.columnHeaderText, { width: 36 }]}>  </Text>
          </View>

          {filteredSubs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No records found</Text>
            </View>
          ) : (
            filteredSubs.map((sub) => (
              <SubscriptionRow
                key={sub._id}
                sub={sub}
                onRefundSubscription={onRefundSubscription}
              />
            ))
          )}
        </>
      ) : (
        <>
          {/* Upgrade Approvals list */}
          <View style={styles.columnHeaderRow}>
            <Text style={[styles.columnHeaderText, { flex: 1 }]}>Worker</Text>
            <Text style={[styles.columnHeaderText, { width: 120, textAlign: 'right' }]}>Upgrade Actions</Text>
          </View>

          {subscriptionRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No pending upgrade requests</Text>
            </View>
          ) : (
            subscriptionRequests.map((reqObj: any) => (
              <View key={reqObj._id} style={styles.rowCard}>
                <View style={[styles.primaryRow, { paddingVertical: 18 }]}>
                  <View style={styles.primaryFields}>
                    <Text style={styles.nameText}>{reqObj.workerName || 'Service Provider'}</Text>
                    <Text style={styles.subText}>{reqObj.workerPhone || '—'}  •  {reqObj.workerEmail || '—'}</Text>
                    <Text style={[styles.subText, { marginTop: 4, color: '#16A34A', fontWeight: 'bold' }]}>
                      Amount: ₹{reqObj.amount}
                    </Text>
                    <Text style={[styles.subText, { fontSize: 13, color: '#374151', marginTop: 4, fontWeight: '600' }]}>
                      Transaction ID: {reqObj.transactionId || '—'}
                    </Text>
                    {reqObj.requestedAt && (
                      <Text style={[styles.subText, { fontSize: 11, color: '#9CA3AF', marginTop: 2 }]}>
                        Requested: {new Date(reqObj.requestedAt).toLocaleString('en-IN')}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.approveBtn]} 
                      onPress={() => handleApprove(reqObj._id, reqObj.workerName)}
                    >
                      <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]} 
                      onPress={() => handleReject(reqObj._id, reqObj.workerName)}
                    >
                      <Ionicons name="close-sharp" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.layout.paddingHorizontal, paddingBottom: 40 },
  screenHeader: {
    ...theme.typography.sectionHeading,
    color: theme.colors.primaryNavy,
    marginTop: 20,
    marginBottom: 16,
  },
  exportButton: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  exportIcon: { marginRight: 8 },
  exportButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  searchBarContainer: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.primaryNavy },
  columnHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF1F6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  columnHeaderText: {
    ...theme.typography.tableHeader,
    color: theme.colors.primaryNavy,
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    ...theme.shadows.soft,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryFields: { flex: 1 },
  nameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.primaryNavy,
    marginBottom: 2,
  },
  subText: { fontSize: 13, color: theme.colors.mutedGray },
  expandedPanel: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expandLabel: {
    fontSize: 13,
    color: theme.colors.mutedGray,
    fontWeight: '600',
    width: 90,
  },
  expandValue: { fontSize: 14, color: theme.colors.primaryNavy, flex: 1 },
  actionRow: {
    borderBottomWidth: 0,
    marginTop: 6,
    justifyContent: 'flex-start',
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 6,
  },
  refundButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  finalText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: theme.colors.mutedGray, fontSize: 15, marginTop: 12 },
  
  // Tab styles
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF1F6',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.soft,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.mutedGray,
  },
  tabTextActive: {
    color: theme.colors.primaryNavy,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#16A34A',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
});
