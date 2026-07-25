import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

export interface FeedbackRecord {
  _id: string;
  rating: number;
  feedbackType: string;
  comments: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface FeedbackManagementProps {
  feedbacks: FeedbackRecord[];
  onDeleteFeedback: (id: string) => void;
}

type TabType = 'All' | 'Bug' | 'Feedback' | 'Feature Request' | 'Other';

export default function FeedbackManagement({ feedbacks, onDeleteFeedback }: FeedbackManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);

  const filtered = feedbacks.filter((f) => {
    if (activeTab === 'All') return true;
    return (f.feedbackType || '').toLowerCase() === activeTab.toLowerCase();
  });

  const getFeedbackTypeBadge = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'bug') return { bg: styles.typeBug, text: styles.typeBugText };
    if (t === 'feature request') return { bg: styles.typeFeature, text: styles.typeFeatureText };
    if (t === 'feedback') return { bg: styles.typeFeedback, text: styles.typeFeedbackText };
    return { bg: styles.typeOther, text: styles.typeOtherText };
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const maxStars = 5;
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#FBBF24"
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={styles.starRow}>{stars}</View>;
  };

  const confirmDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this feedback?")) {
        onDeleteFeedback(id);
      }
    } else {
      Alert.alert(
        "Delete Feedback",
        "Are you sure you want to delete this feedback?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDeleteFeedback(id) }
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{feedbacks.length}</Text>
          <Text style={styles.summaryLabel}>Total Feedbacks</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: '#EF4444' }]}>
            {feedbacks.filter(f => (f.feedbackType || '').toLowerCase() === 'bug').length}
          </Text>
          <Text style={styles.summaryLabel}>Bugs Reported</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>
            {(feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / (feedbacks.length || 1)).toFixed(1)} ★
          </Text>
          <Text style={styles.summaryLabel}>Average Rating</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {(['All', 'Bug', 'Feedback', 'Feature Request', 'Other'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'All'
            ? feedbacks.length
            : feedbacks.filter(f => (f.feedbackType || '').toLowerCase() === tab.toLowerCase()).length;

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

      {/* Feedbacks List */}
      <View style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No feedbacks found in this category</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const badge = getFeedbackTypeBadge(item.feedbackType);
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.card}
                onPress={() => setSelectedFeedback(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.typeAndRating}>
                    <View style={[styles.typeBadge, badge.bg]}>
                      <Text style={[styles.typeBadgeText, badge.text]}>{(item.feedbackType || 'Other').toUpperCase()}</Text>
                    </View>
                    {renderStars(item.rating)}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(item._id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Feedback Comments */}
                <Text style={styles.commentsText} numberOfLines={3} ellipsizeMode="tail">
                  {item.comments}
                </Text>

                <View style={styles.divider} />

                {/* Submitter details */}
                <View style={styles.footerRow}>
                  <View style={styles.userInfo}>
                    <Ionicons name="person-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={styles.userName}>{item.name || 'Anonymous'}</Text>
                    <Text style={styles.userEmail}>({item.email || 'No email'})</Text>
                  </View>
                  {item.createdAt && (
                    <Text style={styles.dateText}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      {/* Detail Modal */}
      <Modal
        visible={selectedFeedback !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedFeedback(null)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Feedback Details</Text>
              <TouchableOpacity onPress={() => setSelectedFeedback(null)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            {selectedFeedback && (
              <ScrollView style={modalStyles.contentContainer} contentContainerStyle={modalStyles.content}>
                <View style={modalStyles.metaRow}>
                  <View style={[styles.typeBadge, getFeedbackTypeBadge(selectedFeedback.feedbackType).bg]}>
                    <Text style={[styles.typeBadgeText, getFeedbackTypeBadge(selectedFeedback.feedbackType).text]}>
                      {(selectedFeedback.feedbackType || 'Other').toUpperCase()}
                    </Text>
                  </View>
                  {renderStars(selectedFeedback.rating)}
                </View>

                <Text style={modalStyles.sectionTitle}>Comments</Text>
                <View style={modalStyles.commentBox}>
                  <Text style={modalStyles.commentText}>{selectedFeedback.comments}</Text>
                </View>

                <Text style={modalStyles.sectionTitle}>Submitted By</Text>
                <View style={modalStyles.userCard}>
                  <View style={modalStyles.avatarContainer}>
                    <Text style={modalStyles.avatarText}>
                      {(selectedFeedback.name || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={modalStyles.userDetail}>
                    <Text style={modalStyles.userName}>{selectedFeedback.name || 'Anonymous'}</Text>
                    <Text style={modalStyles.userEmail}>{selectedFeedback.email || 'No email'}</Text>
                  </View>
                </View>

                {selectedFeedback.createdAt && (
                  <View style={modalStyles.dateRow}>
                    <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                    <Text style={modalStyles.dateText}>
                      Submitted on {new Date(selectedFeedback.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={modalStyles.deleteBtn}
                  onPress={() => {
                    const id = selectedFeedback._id;
                    setSelectedFeedback(null);
                    confirmDelete(id);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={modalStyles.deleteBtnText}>Delete Feedback</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

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
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2A47',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  commentBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetail: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 12,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContent: {
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsContent: {
    gap: 8,
    paddingRight: 16,
  },
  tabPill: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  tabPillActive: {
    backgroundColor: '#3B5BFF',
  },
  tabText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 12,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeAndRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  typeBug: {
    backgroundColor: '#FEE2E2',
  },
  typeBugText: {
    color: '#EF4444',
  },
  typeFeature: {
    backgroundColor: '#D1FAE5',
  },
  typeFeatureText: {
    color: '#10B981',
  },
  typeFeedback: {
    backgroundColor: '#DBEAFE',
  },
  typeFeedbackText: {
    color: '#3B5BFF',
  },
  typeOther: {
    backgroundColor: '#F3F4F6',
  },
  typeOtherText: {
    color: '#4B5563',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  commentsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    maxWidth: '75%',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginRight: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
