import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import { API_URL } from '@/api';
import DateFilter, { filterByDateRange, DateFilterState } from '@/components/DateFilter';

interface CustomerData {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  profilePhoto?: string;
  isBlocked: boolean;
  role?: string;
  createdAt?: string;
  joinedDate?: string;
}

interface CustomerManagementProps {
  customers: CustomerData[];
  onToggleBlock: (id: string) => void;
  onDeleteUser: (id: string) => void;
}

export default function CustomerManagement({
  customers,
  onToggleBlock,
  onDeleteUser,
}: CustomerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });

  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [blockFilter, setBlockFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');

  const serverRoot = API_URL.replace('/api', '');

  const getPhotoUri = (photo: string | undefined, name?: string): string => {
    if (!photo || photo.includes('default-avatar.png')) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Customer')}&background=0F2C59&color=fff`;
    }
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    const cleanPhoto = photo.startsWith('/') ? photo : `/${photo}`;
    return `${serverRoot}${cleanPhoto}`;
  };

  const dateFilteredCustomers = filterByDateRange(customers, (c) => c.createdAt || c.joinedDate, dateFilter);

  const filteredCustomers = dateFilteredCustomers.filter((c) => {
    // Only show customer role to exclude workers/admins
    const role = (c.role || 'customer').toLowerCase();
    if (role !== 'customer') return false;

    const q = searchQuery.toLowerCase();
    const name = c.name ? c.name.toLowerCase() : '';
    const phone = c.phone ? c.phone.toLowerCase() : '';
    const email = c.email ? c.email.toLowerCase() : '';
    const matchesSearch = name.includes(q) || phone.includes(q) || email.includes(q);
    if (!matchesSearch) return false;

    // Block Filter
    if (blockFilter !== 'All') {
      const isBlocked = c.isBlocked ?? false;
      if (blockFilter === 'Active' && isBlocked) return false;
      if (blockFilter === 'Suspended' && !isBlocked) return false;
    }

    // City Filter
    if (cityFilter !== 'All') {
      const city = c.city || 'Mumbai';
      if (city.toLowerCase() !== cityFilter.toLowerCase()) return false;
    }

    return true;
  });

  const uniqueCities = Array.from(
    new Set(customers.map((c) => c.city || 'Mumbai').filter(Boolean))
  );

  const activeFilterCount = 
    (blockFilter !== 'All' ? 1 : 0) +
    (cityFilter !== 'All' ? 1 : 0);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <DateFilter value={dateFilter} onChange={setDateFilter} />

        {/* Search & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              placeholder="Search by name, email, phone..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
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

        {/* List */}
        <View style={styles.listContainer}>
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No customers found matching filters</Text>
            </View>
          ) : (
            filteredCustomers.map((c) => (
              <View key={c._id} style={styles.card}>
                <Image source={{ uri: getPhotoUri(c.profilePhoto, c.name) }} style={styles.avatar} />
                <View style={styles.infoContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.nameText}>{c.name || '—'}</Text>
                    <View style={[
                      styles.roleBadge,
                      (c.role || 'customer').toLowerCase() === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeCustomer
                    ]}>
                      <Text style={styles.roleBadgeText}>{(c.role || 'customer').toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.phoneText}>{c.phone || '—'}</Text>
                  <Text style={styles.cityText}>{c.city || '—'}</Text>
                  <View style={styles.statusBadgeRow}>
                    <View style={[
                      styles.statusPill,
                      c.isBlocked ? styles.statusPillBlocked : styles.statusPillActive
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        c.isBlocked ? styles.statusTextBlocked : styles.statusTextActive
                      ]}>
                        {c.isBlocked ? 'Blocked' : 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedCustomer(c);
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Filter Customers</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
              {/* Account Status Filter */}
              <Text style={styles.filterSectionTitle}>Account Status</Text>
              <View style={styles.filterOptionsRow}>
                {['All', 'Active', 'Suspended'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOptionBtn,
                      (status === 'Suspended' ? blockFilter === 'Suspended' : blockFilter === status) && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setBlockFilter(status)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      (status === 'Suspended' ? blockFilter === 'Suspended' : blockFilter === status) && styles.filterOptionTextActive
                    ]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* City Filter */}
              <Text style={styles.filterSectionTitle}>City</Text>
              <View style={styles.filterOptionsRow}>
                {['All', ...uniqueCities].map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.filterOptionBtn,
                      cityFilter === city && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setCityFilter(city)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      cityFilter === city && styles.filterOptionTextActive
                    ]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setBlockFilter('All');
                  setCityFilter('All');
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Action Sheet Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Customer Actions</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <View style={modalStyles.content}>
                {/* Details */}
                <View style={modalStyles.customerSummary}>
                  <Image source={{ uri: getPhotoUri(selectedCustomer.profilePhoto) }} style={modalStyles.summaryAvatar} />
                  <Text style={modalStyles.summaryName}>{selectedCustomer.name}</Text>
                  <Text style={modalStyles.summaryPhone}>{selectedCustomer.phone}</Text>
                  {selectedCustomer.email && (
                    <Text style={modalStyles.summaryEmail}>{selectedCustomer.email}</Text>
                  )}
                </View>

                {/* Actions */}
                <View style={modalStyles.btnList}>
                  <TouchableOpacity
                    style={[modalStyles.actionBtn, selectedCustomer.isBlocked ? modalStyles.unblockBtn : modalStyles.blockBtn]}
                    onPress={() => {
                      onToggleBlock(selectedCustomer._id);
                      setModalVisible(false);
                    }}
                  >
                    <Ionicons name={selectedCustomer.isBlocked ? 'checkmark-circle-outline' : 'ban-outline'} size={18} color="#FFFFFF" />
                    <Text style={modalStyles.btnTextWhite}>
                      {selectedCustomer.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[modalStyles.actionBtn, modalStyles.deleteBtn]}
                    onPress={() => {
                      onDeleteUser(selectedCustomer._id);
                      setModalVisible(false);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={modalStyles.btnTextRed}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchContainer: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1E2A47' },
  filterButton: {
    height: 44,
    borderRadius: 22,
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
  listContainer: { gap: 12 },
  card: {
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
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F3F4F6', marginRight: 14 },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: 'bold', color: '#1E2A47' },
  phoneText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cityText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadgeRow: { flexDirection: 'row', marginTop: 6 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillActive: { backgroundColor: '#DCFCE7' },
  statusPillBlocked: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: '#16A34A' },
  statusTextBlocked: { color: '#EF4444' },
  actionButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  roleBadgeCustomer: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  roleBadgeAdmin: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
  },
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
  content: { padding: 20 },
  customerSummary: { alignItems: 'center', marginBottom: 24 },
  summaryAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6', marginBottom: 8 },
  summaryName: { fontSize: 16, fontWeight: '700', color: '#1E2A47' },
  summaryPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  summaryEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  btnList: { gap: 12 },
  actionBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  blockBtn: { backgroundColor: '#EF4444' },
  unblockBtn: { backgroundColor: '#16A34A' },
  deleteBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  btnTextWhite: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  btnTextRed: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
});
