import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, StatusBar, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL as LOCAL_API_URL } from '../../config/api';

interface Stats {
  todayLeads: number;
  monthLeads: number;
  profileViews: number;
  totalLeads: number;
  earnings?: number;
  rating?: number;
  completedJobs?: number;
  recentActivity?: { title: string; subtitle: string; icon: string; iconColor: string }[];
}

interface RecentLead {
  _id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  schedule?: string;
}

function categoryMatchesLead(workerCategoryString: string, leadTitle: string, leadDescription: string): boolean {
  if (!workerCategoryString) return true;
  
  const workerCats = workerCategoryString.toLowerCase().split(',').map(c => c.trim()).filter(Boolean);
  const title = (leadTitle || '').toLowerCase();
  const desc = (leadDescription || '').toLowerCase();
  
  const keywordMap: Record<string, string[]> = {
    electrician: ['electric', 'wiring', 'light', 'switch', 'power', 'fan', 'ac', 'appliance', 'fuse', 'wire', 'board'],
    plumber: ['plumb', 'leak', 'pipe', 'tap', 'drain', 'water', 'basin', 'shower', 'sink', 'toilet'],
    carpenter: ['carpent', 'wood', 'door', 'lock', 'furniture', 'cabinet', 'chair', 'table', 'hinge', 'bed'],
    painter: ['paint', 'wall', 'waterproof', 'putty', 'color', 'colour', 'primer'],
    cleaner: ['clean', 'wash', 'sweep', 'dust', 'sofa', 'kitchen', 'vacuum', 'housekeep']
  };

  return workerCats.some((cat) => {
    if (title.includes(cat) || desc.includes(cat)) return true;
    const keywords = keywordMap[cat];
    if (keywords) {
      return keywords.some(keyword => title.includes(keyword) || desc.includes(keyword));
    }
    return false;
  });
}

export default function DashboardTab() {
  const { user, setUser, token } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    todayLeads: 0,
    monthLeads: 0,
    profileViews: 0,
    totalLeads: 0,
    earnings: 0,
    rating: 5.0,
    recentActivity: []
  });
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (user) {
      const isOnlineVal = (user as any).isOnline !== false && (user as any).isOnline !== 'false';
      setIsOnline(isOnlineVal);
    }
  }, [user?.id, (user as any)?._id, (user as any)?.isOnline]);

  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    const userId = user?.id || (user as any)?._id;
    if (setUser) {
      setUser((prev: any) => prev ? { ...prev, isOnline: value } : prev);
    }
    if (!userId) return;
    try {
      await fetch(`${LOCAL_API_URL}/worker/${userId}/online-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: value })
      });
    } catch (err) {
      console.error('Failed to update online status:', err);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch {}
  };

  const fetchDashboardData = async () => {
    const userId = user?.id || (user as any)?._id;
    if (!userId) return;
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${LOCAL_API_URL}/worker/${userId}/dashboard`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Subscription Status
      const subRes = await fetch(`${LOCAL_API_URL}/worker/${userId}/subscription`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscriptionActive(subData.isActive);
        setSubscriptionData(subData);
      }

      // 3. Fetch Recent Leads (Pending bookings of worker's profession)
      const leadsRes = await fetch(`${LOCAL_API_URL}/bookings/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        const filtered = user?.mainCategory 
          ? leadsData.filter((b: any) => {
              if (b.workerId === userId) return true;
              return categoryMatchesLead(user.mainCategory!, b.title, b.description);
            })
          : leadsData;
        setRecentLeads(filtered.slice(0, 5));
      }
    } catch (err) {
      console.log('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, subscriptionActive]);

  const insets = useSafeAreaInsets();
  const tabBarHeight = 75; 
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F2C59" />
      </View>
    );
  }

  const getFirstName = (fullName: string) => {
    if (!fullName) return 'Partner';
    return fullName.split(' ')[0];
  };

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Hi, {getFirstName(user?.name || '')} 👋</Text>
          <View style={styles.onlineContainer}>
            <Text style={[styles.onlineText, !isOnline && { color: '#6B7280' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#D1D5DB', true: '#0D9488' }}
              thumbColor="#FFFFFF"
              style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } : {}}
            />
          </View>
        </View>

        {/* Warning Banner (Pending approval) */}
        {!user?.isApproved && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#B45309" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={styles.warningText}>
              Your account registration is under review. The administrator will verify your credentials and documents shortly.
            </Text>
          </View>
        )}

        {/* Numerical stats grid */}
        <Text style={styles.sectionHeader}>Performance Overview</Text>
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={styles.gridCard}>
              <Text style={styles.cardValue}>{(stats as any).completedJobs || 0}</Text>
              <Text style={styles.cardLabel}>Completed Jobs</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.cardValue}>{stats.rating ? stats.rating.toFixed(1) : '5.0'} ★</Text>
              <Text style={styles.cardLabel}>Average Rating</Text>
            </View>
          </View>
          
          <View style={styles.gridRow}>
            <View style={styles.gridCard}>
              <Text style={styles.cardValue}>{stats.todayLeads || 0}</Text>
              <Text style={styles.cardLabel}>Today's Leads</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.cardValue}>{stats.profileViews || 0}</Text>
              <Text style={styles.cardLabel}>Profile Views</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Row */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/leads')}>
            <View style={styles.actionIconBg}>
              <Ionicons name="briefcase-outline" size={22} color="#0F2C59" />
            </View>
            <Text style={styles.actionLabel}>Job Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/chats')}>
            <View style={styles.actionIconBg}>
              <Ionicons name="chatbubbles-outline" size={22} color="#0F2C59" />
            </View>
            <Text style={styles.actionLabel}>Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.actionIconBg}>
              <Ionicons name="person-outline" size={22} color="#0F2C59" />
            </View>
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/subscription')}>
            <View style={styles.actionIconBg}>
              <Ionicons name="card-outline" size={22} color="#0F2C59" />
            </View>
            <Text style={styles.actionLabel}>Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity List */}
        <Text style={styles.sectionHeader}>Recent Activity</Text>
        <View style={styles.activityList}>
          {!stats.recentActivity || stats.recentActivity.length === 0 ? (
            <View style={styles.emptyActivityCard}>
              <Text style={styles.emptyActivityText}>No recent activity yet</Text>
            </View>
          ) : (
            stats.recentActivity.map((activity, index) => (
              <View key={index} style={styles.activityCard}>
                <View style={[styles.activityIconBg, { backgroundColor: activity.iconColor + '15' }]}>
                  <Ionicons name={activity.icon as any} size={18} color={activity.iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activitySub}>{activity.subtitle}</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C59',
  },
  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    marginBottom: 24,
  },
  warningText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 12,
    marginTop: 8,
  },
  gridContainer: {
    marginBottom: 24,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  actionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: '#1A1A1A',
    fontWeight: '700',
    textAlign: 'center',
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  activityIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIconBgGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  activitySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  emptyActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});
