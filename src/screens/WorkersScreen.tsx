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
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import StatusPill from '@/components/StatusPill';
import { WorkerData } from '@/constants/mockData';
import { API_URL } from '@/api';

const getProfilePhotoUri = (photo: string | undefined, name?: string): string => {
  const serverRoot = API_URL.replace('/api', '');
  if (!photo || photo.includes('default-avatar') || photo.startsWith('assets/')) {
    const displayName = name || 'Worker';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0F2C59&color=fff&bold=true`;
  }
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo;
  }
  const cleanPath = photo.startsWith('/') ? photo.substring(1) : photo;
  return `${serverRoot}/${cleanPath}`;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkersScreenProps {
  workers: WorkerData[];
  onApproveWorker: (id: string) => void;
  onRejectWorker: (id: string) => void;
  onDeleteWorker: (id: string) => void;
}

// ─── Worker Profile Modal ────────────────────────────────────────────────────
function WorkerProfileModal({
  worker,
  visible,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: {
  worker: WorkerData | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!worker) return null;

  const initials = worker.name
    ? worker.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Worker Profile</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.primaryNavy} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avatar + Name */}
            <View style={modalStyles.avatarSection}>
              <Image
                source={{ uri: getProfilePhotoUri(worker.profilePhoto) }}
                style={modalStyles.avatarImage}
              />
              <Text style={modalStyles.workerName}>{worker.name || '—'}</Text>
              <Text style={modalStyles.workerProfession}>{worker.profession || 'Service Provider'}</Text>
              <View style={modalStyles.statusRow}>
                <StatusPill status={worker.isApproved ? 'approved' : 'pending'} />
              </View>
            </View>

            {/* Details */}
            <View style={modalStyles.detailsCard}>
              <ProfileRow icon="call-outline" label="Phone" value={worker.phone || 'Not provided'} />
              <ProfileRow icon="mail-outline" label="Email" value={worker.email || 'Not provided'} />
              <ProfileRow icon="location-outline" label="City" value={worker.city || 'Not provided'} />
              <ProfileRow icon="briefcase-outline" label="Category" value={worker.profession || 'Not provided'} />
              <ProfileRow icon="shield-checkmark-outline" label="Worker ID" value={String(worker._id)} isLast />
            </View>

            {/* Verification Documents */}
            <View style={modalStyles.documentsSection}>
              <Text style={modalStyles.sectionTitle}>Verification Documents</Text>
              
              <Text style={modalStyles.documentLabel}>Aadhaar Card (Front & Back)</Text>
              {worker.aadhaarCard ? (
                <Image
                  source={{ uri: getProfilePhotoUri(worker.aadhaarCard) }}
                  style={modalStyles.documentImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={modalStyles.noDocumentText}>Aadhaar Card not uploaded</Text>
              )}

              <Text style={modalStyles.documentLabel}>PAN Card (Front Side)</Text>
              {worker.panCard ? (
                <Image
                  source={{ uri: getProfilePhotoUri(worker.panCard) }}
                  style={modalStyles.documentImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={modalStyles.noDocumentText}>PAN Card not uploaded</Text>
              )}
            </View>

            {/* Actions */}
            <View style={modalStyles.actionsSection}>
              {!worker.isApproved && (
                <>
                  <TouchableOpacity
                    style={[modalStyles.actionBtn, modalStyles.approveBtn]}
                    onPress={() => { onApprove(worker._id); onClose(); }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={modalStyles.actionBtnText}>Approve Worker</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.actionBtn, modalStyles.rejectBtn]}
                    onPress={() => { onReject(worker._id); onClose(); }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={theme.colors.dangerRed} />
                    <Text style={[modalStyles.actionBtnText, { color: theme.colors.dangerRed }]}>Reject Worker</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={[modalStyles.actionBtn, modalStyles.deleteBtn]}
                onPress={() => { onDelete(worker._id); onClose(); }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.dangerRed} />
                <Text style={[modalStyles.actionBtnText, { color: theme.colors.dangerRed }]}>Delete Worker</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: any;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[modalStyles.profileRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={modalStyles.profileRowIcon}>
        <Ionicons name={icon} size={16} color={theme.colors.primaryBlue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={modalStyles.profileRowLabel}>{label}</Text>
        <Text style={modalStyles.profileRowValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Worker Row ──────────────────────────────────────────────────────────────
function WorkerRow({
  worker,
  onApproveWorker,
  onRejectWorker,
  onDeleteWorker,
  onViewProfile,
}: {
  worker: WorkerData;
  onApproveWorker: (id: string) => void;
  onRejectWorker: (id: string) => void;
  onDeleteWorker: (id: string) => void;
  onViewProfile: (worker: WorkerData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.rowCard}>
      {/* Primary: Name + Profession + toggle */}
      <TouchableOpacity style={styles.primaryRow} onPress={toggle} activeOpacity={0.7}>
        <Image
          source={{ uri: getProfilePhotoUri(worker.profilePhoto) }}
          style={styles.avatar}
        />
        <View style={styles.primaryFields}>
          <Text style={styles.nameText} numberOfLines={1}>
            {worker.name || '—'}
          </Text>
          <Text style={styles.subText}>{worker.profession || '—'}</Text>
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
            <Text style={styles.expandLabel}>Status</Text>
            <StatusPill status={worker.isApproved ? 'approved' : 'pending'} />
          </View>
          <View style={styles.documentsContainer}>
            <Text style={styles.documentLabel}>Aadhaar Card (Front & Back)</Text>
            {worker.aadhaarCard ? (
              <Image
                source={{ uri: getProfilePhotoUri(worker.aadhaarCard) }}
                style={styles.documentImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.noDocumentText}>Aadhaar Card not uploaded</Text>
            )}

            <Text style={styles.documentLabel}>PAN Card (Front Side)</Text>
            {worker.panCard ? (
              <Image
                source={{ uri: getProfilePhotoUri(worker.panCard) }}
                style={styles.documentImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.noDocumentText}>PAN Card not uploaded</Text>
            )}
          </View>
          <View style={[styles.expandedRow, styles.actionRow]}>
            {/* View Profile button - always shown */}
            <TouchableOpacity
              style={styles.actionChip}
              onPress={() => onViewProfile(worker)}
            >
              <Ionicons name="person-outline" size={14} color={theme.colors.primaryBlue} />
              <Text style={[styles.chipText, { color: theme.colors.primaryBlue }]}>
                View Profile
              </Text>
            </TouchableOpacity>

            {!worker.isApproved && (
              <>
                <TouchableOpacity
                  style={[styles.actionChip, styles.chipGreen]}
                  onPress={() => onApproveWorker(worker._id)}
                >
                  <Ionicons name="checkmark-outline" size={14} color={theme.colors.success.text} />
                  <Text style={[styles.chipText, { color: theme.colors.success.text }]}>
                    Approve
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionChip, styles.chipRed]}
                  onPress={() => onRejectWorker(worker._id)}
                >
                  <Ionicons name="close-outline" size={14} color={theme.colors.dangerRed} />
                  <Text style={[styles.chipText, { color: theme.colors.dangerRed }]}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.actionChip, styles.chipRed]}
              onPress={() => onDeleteWorker(worker._id)}
            >
              <Ionicons name="trash-outline" size={14} color={theme.colors.dangerRed} />
              <Text style={[styles.chipText, { color: theme.colors.dangerRed }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function WorkersScreen({
  workers,
  onApproveWorker,
  onRejectWorker,
  onDeleteWorker,
}: WorkersScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const filteredWorkers = workers.filter((w) => {
    const q = searchQuery.toLowerCase();
    const name = w.name ? String(w.name).toLowerCase() : '';
    const profession = w.profession ? String(w.profession).toLowerCase() : '';
    return name.includes(q) || profession.includes(q);
  });

  const handleViewProfile = (worker: WorkerData) => {
    setSelectedWorker(worker);
    setProfileModalVisible(true);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenHeader}>Manage Workers</Text>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color={theme.colors.mutedGray} style={styles.searchIcon} />
          <TextInput
            placeholder="Search Worker"
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
          <View style={{ width: 52 }} />
          <Text style={[styles.columnHeaderText, { flex: 1 }]}>Name</Text>
          <Text style={[styles.columnHeaderText, { flex: 1 }]}>Profession</Text>
          <Text style={[styles.columnHeaderText, { width: 36 }]}>  </Text>
        </View>

        {filteredWorkers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No workers found</Text>
          </View>
        ) : (
          filteredWorkers.map((worker) => (
            <WorkerRow
              key={worker._id}
              worker={worker}
              onApproveWorker={onApproveWorker}
              onRejectWorker={onRejectWorker}
              onDeleteWorker={onDeleteWorker}
              onViewProfile={handleViewProfile}
            />
          ))
        )}
      </ScrollView>

      {/* Profile Modal */}
      <WorkerProfileModal
        worker={selectedWorker}
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onApprove={onApproveWorker}
        onReject={onRejectWorker}
        onDelete={onDeleteWorker}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
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
    width: 80,
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
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: theme.colors.mutedGray, fontSize: 15, marginTop: 12 },
  documentsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    width: '100%',
  },
  documentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.mutedGray,
    marginTop: 6,
    marginBottom: 4,
  },
  documentImage: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    backgroundColor: '#EEF1F6',
    marginBottom: 8,
  },
  noDocumentText: {
    fontSize: 12,
    color: theme.colors.dangerRed,
    fontStyle: 'italic',
    marginBottom: 8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primaryNavy,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  workerName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primaryNavy,
    marginBottom: 4,
  },
  workerProfession: {
    fontSize: 14,
    color: theme.colors.mutedGray,
    marginBottom: 10,
  },
  statusRow: {
    alignItems: 'center',
  },
  detailsCard: {
    marginHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
    gap: 12,
  },
  profileRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRowLabel: {
    fontSize: 11,
    color: theme.colors.mutedGray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  profileRowValue: {
    fontSize: 14,
    color: theme.colors.primaryNavy,
    fontWeight: '500',
  },
  actionsSection: {
    paddingHorizontal: 20,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  approveBtn: {
    backgroundColor: theme.colors.primaryBlue,
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  documentsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryNavy,
    marginBottom: 12,
  },
  documentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.mutedGray,
    marginTop: 8,
    marginBottom: 6,
  },
  documentImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#EEF1F6',
    marginBottom: 12,
  },
  noDocumentText: {
    fontSize: 13,
    color: theme.colors.dangerRed,
    fontStyle: 'italic',
    marginBottom: 12,
  },
});
