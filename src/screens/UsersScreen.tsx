import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import StatusPill from '@/components/StatusPill';
import { UserData } from '@/constants/mockData';
import { API_URL } from '@/api';

const getProfilePhotoUri = (photo: string | undefined, name?: string): string => {
  const serverRoot = API_URL.replace('/api', '');
  if (!photo || photo.includes('default-avatar') || photo.startsWith('assets/')) {
    const displayName = name || 'User';
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

interface UsersScreenProps {
  users: UserData[];
  onToggleBlock: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onApproveWorker?: (id: string) => void;
  title?: string;
}

function UserRow({
  user,
  onToggleBlock,
  onDeleteUser,
  onApproveWorker,
}: {
  user: UserData;
  onToggleBlock: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onApproveWorker?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.rowCard}>
      {/* ── Primary row: Name + Phone + expand button ── */}
      <TouchableOpacity style={styles.primaryRow} onPress={toggle} activeOpacity={0.7}>
        <Image
          source={{ uri: getProfilePhotoUri(user.profilePhoto) }}
          style={styles.avatar}
        />
        <View style={styles.primaryFields}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={styles.nameText} numberOfLines={1}>
              {user.name || '—'}
            </Text>
            <View style={[
              styles.roleBadge,
              (user.role || '').toLowerCase() === 'worker' ? styles.roleWorker : (user.role || '').toLowerCase() === 'admin' ? styles.roleAdmin : styles.roleCustomer
            ]}>
              <Text style={styles.roleText}>{(user.role || 'customer').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.phoneText}>{user.phone || '—'}</Text>
        </View>
        <View style={styles.expandBtn}>
          <Ionicons
            name={expanded ? 'remove-circle' : 'add-circle'}
            size={24}
            color={expanded ? '#EF4444' : theme.colors.primaryBlue}
          />
        </View>
      </TouchableOpacity>

      {/* ── Dropdown: City, Status, Actions ── */}
      {expanded && (
        <View style={styles.expandedPanel}>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>City</Text>
            <Text style={styles.expandValue}>{user.city || '—'}</Text>
          </View>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Role</Text>
            <Text style={[styles.expandValue, { textTransform: 'capitalize', fontWeight: 'bold' }]}>
              {user.role || 'Customer'}
            </Text>
          </View>
          <View style={styles.expandedRow}>
            <Text style={styles.expandLabel}>Status</Text>
            <StatusPill status={user.isBlocked ? 'suspended' : (user.role === 'worker' && !user.isApproved ? 'pending' : 'active')} />
          </View>
          {user.role === 'worker' && (
            <View style={styles.documentsContainer}>
              <Text style={styles.documentLabel}>Aadhaar Card (Front & Back)</Text>
              {user.aadhaarCard ? (
                <Image
                  source={{ uri: getProfilePhotoUri(user.aadhaarCard) }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.noDocumentText}>Aadhaar Card not uploaded</Text>
              )}

              <Text style={styles.documentLabel}>PAN Card (Front Side)</Text>
              {user.panCard ? (
                <Image
                  source={{ uri: getProfilePhotoUri(user.panCard) }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.noDocumentText}>PAN Card not uploaded</Text>
              )}
            </View>
          )}
          <View style={[styles.expandedRow, styles.actionRow]}>
            {user.role === 'worker' && !user.isApproved && onApproveWorker && (
              <TouchableOpacity
                onPress={() => onApproveWorker(user._id)}
                style={[styles.actionLink, { marginRight: 16 }]}
              >
                <Text style={[styles.actionLinkText, { color: theme.colors.success.text }]}>
                  Approve
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => onToggleBlock(user._id)}
              style={styles.actionLink}
            >
              <Text style={[styles.actionLinkText, { color: theme.colors.warning.text }]}>
                {user.isBlocked ? 'Activate' : 'Suspend'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDeleteUser(user._id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.dangerRed} />
              <Text style={[styles.actionLinkText, { color: theme.colors.dangerRed, marginLeft: 4 }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function UsersScreen({ users, onToggleBlock, onDeleteUser, onApproveWorker, title }: UsersScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspended' | 'rejected'>('all');

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const name = u.name ? String(u.name).toLowerCase() : '';
    const phone = u.phone ? String(u.phone).toLowerCase() : '';
    const city = u.city ? String(u.city).toLowerCase() : '';
    const matchesSearch = name.includes(q) || phone.includes(q) || city.includes(q);

    if (!matchesSearch) return false;

    const normalizedKyc = (u.kycStatus || '').toLowerCase();
    if (statusFilter === 'all') return true;
    if (statusFilter === 'approved') return u.role === 'worker' && u.isApproved;
    if (statusFilter === 'pending') return u.role === 'worker' && normalizedKyc === 'pending';
    if (statusFilter === 'suspended') return u.isBlocked;
    if (statusFilter === 'rejected') return u.role === 'worker' && normalizedKyc === 'rejected';

    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenHeader}>{title || 'Manage Users'}</Text>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={theme.colors.mutedGray} style={styles.searchIcon} />
        <TextInput
          placeholder="Search User"
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

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContentContainer}
      >
        {[
          { label: 'All', value: 'all' },
          { label: 'Pending Approval', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Suspended', value: 'suspended' },
          { label: 'Rejected', value: 'rejected' },
        ].map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value as any)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Column Header */}
      <View style={styles.columnHeaderRow}>
        <View style={{ width: 52 }} />
        <Text style={[styles.columnHeaderText, { flex: 1 }]}>Name</Text>
        <Text style={[styles.columnHeaderText, { flex: 1 }]}>Phone</Text>
        <Text style={[styles.columnHeaderText, { width: 36 }]}>  </Text>
      </View>

      {/* Rows */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        filteredUsers.map((user) => (
          <UserRow
            key={user._id}
            user={user}
            onToggleBlock={onToggleBlock}
            onDeleteUser={onDeleteUser}
            onApproveWorker={onApproveWorker}
          />
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
  // Card row
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
  phoneText: {
    fontSize: 13,
    color: theme.colors.mutedGray,
  },
  expandBtn: { marginLeft: 8 },
  // Expanded dropdown panel
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
  expandValue: {
    fontSize: 14,
    color: theme.colors.primaryNavy,
    flex: 1,
  },
  actionRow: {
    borderBottomWidth: 0,
    marginTop: 4,
    justifyContent: 'flex-start',
    gap: 16,
  },
  actionLink: { flexDirection: 'row', alignItems: 'center' },
  actionLinkText: { fontSize: 14, fontWeight: '600' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: theme.colors.mutedGray, fontSize: 15, marginTop: 12 },
  filterScrollView: {
    marginBottom: 16,
    flexGrow: 0,
  },
  filterContentContainer: {
    gap: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEF1F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryBlue,
    borderColor: theme.colors.primaryBlue,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryNavy,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  documentsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
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
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleWorker: {
    backgroundColor: '#FEF3C7',
  },
  roleAdmin: {
    backgroundColor: '#F3E8FF',
  },
  roleCustomer: {
    backgroundColor: '#EFF6FF',
  },
  roleText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
});
