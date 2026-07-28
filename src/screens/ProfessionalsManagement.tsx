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
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import { API_URL } from '@/api';
import DateFilter, { filterByDateRange, DateFilterState } from '@/components/DateFilter';

interface ProfessionalData {
  _id: string;
  name: string;
  profession: string;
  phone?: string;
  email?: string;
  city?: string;
  profilePhoto?: string;
  isApproved: boolean;
  aadhaarCard?: string;
  panCard?: string;
  role?: string;
  isBlocked?: boolean;
  createdAt?: string;
  joinedDate?: string;
}

interface ProfessionalsManagementProps {
  workers: ProfessionalData[];
  onApproveWorker: (id: string) => void;
  onRejectWorker: (id: string) => void;
  onDeleteWorker: (id: string) => void;
  onToggleBlockWorker: (id: string) => void;
}

export default function ProfessionalsManagement({
  workers,
  onApproveWorker,
  onRejectWorker,
  onDeleteWorker,
  onToggleBlockWorker,
}: ProfessionalsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<ProfessionalData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });

  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [blockFilter, setBlockFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');

  const serverRoot = API_URL.replace('/api', '');

  const getPhotoUri = (photo: string | undefined, name?: string): string => {
    if (!photo || photo.includes('default-avatar.png')) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Worker')}&background=0F2C59&color=fff`;
    }
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    const cleanPhoto = photo.startsWith('/') ? photo : `/${photo}`;
    return `${serverRoot}${cleanPhoto}`;
  };

  const uniqueCities = Array.from(
    new Set(workers.map((w) => w.city || 'Mumbai').filter(Boolean))
  );

  const filteredWorkers = workers.filter((w) => {
    // Only show workers/providers, exclude customers/admins
    if (w.role && w.role.toLowerCase() !== 'worker') return false;

    // Search filter
    const q = searchQuery.toLowerCase();
    const name = w.name ? w.name.toLowerCase() : '';
    const phone = w.phone ? w.phone.toLowerCase() : '';
    const email = w.email ? w.email.toLowerCase() : '';
    const prof = w.profession ? w.profession.toLowerCase() : '';
    const matchesSearch = name.includes(q) || phone.includes(q) || email.includes(q) || prof.includes(q);

    if (!matchesSearch) return false;

    // Verification Filter
    if (verificationFilter !== 'All') {
      const isApproved = w.isApproved ?? false;
      if (verificationFilter === 'Verified' && !isApproved) return false;
      if (verificationFilter === 'Pending' && isApproved) return false;
    }

    // Block Filter
    if (blockFilter !== 'All') {
      const isBlocked = w.isBlocked ?? false;
      if (blockFilter === 'Active' && isBlocked) return false;
      if (blockFilter === 'Suspended' && !isBlocked) return false;
    }

    // City Filter
    if (cityFilter !== 'All') {
      const city = w.city || 'Mumbai';
      if (city.toLowerCase() !== cityFilter.toLowerCase()) return false;
    }

    return true;
  });

  const activeFilterCount = 
    (verificationFilter !== 'All' ? 1 : 0) +
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

        {/* Add Professional Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => alert('Add Professional functionality from Admin Panel')}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Professional</Text>
        </TouchableOpacity>

        {/* List */}
        <View style={styles.listContainer}>
          {filteredWorkers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No professionals found matching criteria</Text>
            </View>
          ) : (
            filteredWorkers.map((w) => (
              <View key={w._id} style={styles.workerCard}>
                <Image source={{ uri: getPhotoUri(w.profilePhoto, w.name) }} style={styles.avatar} />
                <View style={styles.infoContainer}>
                  <Text style={styles.nameText}>{w.name || '—'}</Text>
                  <Text style={styles.phoneText}>{w.phone || '—'}</Text>
                  <Text style={styles.profText}>{w.profession || '—'}</Text>
                  <View style={styles.statusBadgeRow}>
                    <View style={[
                      styles.statusPill,
                      w.isApproved ? styles.statusPillVerified : styles.statusPillPending
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        w.isApproved ? styles.statusTextVerified : styles.statusTextPending
                      ]}>
                        {w.isApproved ? 'Verified' : 'Pending'}
                      </Text>
                    </View>

                    {w.isBlocked && (
                      <View style={[styles.statusPill, styles.statusPillBlocked, { marginLeft: 6 }]}>
                        <Text style={[styles.statusPillText, styles.statusTextBlocked]}>
                          Suspended
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => {
                    setSelectedWorker(w);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.viewButtonText}>View</Text>
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
              <Text style={modalStyles.headerTitle}>Filter Professionals</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
              {/* Verification Filter */}
              <Text style={styles.filterSectionTitle}>Verification Status</Text>
              <View style={styles.filterOptionsRow}>
                {['All', 'Verified', 'Pending'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOptionBtn,
                      verificationFilter === status && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setVerificationFilter(status)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      verificationFilter === status && styles.filterOptionTextActive
                    ]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Block Status Filter */}
              <Text style={styles.filterSectionTitle}>Account Status</Text>
              <View style={styles.filterOptionsRow}>
                {['All', 'Active', 'Suspended'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOptionBtn,
                      blockFilter === status && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setBlockFilter(status)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      blockFilter === status && styles.filterOptionTextActive
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
                  setVerificationFilter('All');
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

      {/* Modal Profile Sheet */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Professional Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            {selectedWorker && (
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Warning Alert banner if not approved */}
                {!selectedWorker.isApproved && (
                  <View style={modalStyles.warningBanner}>
                    <Ionicons name="warning" size={18} color="#D97706" style={{ marginRight: 8 }} />
                    <Text style={modalStyles.warningBannerText}>
                      Unverified Information - Pending Admin Review
                    </Text>
                  </View>
                )}

                <View style={modalStyles.profileHeader}>
                  <Image source={{ uri: getPhotoUri(selectedWorker.profilePhoto) }} style={modalStyles.profileAvatar} />
                  <Text style={modalStyles.profileName}>{selectedWorker.name || '—'}</Text>
                  <Text style={modalStyles.profileSub}>{selectedWorker.profession || 'Service Provider'}</Text>
                  <View style={styles.statusBadgeRow}>
                    <View style={[
                      styles.statusPill,
                      selectedWorker.isApproved ? styles.statusPillVerified : styles.statusPillPending,
                      { marginTop: 8 }
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        selectedWorker.isApproved ? styles.statusTextVerified : styles.statusTextPending
                      ]}>
                        {selectedWorker.isApproved ? 'Verified' : 'Pending'}
                      </Text>
                    </View>

                    {selectedWorker.isBlocked && (
                      <View style={[
                        styles.statusPill,
                        styles.statusPillBlocked,
                        { marginTop: 8, marginLeft: 6 }
                      ]}>
                        <Text style={[styles.statusPillText, styles.statusTextBlocked]}>
                          Suspended
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Grid Details */}
                <View style={modalStyles.detailsCard}>
                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>Phone</Text>
                    <Text style={modalStyles.detailValue}>{selectedWorker.phone || 'Not provided'}</Text>
                  </View>
                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>Email</Text>
                    <Text style={modalStyles.detailValue}>{selectedWorker.email || 'Not provided'}</Text>
                  </View>
                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>City</Text>
                    <Text style={modalStyles.detailValue}>{selectedWorker.city || 'Not provided'}</Text>
                  </View>
                </View>

                {/* Documents */}
                <View style={modalStyles.documentsContainer}>
                  <Text style={modalStyles.sectionTitle}>Verification Documents</Text>

                  <Text style={modalStyles.docLabel}>Aadhaar Card (Click to view full screen)</Text>
                  {selectedWorker.aadhaarCard ? (
                    <TouchableOpacity onPress={() => setFullscreenImage(getPhotoUri(selectedWorker.aadhaarCard))}>
                      <Image source={{ uri: getPhotoUri(selectedWorker.aadhaarCard) }} style={modalStyles.docImage} resizeMode="contain" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={modalStyles.noDocText}>Aadhaar Card not uploaded</Text>
                  )}

                  <Text style={modalStyles.docLabel}>PAN Card (Click to view full screen)</Text>
                  {selectedWorker.panCard ? (
                    <TouchableOpacity onPress={() => setFullscreenImage(getPhotoUri(selectedWorker.panCard))}>
                      <Image source={{ uri: getPhotoUri(selectedWorker.panCard) }} style={modalStyles.docImage} resizeMode="contain" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={modalStyles.noDocText}>PAN Card not uploaded</Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={modalStyles.actions}>
                  <View style={modalStyles.actionRow}>
                    <TouchableOpacity
                      style={[
                        modalStyles.actionBtn, 
                        selectedWorker.isBlocked ? modalStyles.unblockBtn : modalStyles.blockBtn
                      ]}
                      onPress={() => {
                        onToggleBlockWorker(selectedWorker._id);
                        setModalVisible(false);
                      }}
                    >
                      <Ionicons 
                        name={selectedWorker.isBlocked ? "checkmark-circle-outline" : "ban-outline"} 
                        size={18} 
                        color={selectedWorker.isBlocked ? "#16A34A" : "#D97706"} 
                      />
                      <Text style={selectedWorker.isBlocked ? modalStyles.btnTextGreen : modalStyles.btnTextOrange}>
                        {selectedWorker.isBlocked ? 'Unblock Account' : 'Block Account'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!selectedWorker.isApproved && (
                    <View style={modalStyles.actionRow}>
                      <TouchableOpacity
                        style={[modalStyles.actionBtn, modalStyles.approveBtn]}
                        onPress={() => {
                          onApproveWorker(selectedWorker._id);
                          setModalVisible(false);
                        }}
                      >
                        <Text style={modalStyles.btnTextWhite}>Approve Profile</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[modalStyles.actionBtn, modalStyles.rejectBtn]}
                        onPress={() => {
                          onRejectWorker(selectedWorker._id);
                          setModalVisible(false);
                        }}
                      >
                        <Text style={modalStyles.btnTextRed}>Reject Profile</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[modalStyles.actionBtn, modalStyles.deleteBtn]}
                    onPress={() => {
                      onDeleteWorker(selectedWorker._id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={modalStyles.btnTextRed}>Delete Account Permanently</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={fullscreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={modalStyles.fullscreenOverlay}>
          <TouchableOpacity 
            style={modalStyles.fullscreenCloseBtn}
            onPress={() => setFullscreenImage(null)}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={modalStyles.fullscreenCloseText}>Back</Text>
          </TouchableOpacity>
          {fullscreenImage && (
            <Image 
              source={{ uri: fullscreenImage }} 
              style={modalStyles.fullscreenImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E2A47', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
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
  addButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B5BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  listContainer: { gap: 12 },
  workerCard: {
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
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F3F4F6', marginRight: 14 },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: 'bold', color: '#1E2A47' },
  phoneText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  profText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadgeRow: { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillVerified: { backgroundColor: '#DCFCE7' },
  statusPillPending: { backgroundColor: '#FEF3C7' },
  statusPillBlocked: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusTextVerified: { color: '#16A34A' },
  statusTextPending: { color: '#D97706' },
  statusTextBlocked: { color: '#EF4444' },
  viewButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: { fontSize: 13, fontWeight: '700', color: '#1E2A47' },
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
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 40 },
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
  profileHeader: { alignItems: 'center', paddingVertical: 20 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 10, backgroundColor: '#F3F4F6' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#1E2A47' },
  profileSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  detailsCard: { marginHorizontal: 20, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 16, gap: 10, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1E2A47' },
  documentsContainer: { marginHorizontal: 20, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E2A47', marginBottom: 12 },
  docLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 6, marginBottom: 4 },
  docImage: { width: '100%', height: 160, borderRadius: 8, backgroundColor: '#E5E8EC', marginBottom: 10 },
  noDocText: { fontSize: 12, color: '#EF4444', fontStyle: 'italic', marginBottom: 10 },
  actions: { paddingHorizontal: 20, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  approveBtn: { backgroundColor: '#3B5BFF' },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  blockBtn: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5' },
  unblockBtn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7' },
  deleteBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', width: '100%' },
  btnTextWhite: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  btnTextRed: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  btnTextOrange: { color: '#D97706', fontSize: 14, fontWeight: '700' },
  btnTextGreen: { color: '#16A34A', fontSize: 14, fontWeight: '700' },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 9999,
    gap: 6,
  },
  fullscreenCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
  },
  warningBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
});
