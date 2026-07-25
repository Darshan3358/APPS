import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/styles/theme';
import CustomChart from '@/components/CustomChart';

interface DashboardOverviewProps {
  stats: any;
  workers: any[];
  users: any[];
  bookings: any[];
  subscriptions: any[];
  reviews: any[];
  supportTickets: any[];
  payments: any[];
}

export default function DashboardOverview({
  stats,
  workers,
  users,
  bookings,
  subscriptions,
  reviews,
  supportTickets,
  payments
}: DashboardOverviewProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const cardWidth = isMobile ? '47%' : '31%';
  
  const tabBarHeight = Platform.OS === 'ios' ? 76 : 60;
  const bottomPadding = tabBarHeight + insets.bottom + 20;
  
  // Real dynamic calculations based on database arrays
  const totalProfessionals = workers.length;
  const verifiedProfessionals = workers.filter(w => w.isApproved).length;
  const pendingApproval = workers.filter(w => !w.isApproved).length;
  const blockedProfessionals = users.filter(u => u.role === 'worker' && u.isBlocked).length;
  
  const totalCustomers = users.filter(u => u.role !== 'worker' && !u.isAdmin).length;
  
  // Filter today's bookings
  const todayStr = new Date().toDateString();
  const todaysLeads = bookings.filter(b => {
    if (!b.createdAt) return false;
    return new Date(b.createdAt).toDateString() === todayStr;
  }).length;

  const activeSubscriptions = subscriptions.filter(s => s.status === 'Active' || s.status === 'approved').length;
  const expiredSubscriptions = subscriptions.filter(s => s.status === 'Expired' || s.status === 'rejected').length;

  const totalRevenue = payments
    .filter(p => p.status === 'Success')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingVerification = workers.filter(w => !w.isApproved && (w.aadhaarCard || w.panCard)).length;
  const newReviews = reviews.length;

  // Formatting currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const statItems = [
    { label: 'Total Professionals', value: totalProfessionals, color: '#3B5BFF', bg: '#EEF2FF', icon: 'construct' },
    { label: 'Verified Professionals', value: verifiedProfessionals, color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' },
    { label: 'Pending Approval', value: pendingApproval, color: '#F59E0B', bg: '#FEF3C7', icon: 'time' },
    { label: 'Blocked Professionals', value: blockedProfessionals, color: '#EF4444', bg: '#FEE2E2', icon: 'ban' },
    { label: 'Total Customers', value: totalCustomers, color: '#4F46E5', bg: '#EEF2FF', icon: 'people' },
    { label: 'Today\'s Leads', value: todaysLeads, color: '#10B981', bg: '#D1FAE5', icon: 'flash' },
    { label: 'Active Subscription', value: activeSubscriptions, color: '#059669', bg: '#D1FAE5', icon: 'ribbon' },
    { label: 'Expired Subscription', value: expiredSubscriptions, color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: '#059669', bg: '#D1FAE5', icon: 'wallet', isRevenue: true },
    { label: 'Pending Verification', value: pendingVerification, color: '#2563EB', bg: '#DBEAFE', icon: 'document-text' },
    { label: 'New Reviews', value: newReviews, color: '#7C3AED', bg: '#F3E8FF', icon: 'star' }
  ];

  // Calculate registrations (both customers & workers) per month over the last 7 months
  const getMonthlyRegistrationData = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    
    const months: { year: number; month: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    users.forEach(u => {
      const uDate = u.createdAt ? new Date(u.createdAt) : null;
      if (!uDate) return;
      const uYear = uDate.getFullYear();
      const uMonth = uDate.getMonth();

      const idx = months.findIndex(m => m.year === uYear && m.month === uMonth);
      if (idx !== -1) {
        counts[idx]++;
      }
    });

    workers.forEach(w => {
      const wDate = w.createdAt ? new Date(w.createdAt) : null;
      if (!wDate) return;
      const wYear = wDate.getFullYear();
      const wMonth = wDate.getMonth();

      const idx = months.findIndex(m => m.year === wYear && m.month === wMonth);
      if (idx !== -1) {
        counts[idx]++;
      }
    });

    return counts;
  };

  // Calculate leads per month over the last 7 months
  const getLeadsOverviewData = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    
    const months: { year: number; month: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    bookings.forEach(b => {
      const bDate = b.createdAt ? new Date(b.createdAt) : (b.date ? new Date(b.date) : null);
      if (!bDate) return;
      const bYear = bDate.getFullYear();
      const bMonth = bDate.getMonth();

      const idx = months.findIndex(m => m.year === bYear && m.month === bMonth);
      if (idx !== -1) {
        counts[idx]++;
      }
    });

    return counts;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
      {/* Grid List of 11 stat cards */}
      <View style={styles.gridContainer}>
        {statItems.map((item, index) => (
          <View key={index} style={[styles.statCard, item.isRevenue ? styles.revenueCard : { width: cardWidth }]}>
            <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
              {item.icon === 'wallet' ? (
                <Text style={[styles.rupeeIcon, { color: item.color }]}>₹</Text>
              ) : (
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardValue}>{item.value}</Text>
              <Text style={styles.cardLabel} numberOfLines={2} ellipsizeMode="tail">{item.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Charts Section */}
      <Text style={styles.sectionHeader}>Overview Charts</Text>
      
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Registration</Text>
        <CustomChart data={getMonthlyRegistrationData()} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Leads Overview</Text>
        <CustomChart data={getLeadsOverviewData()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E2A47',
    marginTop: 24,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  revenueCard: {
    width: '100%',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rupeeIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E2A47',
  },
  cardLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E2A47',
    marginBottom: 8,
  },
});
