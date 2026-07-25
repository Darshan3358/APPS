import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

interface ReviewRecord {
  _id: string;
  reviewerName: string;
  profession: string;
  rating: number;
  comment: string;
  status: string;
  createdAt?: string;
}

interface ReviewsRatingsProps {
  reviews: ReviewRecord[];
  onUpdateStatus: (id: string, newStatus: string) => void;
  onDeleteReview: (id: string) => void;
}

type TabType = 'All' | 'Approved' | 'Pending' | 'Hidden';

export default function ReviewsRatings({ reviews, onUpdateStatus, onDeleteReview }: ReviewsRatingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  
  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('All');

  const filtered = reviews.filter((r) => {
    const s = r.status.toLowerCase();
    if (activeTab === 'Approved' && s !== 'approved') return false;
    if (activeTab === 'Pending' && s !== 'pending') return false;
    if (activeTab === 'Hidden' && s !== 'hidden') return false;

    // Rating filter
    if (ratingFilter !== 'All') {
      const ratingVal = parseInt(ratingFilter, 10);
      if (r.rating !== ratingVal) return false;
    }

    return true;
  });

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'approved') return styles.statusApproved;
    if (s === 'pending') return styles.statusPending;
    return styles.statusHidden;
  };

  const getStatusText = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'approved') return 'Approved';
    if (s === 'pending') return 'Pending';
    return 'Hidden';
  };

  const activeFilterCount = ratingFilter !== 'All' ? 1 : 0;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
          {(['All', 'Approved', 'Pending', 'Hidden'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'All'
              ? reviews.length
              : tab === 'Approved'
                ? reviews.filter(r => r.status.toLowerCase() === 'approved').length
                : tab === 'Pending'
                  ? reviews.filter(r => r.status.toLowerCase() === 'pending').length
                  : reviews.filter(r => r.status.toLowerCase() === 'hidden').length;

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

        {/* Reviews List */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No reviews found matching criteria</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.meta}>
                    <Text style={styles.reviewerName}>{item.reviewerName || 'Anonymous'}</Text>
                    <Text style={styles.professionText}>{item.profession || 'Service Partner'}</Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                    <Text style={[styles.statusBadgeText, getStatusStyle(item.status)]}>
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                </View>

                {/* Star Rating */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= item.rating ? 'star' : 'star-outline'}
                      size={16}
                      color="#F59E0B"
                    />
                  ))}
                </View>

                {/* Review Comment */}
                <Text style={styles.commentText}>"{item.comment || 'No comment provided'}"</Text>

                {/* Date */}
                {item.createdAt && (
                  <Text style={styles.dateText}>
                    Posted on {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {item.status.toLowerCase() !== 'approved' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => onUpdateStatus(item._id, 'Approved')}
                    >
                      <Text style={styles.btnTextWhite}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {item.status.toLowerCase() !== 'hidden' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.hideBtn]}
                      onPress={() => onUpdateStatus(item._id, 'Hidden')}
                    >
                      <Text style={styles.btnTextRed}>Hide Review</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        if (window.confirm("Are you sure you want to delete this review permanently?")) {
                          onDeleteReview(item._id);
                        }
                      } else {
                        Alert.alert(
                          "Delete Review",
                          "Are you sure you want to delete this review permanently?",
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => onDeleteReview(item._id) }
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={styles.btnTextWhite}>Delete</Text>
                  </TouchableOpacity>
                </View>
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
              <Text style={modalStyles.headerTitle}>Filter Reviews</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
              {/* Rating Filter */}
              <Text style={styles.filterSectionTitle}>Star Rating</Text>
              <View style={styles.filterOptionsRow}>
                {['All', '5', '4', '3', '2', '1'].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.filterOptionBtn,
                      ratingFilter === rating && styles.filterOptionBtnActive
                    ]}
                    onPress={() => setRatingFilter(rating)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      ratingFilter === rating && styles.filterOptionTextActive
                    ]}>
                      {rating === 'All' ? 'All Ratings' : `${rating} Star${rating !== '1' ? 's' : ''}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setRatingFilter('All');
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </ScrollView>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meta: { flex: 1 },
  reviewerName: { fontSize: 15, fontWeight: 'bold', color: '#1E2A47' },
  professionText: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusApproved: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  statusPending: { backgroundColor: '#FEF3C7', color: '#D97706' },
  statusHidden: { backgroundColor: '#FEE2E2', color: '#EF4444' },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  commentText: { fontSize: 13, color: '#4B5563', fontStyle: 'italic', lineHeight: 18, marginBottom: 8 },
  dateText: { fontSize: 11, color: '#9CA3AF', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: '#16A34A' },
  hideBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  deleteBtn: { backgroundColor: '#EF4444' },
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
});
