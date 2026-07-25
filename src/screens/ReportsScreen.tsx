import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import { ReportData } from '@/constants/mockData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ReportsScreenProps {
  reports: ReportData[];
  stats?: {
    totalUsers: number;
    totalWorkers: number;
    totalBookings: number;
    totalRevenue: number;
  };
  bookings?: { status: string }[];
}

// ─── Category Icon Map ────────────────────────────────────────────────────────
const CATEGORY_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  System:           { icon: 'server-outline',        color: '#16A34A', bg: '#DCFCE7' },
  'New User Signup':{ icon: 'person-add-outline',    color: '#3B5BFF', bg: '#EEF2FF' },
  'Payment API':    { icon: 'cash-outline',           color: '#D97706', bg: '#FEF3C7' },
  Settings:         { icon: 'settings-outline',       color: '#4F46E5', bg: '#E0E7FF' },
  'Booking Update': { icon: 'calendar-outline',       color: '#0D9488', bg: '#CCFBF1' },
};

function getCategory(cat: string) {
  return CATEGORY_ICON[cat] ?? { icon: 'ellipse-outline', color: '#9CA3AF', bg: '#F3F4F6' };
}

// ─── Summary Stat Card ────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: string;
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    marginHorizontal: 4,
    ...theme.shadows.soft,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primaryNavy,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: theme.colors.mutedGray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ─── Log Row ─────────────────────────────────────────────────────────────────
function LogRow({ item, isLast }: { item: ReportData; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cat = getCategory(item.category);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((p) => !p);
  };

  return (
    <View>
      <TouchableOpacity style={logStyles.row} onPress={toggle} activeOpacity={0.75}>
        {/* Left: icon + line */}
        <View style={logStyles.leftCol}>
          <View style={[logStyles.iconBadge, { backgroundColor: cat.bg }]}>
            <Ionicons name={cat.icon as any} size={14} color={cat.color} />
          </View>
          {!isLast && <View style={logStyles.connector} />}
        </View>

        {/* Right: content */}
        <View style={logStyles.rightCol}>
          <View style={logStyles.rowHeader}>
            <View style={[logStyles.categoryPill, { backgroundColor: cat.bg }]}>
              <Text style={[logStyles.categoryText, { color: cat.color }]}>{item.category}</Text>
            </View>
            <Text style={logStyles.timeText}>{item.timestamp}</Text>
          </View>

          <Text
            style={logStyles.descText}
            numberOfLines={expanded ? undefined : 2}
          >
            {item.description}
          </Text>

          {item.description.length > 60 && (
            <TouchableOpacity onPress={toggle} style={logStyles.moreBtn}>
              <Text style={logStyles.moreBtnText}>{expanded ? 'Show less' : 'Show more'}</Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={theme.colors.primaryBlue}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const logStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  leftCol: {
    width: 36,
    alignItems: 'center',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: -4,
  },
  rightCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  descText: {
    fontSize: 13.5,
    color: '#374151',
    lineHeight: 20,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  moreBtnText: {
    fontSize: 12,
    color: theme.colors.primaryBlue,
    fontWeight: '600',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportsScreen({ reports, stats, bookings = [] }: ReportsScreenProps) {
  // Booking status breakdown
  const total = bookings.length || 1;
  const completed = bookings.filter((b) => b.status?.toLowerCase() === 'completed').length;
  const pending = bookings.filter((b) => b.status?.toLowerCase() === 'pending').length;
  const inProgress = bookings.filter(
    (b) => b.status?.toLowerCase() === 'in_progress' || b.status?.toLowerCase() === 'on_the_way'
  ).length;
  const cancelled = bookings.filter((b) => b.status?.toLowerCase() === 'cancelled').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenHeader}>System Reports & Logs</Text>

      {/* ── Summary Stats ── */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard
            icon="people-outline"
            label="Users"
            value={stats.totalUsers}
            iconColor="#3B5BFF"
            iconBg="#EEF2FF"
          />
          <StatCard
            icon="construct-outline"
            label="Workers"
            value={stats.totalWorkers}
            iconColor="#0D9488"
            iconBg="#CCFBF1"
          />
          <StatCard
            icon="calendar-outline"
            label="Bookings"
            value={stats.totalBookings}
            iconColor="#D97706"
            iconBg="#FEF3C7"
          />
          <StatCard
            icon="cash-outline"
            label="Revenue"
            value={`₹${stats.totalRevenue}`}
            iconColor="#16A34A"
            iconBg="#DCFCE7"
          />
        </View>
      )}

      {/* ── Booking Breakdown ── */}
      {bookings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Status Breakdown</Text>

          {/* Segmented bar */}
          <View style={styles.segmentBar}>
            {completed > 0 && (
              <View style={[styles.segment, { flex: completed, backgroundColor: '#16A34A' }]} />
            )}
            {pending > 0 && (
              <View style={[styles.segment, { flex: pending, backgroundColor: '#D97706' }]} />
            )}
            {inProgress > 0 && (
              <View style={[styles.segment, { flex: inProgress, backgroundColor: '#4F46E5' }]} />
            )}
            {cancelled > 0 && (
              <View style={[styles.segment, { flex: cancelled, backgroundColor: '#EF4444' }]} />
            )}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            {[
              { label: 'Completed', count: completed, color: '#16A34A' },
              { label: 'Pending', count: pending, color: '#D97706' },
              { label: 'In Progress', count: inProgress, color: '#4F46E5' },
              { label: 'Cancelled', count: cancelled, color: '#EF4444' },
            ].map((item) =>
              item.count > 0 ? (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>
                    {item.label}{' '}
                    <Text style={[styles.legendCount, { color: item.color }]}>
                      ({item.count})
                    </Text>
                  </Text>
                </View>
              ) : null
            )}
          </View>
        </View>
      )}

      {/* ── Activity Audit Log ── */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Platform Activity Audit Log</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Live</Text>
          </View>
        </View>

        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>No activity logs yet</Text>
          </View>
        ) : (
          reports.map((item, index) => (
            <LogRow key={item._id} item={item} isLast={index === reports.length - 1} />
          ))
        )}
      </View>
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

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 16,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.layout.cardRadius,
    padding: 18,
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primaryNavy,
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
    marginBottom: 16,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },

  // Segment bar
  segmentBar: {
    height: 10,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  segment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
  },
  legendCount: {
    fontWeight: '700',
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: theme.colors.mutedGray, fontSize: 14, marginTop: 10 },
});
