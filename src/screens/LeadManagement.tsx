import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

import DateFilter, { filterByDateRange, DateFilterState } from '@/components/DateFilter';

interface BookingRecord {
  _id: string;
  customerName: string;
  workerName: string;
  serviceName: string;
  price: number;
  status: string;
  createdAt?: string;
  date?: string;
  time?: string;
  description?: string;
  address?: string;
  phone?: string;
}

interface LeadManagementProps {
  bookings: BookingRecord[];
  onUpdateStatus: (id: string, newStatus: string) => void;
}

type TabType = 'All' | 'New' | 'In Progress' | 'Completed' | 'Cancelled';

export default function LeadManagement({ bookings, onUpdateStatus }: LeadManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  
  // Details Modal State
  const [selectedLead, setSelectedLead] = useState<BookingRecord | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });

  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Extract unique service types dynamically
  const uniqueServices = Array.from(
    new Set(bookings.map((b) => b.serviceName).filter(Boolean))
  );

  const dateFilteredBookings = filterByDateRange(bookings, (b) => b.createdAt || b.date, dateFilter);

  const filtered = dateFilteredBookings.filter((b) => {
    // Tab status filter
    const s = b.status.toLowerCase();
    if (activeTab === 'New' && s !== 'new' && s !== 'pending') return false;
    if (activeTab === 'In Progress' && s !== 'accepted' && s !== 'in progress') return false;
    if (activeTab === 'Completed' && s !== 'completed') return false;
    if (activeTab === 'Cancelled' && s !== 'cancelled' && s !== 'rejected') return false;

    // Service Type Filter
    if (serviceFilter !== 'All' && b.serviceName !== serviceFilter) return false;

    // Status Filter (within tab)
    if (statusFilter !== 'All') {
      const displayStatus = getStatusText(b.status);
      if (displayStatus.toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    return true;
  });

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'new' || s === 'pending') return styles.statusNew;
    if (s === 'accepted' || s === 'in progress') return styles.statusProgress;
    if (s === 'completed') return styles.statusCompleted;
    return styles.statusCancelled;
  };

  const getStatusText = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'new' || s === 'pending') return 'New';
    if (s === 'accepted' || s === 'in progress') return 'In Progress';
    if (s === 'completed') return 'Completed';
    return 'Cancelled';
  };

  const activeFilterCount = 
    (serviceFilter !== 'All' ? 1 : 0) +
    (statusFilter !== 'All' ? 1 : 0);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <DateFilter value={dateFilter} onChange={setDateFilter} />

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

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {(['All', 'New', 'In Progress', 'Completed', 'Cancelled'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'All'
              ? bookings.length
              : tab === 'New'
                ? bookings.filter(b => b.status.toLowerCase() === 'new' || b.status.toLowerCase() === 'pending').length
                : tab === 'In Progress'
                  ? bookings.filter(b => b.status.toLowerCase() === 'accepted' || b.status.toLowerCase() === 'in progress').length
                  : tab === 'Completed'
                    ? bookings.filter(b => b.status.toLowerCase() === 'completed').length
                    : bookings.filter(b => b.status.toLowerCase() === 'cancelled' || b.status.toLowerCase() === 'rejected').length;

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

        {/* Leads List */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flash-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No leads found matching criteria</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const shortId = `#LDT${String(item._id).substring(18, 24).toUpperCase()}`;
              return (
                <TouchableOpacity 
                  key={item._id} 
                  style={styles.card}
                  onPress={() => {
                    setSelectedLead(item);
                    setDetailsVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.leadId}>{shortId}</Text>
                    <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                      <Text style={[styles.statusBadgeText, getStatusStyle(item.status)]}>
                        {getStatusText(item.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Meta details */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaField}>
                      <Text style={styles.metaLabel}>Customer</Text>
                      <Text style={styles.metaValue}>{item.customerName || '—'}</Text>
                    </View>
                    <View style={styles.metaField}>
                      <Text style={styles.metaLabel}>Service Type</Text>
                      <Text style={styles.metaValue}>{item.serviceName || '—'}</Text>
                    </View>
                    <View style={styles.metaField}>
                      <Text style={styles.metaLabel}>Date</Text>
                      <Text style={styles.metaValue}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : item.date || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Assignment info */}
                  <View style={styles.footerRow}>
                    {item.workerName ? (
                      <Text style={styles.assignedTo}>Assigned to: <Text style={styles.assignedName}>{item.workerName}</Text></Text>
                    ) : (
                      <Text style={styles.assignedTo}>Status: <Text style={{ color: '#D97706', fontWeight: '700' }}>Unassigned</Text></Text>
                    )}
                  </View>

                  {/* Dropdown status update if pending/active */}
                  {(item.status.toLowerCase() === 'new' || item.status.toLowerCase() === 'pending') && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => onUpdateStatus(item._id, 'accepted')}
                      >
                        <Text style={styles.btnTextWhite}>Accept Lead</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.cancelBtn]}
                        onPress={() => onUpdateStatus(item._id, 'cancelled')}
                      >
                        <Text style={styles.btnTextRed}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
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
              <Text style={modalStyles.headerTitle}>Filter Leads & Bookings</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
              {/* Service Type Filter */}
              <Text style={styles.filterSectionTitle}>Service Type</Text>
              <View style={styles.filterOptionsRow}>
                {['All', ...uniqueServices].map((service) => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.filterOptionBtn,
                      serviceFilter.toLowerCase() === service.toLowerCase() && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setServiceFilter(service)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      serviceFilter.toLowerCase() === service.toLowerCase() && styles.filterOptionTextActive
                    ]}>{service}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status Filter */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptionsRow}>
                {['All', 'New', 'In Progress', 'Completed', 'Cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOptionBtn,
                      statusFilter.toLowerCase() === status.toLowerCase() && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      statusFilter.toLowerCase() === status.toLowerCase() && styles.filterOptionTextActive
                    ]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setServiceFilter('All');
                  setStatusFilter('All');
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Complete Lead Details Modal Sheet */}
      <Modal visible={detailsVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Lead Details & Info</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            {selectedLead && (
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
                {/* ID Header */}
                <View style={modalStyles.leadDetailHeader}>
                  <Text style={modalStyles.leadDetailId}>
                    {`Lead ID: #LDT${String(selectedLead._id).substring(18, 24).toUpperCase()}`}
                  </Text>
                  <View style={[styles.statusBadge, getStatusStyle(selectedLead.status)]}>
                    <Text style={[styles.statusBadgeText, getStatusStyle(selectedLead.status)]}>
                      {getStatusText(selectedLead.status)}
                    </Text>
                  </View>
                </View>

                {/* Service Details Card */}
                <View style={modalStyles.detailCard}>
                  <Text style={modalStyles.detailCardTitle}>{selectedLead.serviceName || 'General Service'}</Text>
                  <Text style={modalStyles.detailCardDesc}>
                    {selectedLead.description || 'Customer requested service assistance through the GigDial platform. Please coordinate immediately.'}
                  </Text>
                </View>

                {/* Information Checklist */}
                <Text style={modalStyles.sectionTitle}>Lead Information</Text>
                <View style={modalStyles.infoGrid}>
                  <View style={modalStyles.infoRow}>
                    <Ionicons name="person-outline" size={18} color="#3B5BFF" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={modalStyles.infoLabel}>Customer Name</Text>
                      <Text style={modalStyles.infoValue}>{selectedLead.customerName || '—'}</Text>
                    </View>
                  </View>

                  <View style={modalStyles.infoRow}>
                    <Ionicons name="build-outline" size={18} color="#3B5BFF" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={modalStyles.infoLabel}>Assigned Professional</Text>
                      <Text style={modalStyles.infoValue}>{selectedLead.workerName || 'Not Assigned Yet'}</Text>
                    </View>
                  </View>

                  <View style={modalStyles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color="#3B5BFF" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={modalStyles.infoLabel}>Scheduled Date & Time</Text>
                      <Text style={modalStyles.infoValue}>
                        {selectedLead.date ? `${selectedLead.date} at ${selectedLead.time || '—'}` : 'Not scheduled'}
                      </Text>
                    </View>
                  </View>

                  <View style={modalStyles.infoRow}>
                    <Ionicons name="location-outline" size={18} color="#3B5BFF" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={modalStyles.infoLabel}>Location / Address</Text>
                      <Text style={modalStyles.infoValue}>{selectedLead.address || 'Mumbai, India'}</Text>
                    </View>
                  </View>

                  <View style={modalStyles.infoRow}>
                    <Ionicons name="time-outline" size={18} color="#3B5BFF" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={modalStyles.infoLabel}>Request Timestamp</Text>
                      <Text style={modalStyles.infoValue}>
                        {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleString() : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Inline Action Buttons if new */}
                {(selectedLead.status.toLowerCase() === 'new' || selectedLead.status.toLowerCase() === 'pending') && (
                  <View style={[styles.actionsRow, { marginTop: 24 }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn, { height: 44 }]}
                      onPress={() => {
                        onUpdateStatus(selectedLead._id, 'accepted');
                        setDetailsVisible(false);
                      }}
                    >
                      <Text style={styles.btnTextWhite}>Accept Lead Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn, { height: 44 }]}
                      onPress={() => {
                        onUpdateStatus(selectedLead._id, 'cancelled');
                        setDetailsVisible(false);
                      }}
                    >
                      <Text style={styles.btnTextRed}>Cancel Lead</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  leadId: { fontSize: 13, fontWeight: 'bold', color: '#3B5BFF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusNew: { backgroundColor: '#DBEAFE', color: '#2563EB' },
  statusProgress: { backgroundColor: '#FEF3C7', color: '#D97706' },
  statusCompleted: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  statusCancelled: { backgroundColor: '#FEE2E2', color: '#EF4444' },
  metaRow: { flexDirection: 'row', gap: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 10 },
  metaField: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#1E2A47' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 12, color: '#6B7280' },
  priceValue: { fontSize: 14, fontWeight: 'bold', color: '#1E2A47' },
  assignedTo: { fontSize: 12, color: '#6B7280' },
  assignedName: { fontWeight: '700', color: '#1E2A47' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: '#3B5BFF' },
  cancelBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  btnTextWhite: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  btnTextRed: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
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
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '90%' },
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
  leadDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leadDetailId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B5BFF',
  },
  detailCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E2A47',
    marginBottom: 8,
  },
  detailCardDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E2A47',
    marginBottom: 12,
  },
  infoGrid: {
    gap: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E2A47',
  },
});
