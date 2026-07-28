import React, { useState } from 'react';
import {
  View,
  Text,
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

interface WorkerRequest {
  _id: string;
  name: string;
  profession: string;
  city?: string;
  phone?: string;
  profilePhoto?: string;
  aadhaarCard?: string;
  panCard?: string;
  isApproved: boolean;
}

interface VerificationPanelProps {
  workers: WorkerRequest[];
  onApproveWorker: (id: string) => void;
  onRejectWorker: (id: string) => void;
}

type TabType = 'All' | 'Pending' | 'Verified' | 'Rejected';

export default function VerificationPanel({
  workers,
  onApproveWorker,
  onRejectWorker,
}: VerificationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Pending');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dropdownId, setDropdownId] = useState<string | null>(null);

  const serverRoot = API_URL.replace('/api', '');

  const getPhotoUri = (photo: string | undefined, name?: string): string => {
    if (!photo || photo.includes('default-avatar') || photo.startsWith('assets/')) {
      const displayName = name || 'Worker';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0F2C59&color=fff&bold=true`;
    }
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    const cleanPath = photo.startsWith('/') ? photo.substring(1) : photo;
    return `${serverRoot}/${cleanPath}`;
  };

  const filtered = workers.filter((w) => {
    if (activeTab === 'Pending') return !w.isApproved;
    if (activeTab === 'Verified') return w.isApproved;
    if (activeTab === 'Rejected') return false;
    return true;
  });

  const toggleDropdown = (id: string) => {
    setDropdownId(dropdownId === id ? null : id);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {(['All', 'Pending', 'Verified', 'Rejected'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'All' 
              ? workers.length 
              : tab === 'Pending' 
                ? workers.filter(w => !w.isApproved).length 
                : tab === 'Verified' 
                  ? workers.filter(w => w.isApproved).length 
                  : 0;

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

        {/* List of cards */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No requests in this category</Text>
            </View>
          ) : (
            filtered.map((w) => {
              const isExpanded = dropdownId === w._id;
              const locationText = w.city ? `, ${w.city}` : '';
              return (
                <View key={w._id} style={styles.card}>
                  {/* Top Row: Name and status */}
                  <View style={styles.cardHeader}>
                    <Image source={{ uri: getPhotoUri(w.profilePhoto) }} style={styles.avatar} />
                    <View style={styles.meta}>
                      <Text style={styles.nameText}>{w.name || '—'}</Text>
                      <Text style={styles.subText}>{(w.profession || '—') + locationText}</Text>
                    </View>
                    <View style={[styles.statusBadge, w.isApproved ? styles.statusVerified : styles.statusPending]}>
                      <Text style={[styles.statusBadgeText, w.isApproved ? styles.statusVerifiedText : styles.statusPendingText]}>
                        {w.isApproved ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Documents Section */}
                  <Text style={styles.docsSectionHeader}>Submitted Documents</Text>
                  <View style={styles.docsRow}>
                    {/* Aadhaar Box */}
                    <TouchableOpacity 
                      style={styles.docBox} 
                      onPress={() => {
                        if (w.aadhaarCard) setPreviewImage(getPhotoUri(w.aadhaarCard));
                        else alert('Aadhaar card not uploaded');
                      }}
                    >
                      <Ionicons name="card-outline" size={20} color="#3B5BFF" />
                      <Text style={styles.docBoxText}>Aadhaar</Text>
                      {w.aadhaarCard ? <View style={styles.dotIndicator} /> : null}
                    </TouchableOpacity>

                    {/* PAN Box */}
                    <TouchableOpacity 
                      style={styles.docBox}
                      onPress={() => {
                        if (w.panCard) setPreviewImage(getPhotoUri(w.panCard));
                        else alert('PAN card not uploaded');
                      }}
                    >
                      <Ionicons name="document-text-outline" size={20} color="#3B5BFF" />
                      <Text style={styles.docBoxText}>PAN</Text>
                      {w.panCard ? <View style={styles.dotIndicator} /> : null}
                    </TouchableOpacity>

                    {/* Photo Box */}
                    <TouchableOpacity 
                      style={styles.docBox}
                      onPress={() => {
                        if (w.profilePhoto) setPreviewImage(getPhotoUri(w.profilePhoto));
                        else alert('Photo not uploaded');
                      }}
                    >
                      <Ionicons name="image-outline" size={20} color="#3B5BFF" />
                      <Text style={styles.docBoxText}>Photo</Text>
                      {w.profilePhoto ? <View style={styles.dotIndicator} /> : null}
                    </TouchableOpacity>
                  </View>

                  {/* Expand / View Details Dropdown Toggle */}
                  <TouchableOpacity style={styles.dropdownToggle} onPress={() => toggleDropdown(w._id)}>
                    <Ionicons name="eye-outline" size={16} color="#4B5563" style={{ marginRight: 4 }} />
                    <Text style={styles.dropdownToggleText}>View Details</Text>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#4B5563" />
                  </TouchableOpacity>

                  {/* Details section if expanded */}
                  {isExpanded ? (
                    <View style={styles.dropdownPanel}>
                      <Text style={styles.detailText}>Phone: {w.phone || 'Not provided'}</Text>
                      <Text style={styles.detailText}>City: {w.city || 'Not provided'}</Text>
                      <Text style={styles.detailText}>Document Status: Documents uploaded successfully for admin review.</Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  {!w.isApproved ? (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => onApproveWorker(w._id)}
                      >
                        <Text style={styles.btnTextWhite}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => onRejectWorker(w._id)}
                      >
                        <Text style={styles.btnTextWhite}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={previewImage !== null} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.closeArea} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage ? (
            <Image source={{ uri: previewImage }} style={modalStyles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E2A47', marginBottom: 16 },
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
  list: { gap: 16 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', marginRight: 12 },
  meta: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: 'bold', color: '#1E2A47' },
  subText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusVerified: { backgroundColor: '#DCFCE7' },
  statusVerifiedText: { color: '#16A34A' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusPendingText: { color: '#D97706' },
  docsSectionHeader: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  docsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  docBox: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  docBoxText: { fontSize: 12, fontWeight: '600', color: '#1E2A47' },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    position: 'absolute',
    top: 6,
    right: 6,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dropdownToggleText: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginRight: 4 },
  dropdownPanel: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
    gap: 4,
  },
  detailText: { fontSize: 12, color: '#4B5563' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: '#3B5BFF' },
  rejectBtn: { backgroundColor: '#EF4444' },
  btnTextWhite: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeArea: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 9999,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
