import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

interface PaymentRecord {
  _id: string;
  transactionId: string;
  userName: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface PaymentDashboardProps {
  payments: PaymentRecord[];
}

export default function PaymentDashboard({ payments }: PaymentDashboardProps) {
  // Real stats calculated from payments collection
  const totalCount = payments.length;
  const successfulCount = payments.filter(p => p.status === 'Success').length;
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const failedCount = payments.filter(p => p.status === 'Failed').length;

  const totalSum = payments
    .filter(p => p.status === 'Success')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const statCards = [
    { label: 'Total Payments', value: formatCurrency(totalSum), color: '#3B5BFF', bg: '#EEF2FF', icon: 'wallet' },
    { label: 'Successful', value: successfulCount, color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' },
    { label: 'Pending', value: pendingCount, color: '#F59E0B', bg: '#FEF3C7', icon: 'time' },
    { label: 'Failed', value: failedCount, color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle' }
  ];

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const cardWidth = isMobile ? '47%' : '23%';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Grid of 4 cards */}
      <View style={styles.gridContainer}>
        {statCards.map((item, index) => (
          <View key={index} style={[styles.statCard, { width: cardWidth }]}>
            <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
              {item.icon === 'wallet' ? (
                <Text style={[styles.rupeeIcon, { color: item.color }]}>₹</Text>
              ) : (
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardValue}>{item.value}</Text>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Transactions list */}
      <Text style={styles.sectionHeader}>Recent Transactions</Text>
      
      <View style={styles.list}>
        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No transaction history found</Text>
          </View>
        ) : (
          payments.map((p) => {
            const isSuccess = p.status === 'Success';
            const isFailed = p.status === 'Failed';
            
            return (
              <View key={p._id} style={styles.transactionItem}>
                <View style={styles.txnIcon}>
                  <Ionicons 
                    name={isSuccess ? "arrow-down-circle" : isFailed ? "alert-circle" : "time"} 
                    size={22} 
                    color={isSuccess ? "#16A34A" : isFailed ? "#EF4444" : "#F59E0B"} 
                  />
                </View>
                <View style={styles.txnMeta}>
                  <Text style={styles.txnId}>{p.transactionId || 'No ID'}</Text>
                  <Text style={styles.txnUser}>{p.userName || 'Unknown Partner'}</Text>
                  <Text style={styles.txnDate}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                  </Text>
                </View>
                <View style={styles.txnRight}>
                  <Text style={[styles.txnAmount, isFailed && styles.failedText]}>
                    ₹{p.amount}
                  </Text>
                  <View style={[
                    styles.statusPill, 
                    isSuccess ? styles.statusSuccess : isFailed ? styles.statusFailed : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusPillText,
                      isSuccess ? styles.successText : isFailed ? styles.failedText : styles.pendingText
                    ]}>
                      {p.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E2A47', marginBottom: 16 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#1E2A47', marginTop: 24, marginBottom: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rupeeIcon: { fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#1E2A47' },
  cardLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  list: { gap: 10 },
  transactionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  txnIcon: { marginRight: 12 },
  txnMeta: { flex: 1 },
  txnId: { fontSize: 13, fontWeight: 'bold', color: '#1E2A47' },
  txnUser: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  txnDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 15, fontWeight: 'bold', color: '#1E2A47', marginBottom: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusSuccess: { backgroundColor: '#DCFCE7' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  successText: { color: '#16A34A' },
  failedText: { color: '#EF4444' },
  pendingText: { color: '#D97706' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
});
