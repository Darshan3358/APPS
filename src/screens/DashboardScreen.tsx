import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import CustomChart from '@/components/CustomChart';

interface DashboardScreenProps {
  stats: {
    totalUsers: number;
    totalWorkers: number;
    totalBookings: number;
    totalRevenue: number;
    trends: number[];
  };
}

export default function DashboardScreen({ stats }: DashboardScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenHeader}>Dashboard Overview</Text>

      {/* 4 Stat Cards */}
      <View style={styles.statsList}>
        {/* Total Users */}
        <View style={[styles.statCard, { borderLeftColor: '#3B5BFF', borderLeftWidth: 3 }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people" size={22} color="#3B5BFF" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
          </View>
        </View>

        {/* Total Workers */}
        <View style={[styles.statCard, { borderLeftColor: '#0D9488', borderLeftWidth: 3 }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#CCFBF1' }]}>
            <Ionicons name="construct" size={22} color="#0D9488" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Total Workers</Text>
            <Text style={styles.statValue}>{stats.totalWorkers}</Text>
          </View>
        </View>

        {/* Total Bookings */}
        <View style={[styles.statCard, { borderLeftColor: '#D97706', borderLeftWidth: 3 }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="clipboard" size={22} color="#D97706" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Total Bookings</Text>
            <Text style={styles.statValue}>{stats.totalBookings}</Text>
          </View>
        </View>

        {/* Total Revenue */}
        <View style={[styles.statCard, { borderLeftColor: '#16A34A', borderLeftWidth: 3 }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.rupeeIcon}>₹</Text>
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statValue}>₹{stats.totalRevenue}</Text>
          </View>
        </View>
      </View>

      {/* Chart Card */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Booking Trends (Weekly)</Text>
        <CustomChart data={stats.trends} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.layout.paddingHorizontal,
    paddingBottom: 32,
  },
  screenHeader: {
    ...theme.typography.sectionHeading,
    color: theme.colors.primaryNavy,
    marginTop: 20,
    marginBottom: 20,
  },
  statsList: {
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.layout.cardRadius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rupeeIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    ...theme.typography.cardLabel,
    color: theme.colors.mutedGray,
  },
  statValue: {
    ...theme.typography.cardValue,
    color: theme.colors.primaryNavy,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.layout.cardRadius,
    padding: 16,
    ...theme.shadows.soft,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primaryNavy,
    marginBottom: 8,
  },
});
