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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import StatusPill from '@/components/StatusPill';
import { BookingData } from '@/constants/mockData';
import DateFilter, { filterByDateRange, DateFilterState } from '@/components/DateFilter';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BookingsScreenProps {
  bookings: BookingData[];
  onUpdateStatus: (id: string, status: string) => void;
}

function BookingRow({
  booking,
  onUpdateStatus,
}: {
  booking: BookingData;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const isFinal =
    booking.status.toLowerCase() === 'completed' ||
    booking.status.toLowerCase() === 'cancelled';

  const shortId = booking._id ? '#' + String(booking._id).slice(-6) : '—';

  return (
    <View style={styles.rowCard}>
      {/* Primary: Customer + Service + toggle */}
      <TouchableOpacity style={styles.primaryRow} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.primaryFields}>
          <Text style={styles.nameText} numberOfLines={1}>
            {booking.customerName || '—'}
          </Text>
          <Text style={styles.subText}>{booking.serviceName || '—'}</Text>
        </View>
        <Ionicons
          name={expanded ? 'remove-circle' : 'add-circle'}
          size={24}
          color={expanded ? '#EF4444' : theme.colors.primaryBlue}
        />
      </TouchableOpacity>

      {/* Dropdown panel */}
      {expanded && (
        <View style={styles.expandedPanel}>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Booking ID</Text>
            <Text style={styles.expandValue}>{shortId}</Text>
          </View>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Worker</Text>
            <Text style={styles.expandValue}>{booking.workerName || '—'}</Text>
          </View>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Price</Text>
            <Text style={styles.expandValue}>₹{booking.price ?? '—'}</Text>
          </View>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Status</Text>
            <StatusPill status={booking.status} />
          </View>
          <View style={[styles.expandedRow, styles.actionRow]}>
            {isFinal ? (
              <Text style={styles.finalText}>No actions available</Text>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionChip, styles.chipGreen]}
                  onPress={() => onUpdateStatus(booking._id, 'completed')}
                >
                  <Ionicons name="checkmark-outline" size={14} color={theme.colors.success.text} />
                  <Text style={[styles.chipText, { color: theme.colors.success.text }]}>
                    Complete
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionChip, styles.chipRed]}
                  onPress={() => onUpdateStatus(booking._id, 'cancelled')}
                >
                  <Ionicons name="close-outline" size={14} color={theme.colors.danger.text} />
                  <Text style={[styles.chipText, { color: theme.colors.danger.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function BookingsScreen({ bookings, onUpdateStatus }: BookingsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });

  const dateFilteredBookings = filterByDateRange(bookings, (item) => (item as any).createdAt || item.date, dateFilter);

  const filteredBookings = dateFilteredBookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const id = b._id ? String(b._id).toLowerCase() : '';
    const customer = b.customerName ? String(b.customerName).toLowerCase() : '';
    const worker = b.workerName ? String(b.workerName).toLowerCase() : '';
    const service = b.serviceName ? String(b.serviceName).toLowerCase() : '';
    return id.includes(q) || customer.includes(q) || worker.includes(q) || service.includes(q);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenHeader}>Manage Bookings</Text>

      <DateFilter value={dateFilter} onChange={setDateFilter} />

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={theme.colors.mutedGray} style={styles.searchIcon} />
        <TextInput
          placeholder="Search ID / Name"
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
        <Text style={[styles.columnHeaderText, { flex: 1 }]}>Customer</Text>
        <Text style={[styles.columnHeaderText, { flex: 1 }]}>Service</Text>
        <Text style={[styles.columnHeaderText, { width: 36 }]}>  </Text>
      </View>

      {filteredBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No bookings found</Text>
        </View>
      ) : (
        filteredBookings.map((booking) => (
          <BookingRow key={booking._id} booking={booking} onUpdateStatus={onUpdateStatus} />
        ))
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
  subText: {
    fontSize: 13,
    color: theme.colors.mutedGray,
  },
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
  expandValue: {
    fontSize: 14,
    color: theme.colors.primaryNavy,
    flex: 1,
  },
  actionRow: {
    borderBottomWidth: 0,
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    justifyContent: 'flex-start',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF1F6',
    gap: 4,
    marginRight: 4,
  },
  chipGreen: { backgroundColor: theme.colors.success.bg },
  chipRed: { backgroundColor: '#FEE2E2' },
  chipText: { fontSize: 13, fontWeight: '600' },
  finalText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: theme.colors.mutedGray, fontSize: 15, marginTop: 12 },
});
