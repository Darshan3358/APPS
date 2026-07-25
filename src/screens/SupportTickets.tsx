import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

interface TicketRecord {
  _id: string;
  customerName: string;
  issue: string;
  priority: string; // High, Medium, Low
  status: string; // Open, In Progress, Closed
  createdAt?: string;
}

interface SupportTicketsProps {
  tickets: TicketRecord[];
  onUpdateStatus: (id: string, newStatus: string, newPriority?: string) => void;
}

type TabType = 'All' | 'Open' | 'In Progress' | 'Closed';

export default function SupportTickets({ tickets, onUpdateStatus }: SupportTicketsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('All');

  const filtered = tickets.filter((t) => {
    const s = t.status.toLowerCase();
    if (activeTab === 'Open') return s === 'open';
    if (activeTab === 'In Progress') return s === 'in progress';
    if (activeTab === 'Closed') return s === 'closed';
    return true; // All
  });

  const getPriorityStyle = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === 'high') return styles.priorityHigh;
    if (p === 'medium') return styles.priorityMedium;
    return styles.priorityLow;
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'open') return styles.statusOpen;
    if (s === 'in progress') return styles.statusProgress;
    return styles.statusClosed;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {(['All', 'Open', 'In Progress', 'Closed'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'All'
            ? tickets.length
            : tab === 'Open'
              ? tickets.filter(t => t.status.toLowerCase() === 'open').length
              : tab === 'In Progress'
                ? tickets.filter(t => t.status.toLowerCase() === 'in progress').length
                : tickets.filter(t => t.status.toLowerCase() === 'closed').length;

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

      {/* Tickets List */}
      <View style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No support tickets found</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const shortId = `#TKT${String(item._id).substring(18, 24).toUpperCase()}`;
            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.ticketId}>{shortId}</Text>
                  <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                </View>

                {/* Customer Info */}
                <Text style={styles.customerName}>{item.customerName || 'Anonymous User'}</Text>
                
                {/* Issue Description */}
                <Text style={styles.issueText}>{item.issue}</Text>

                {/* Priority and Meta */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>
                    Priority:{' '}
                    <Text style={[styles.priorityValue, getPriorityStyle(item.priority)]}>
                      {item.priority}
                    </Text>
                  </Text>
                  {item.createdAt && (
                    <Text style={styles.dateText}>
                      Created: {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {item.status.toLowerCase() !== 'in progress' && item.status.toLowerCase() !== 'closed' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.progressBtn]}
                      onPress={() => onUpdateStatus(item._id, 'In Progress')}
                    >
                      <Text style={styles.btnTextWhite}>Work on Ticket</Text>
                    </TouchableOpacity>
                  )}
                  {item.status.toLowerCase() !== 'closed' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.closeBtn]}
                      onPress={() => onUpdateStatus(item._id, 'Closed')}
                    >
                      <Text style={styles.btnTextWhite}>Close Ticket</Text>
                    </TouchableOpacity>
                  )}
                  {item.status.toLowerCase() === 'closed' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.reopenBtn]}
                      onPress={() => onUpdateStatus(item._id, 'Open')}
                    >
                      <Text style={styles.btnTextBlue}>Reopen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ticketId: { fontSize: 13, fontWeight: 'bold', color: '#3B5BFF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  statusOpen: { backgroundColor: '#FEE2E2' },
  statusProgress: { backgroundColor: '#FEF3C7' },
  statusClosed: { backgroundColor: '#DCFCE7' },
  customerName: { fontSize: 15, fontWeight: 'bold', color: '#1E2A47', marginBottom: 4 },
  issueText: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  metaLabel: { fontSize: 12, color: '#6B7280' },
  priorityValue: { fontWeight: '700' },
  priorityHigh: { color: '#EF4444' },
  priorityMedium: { color: '#D97706' },
  priorityLow: { color: '#16A34A' },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  progressBtn: { backgroundColor: '#F59E0B' },
  closeBtn: { backgroundColor: '#16A34A' },
  reopenBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#3B5BFF' },
  btnTextWhite: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  btnTextBlue: { color: '#3B5BFF', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
});
