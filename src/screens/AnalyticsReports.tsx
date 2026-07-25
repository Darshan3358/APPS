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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/styles/theme';
import CustomChart from '@/components/CustomChart';

interface AnalyticsReportsProps {
  workers: any[];
  users: any[];
  bookings: any[];
  payments: any[];
}

export default function AnalyticsReports({
  workers,
  users,
  bookings,
  payments
}: AnalyticsReportsProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const cardWidth = isMobile ? '47%' : '23%';

  const tabBarHeight = Platform.OS === 'ios' ? 76 : 60;
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  // Real data calculations
  const totalUsers = users.length + workers.length;
  const totalProfessionals = workers.length;
  const totalLeads = bookings.length;

  const totalRevenue = payments
    .filter(p => p.status === 'Success')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Group bookings by category to determine top categories
  const categoriesCount: { [key: string]: number } = {};
  bookings.forEach(b => {
    const cat = b.serviceName || 'Others';
    categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoriesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const totalCategoryBookings = sortedCategories.reduce((sum, c) => sum + c[1], 0) || 1;

  const categoryData = sortedCategories.map(([name, count]) => {
    const percentage = Math.round((count / totalCategoryBookings) * 100);
    return { name, percentage };
  });

  const topCategories = categoryData.length > 0 ? categoryData : [
    { name: 'Home Services', percentage: 35 },
    { name: 'Business Services', percentage: 25 },
    { name: 'Event Services', percentage: 15 },
    { name: 'Others', percentage: 25 }
  ];

  // Default fallback if database is empty
  // Calculate user growth dynamically
  const getUserGrowthData = () => {
    const now = new Date();
    const months: { year: number; month: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0
      });
    }

    const firstMonthStart = new Date(months[0].year, months[0].month, 1);
    let baseCount = 0;

    users.forEach(u => {
      const uDate = u.createdAt ? new Date(u.createdAt) : null;
      if (!uDate) return;
      
      if (uDate < firstMonthStart) {
        baseCount++;
      } else {
        const uYear = uDate.getFullYear();
        const uMonth = uDate.getMonth();
        const idx = months.findIndex(m => m.year === uYear && m.month === uMonth);
        if (idx !== -1) {
          months[idx].count++;
        }
      }
    });

    const growth = [];
    let currentTotal = baseCount;
    for (let i = 0; i < 7; i++) {
      currentTotal += months[i].count;
      growth.push(currentTotal);
    }
    return growth;
  };

  // Calculate leads growth dynamically
  const getLeadsGrowthData = () => {
    const now = new Date();
    const months: { year: number; month: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0
      });
    }

    const firstMonthStart = new Date(months[0].year, months[0].month, 1);
    let baseCount = 0;

    bookings.forEach(b => {
      const bDate = b.createdAt ? new Date(b.createdAt) : (b.date ? new Date(b.date) : null);
      if (!bDate) return;
      
      if (bDate < firstMonthStart) {
        baseCount++;
      } else {
        const bYear = bDate.getFullYear();
        const bMonth = bDate.getMonth();
        const idx = months.findIndex(m => m.year === bYear && m.month === bMonth);
        if (idx !== -1) {
          months[idx].count++;
        }
      }
    });

    const growth = [];
    let currentTotal = baseCount;
    for (let i = 0; i < 7; i++) {
      currentTotal += months[i].count;
      growth.push(currentTotal);
    }
    return growth;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
      {/* Date selector placeholder */}
      <View style={styles.dateSelector}>
        <Ionicons name="calendar-outline" size={16} color="#4B5563" style={{ marginRight: 6 }} />
        <Text style={styles.dateRangeText}>01 May, 2024 - 31 May, 2024</Text>
      </View>

      {/* Stat Cards */}
      <View style={styles.gridContainer}>
        {/* Total Users */}
        <View style={[styles.statCard, { width: cardWidth }]}>
          <Text style={styles.cardLabel}>Total Users</Text>
          <View style={styles.valRow}>
            <Text style={styles.cardValue}>{totalUsers}</Text>
            <Text style={styles.changeTextGreen}>+12.5%</Text>
          </View>
        </View>

        {/* Total Professionals */}
        <View style={[styles.statCard, { width: cardWidth }]}>
          <Text style={styles.cardLabel}>Total Professionals</Text>
          <View style={styles.valRow}>
            <Text style={styles.cardValue}>{totalProfessionals}</Text>
            <Text style={styles.changeTextGreen}>+8.5%</Text>
          </View>
        </View>

        {/* Total Leads */}
        <View style={[styles.statCard, { width: cardWidth }]}>
          <Text style={styles.cardLabel}>Total Leads</Text>
          <View style={styles.valRow}>
            <Text style={styles.cardValue}>{totalLeads}</Text>
            <Text style={styles.changeTextGreen}>+9.7%</Text>
          </View>
        </View>

        {/* Total Revenue */}
        <View style={[styles.statCard, { width: '100%' }]}>
          <Text style={styles.cardLabel}>Total Revenue</Text>
          <View style={styles.valRow}>
            <Text style={styles.cardValue}>{formatCurrency(totalRevenue)}</Text>
            <Text style={styles.changeTextGreen}>+10.2%</Text>
          </View>
        </View>
      </View>

      {/* Charts Section */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>User Growth</Text>
        <CustomChart data={getUserGrowthData()} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Leads Growth</Text>
        <CustomChart data={getLeadsGrowthData()} />
      </View>

      {/* Top Categories */}
      <View style={styles.categoriesCard}>
        <Text style={styles.chartTitle}>Top Categories</Text>
        
        <View style={styles.categoriesList}>
          {topCategories.map((item, index) => {
            const colors = ['#3B5BFF', '#10B981', '#7C3AED', '#EF4444'];
            const barColor = colors[index % colors.length];

            return (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.catHeader}>
                  <View style={styles.catLeft}>
                    <View style={[styles.colorDot, { backgroundColor: barColor }]} />
                    <Text style={styles.catName}>{item.name}</Text>
                  </View>
                  <Text style={styles.catPercent}>{item.percentage}%</Text>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E2A47', marginBottom: 12 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  dateRangeText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexGrow: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: { fontSize: 12, color: '#6B7280' },
  valRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: '#1E2A47' },
  changeTextGreen: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
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
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#1E2A47', marginBottom: 12 },
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoriesList: { gap: 14, marginTop: 4 },
  categoryItem: {},
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 13, fontWeight: '600', color: '#1E2A47' },
  catPercent: { fontSize: 13, fontWeight: '700', color: '#1E2A47' },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: '#F3F4F6', width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
});
