import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import AppBar from '@/components/AppBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// API
import { API_URL, SOCKET_URL } from '@/api';
import { io } from 'socket.io-client';

// Redesigned Screens
import DashboardOverview from '@/screens/DashboardOverview';
import ProfessionalsManagement from '@/screens/ProfessionalsManagement';
import CustomerManagement from '@/screens/CustomerManagement';
import VerificationPanel from '@/screens/VerificationPanel';
import SubscriptionManagement from '@/screens/SubscriptionManagement';
import LeadManagement from '@/screens/LeadManagement';
import ReviewsRatings from '@/screens/ReviewsRatings';
import SupportTickets from '@/screens/SupportTickets';
import AnalyticsReports from '@/screens/AnalyticsReports';
import CMSBannerManager from '@/screens/CMSBannerManager';
import SettingsPanel from '@/screens/SettingsPanel';
import FeedbackManagement from '@/screens/FeedbackManagement';

// Helper to handle alerts on both Web and Mobile
const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: onConfirm }
    ]);
  }
};

const API_BASE_URL = API_URL;

export default function AppContainer() {
  const insets = useSafeAreaInsets();
  const [activeScreen, setActiveScreen] = useState('Dashboard Overview');
  const [lastDynamicScreen, setLastDynamicScreen] = useState('Leads'); // Track the 4th tab's active screen
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // App state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    trends: [0, 0, 0, 0, 0, 0, 0],
  });
  const [users, setUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    platformFeeRate: 12.0,
    maintenanceMode: false,
    allowNewRegistrations: true,
  });

  // Newly added collections state
  const [reviews, setReviews] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Real-time notifications state
  const [activeToast, setActiveToast] = useState<{
    _id: string;
    title: string;
    message: string;
    type: string;
  } | null>(null);

  // ─── Fetch all data from live backend ─────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setHasError(false);
    try {
      console.log('🔗 Fetching from:', API_BASE_URL);

      const statsRes = await fetch(`${API_BASE_URL}/stats`);
      if (!statsRes.ok) {
        throw new Error(`Server returned ${statsRes.status}`);
      }

      const statsData = await statsRes.json();
      setStats(statsData);
      setIsConnected(true);

      // Fetch all endpoints in parallel
      const [
        allUsersRes,
        usersRes,
        workersRes,
        bookingsRes,
        subsRes,
        settingsRes,
        subReqsRes,
        reviewsRes,
        ticketsRes,
        bannersRes,
        blogsRes,
        paymentsRes,
        feedbacksRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/users/all`),
        fetch(`${API_BASE_URL}/users`),
        fetch(`${API_BASE_URL}/workers`),
        fetch(`${API_BASE_URL}/bookings`),
        fetch(`${API_BASE_URL}/subscriptions`),
        fetch(`${API_BASE_URL}/settings`),
        fetch(`${API_BASE_URL}/subscription/requests`),
        fetch(`${API_BASE_URL}/reviews`),
        fetch(`${API_BASE_URL}/support/tickets`),
        fetch(`${API_BASE_URL}/banners`),
        fetch(`${API_BASE_URL}/blogs/admin`),
        fetch(`${API_BASE_URL}/payments`),
        fetch(`${API_BASE_URL}/feedbacks`),
      ]);

      if (allUsersRes.ok) setAllUsers(await allUsersRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (workersRes.ok) setWorkers(await workersRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (subReqsRes.ok) setSubscriptionRequests(await subReqsRes.json());
      
      // Seeded/Real state endpoints
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
      if (ticketsRes.ok) setSupportTickets(await ticketsRes.json());
      if (bannersRes.ok) setBanners(await bannersRes.json());
      if (blogsRes.ok) setBlogs(await blogsRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (feedbacksRes.ok) setFeedbacks(await feedbacksRes.json());

      console.log('✅ All data fetched successfully from database!');
    } catch (err) {
      console.error('❌ Admin API unreachable:', err);
      setIsConnected(false);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData(true); // Pass true to fetch silently and avoid layout flashing
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Socket connection for real-time notifications
  useEffect(() => {
    console.log('📡 Connecting to Socket server at:', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to Socket server!');
      socket.emit('join_admin');
    });

    socket.on('new_notification', (notification) => {
      console.log('🔔 New real-time notification received:', notification);
      fetchData(true);
      setActiveToast(notification);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection warning:', err.message || err);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  const handleToastClick = () => {
    if (!activeToast) return;
    const type = activeToast.type;
    
    if (type === 'booking' || type === 'lead') {
      navigateTo('Leads');
    } else if (type === 'verification' || type === 'kyc') {
      navigateTo('Verification Requests');
    } else if (type === 'subscription') {
      navigateTo('Subscriptions');
    } else if (type === 'support') {
      navigateTo('Support Tickets');
    } else if (type === 'review') {
      navigateTo('Reviews');
    } else if (type === 'status') {
      const msg = activeToast.message.toLowerCase();
      if (msg.includes('worker') || msg.includes('professional')) {
        navigateTo('Professionals');
      } else {
        navigateTo('Customers');
      }
    } else {
      navigateTo('Dashboard Overview');
    }
    
    setActiveToast(null);
  };

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleToggleBlockUser = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}/toggle-block`, { method: 'POST' });
      if (res.ok) fetchData(true);
      else Alert.alert('Error', 'Failed to toggle block status.');
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleDeleteUser = (id: string) => {
    confirmAction(
      'Delete User',
      'Permanently delete this user account?',
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
          if (res.ok) fetchData(true);
          else Alert.alert('Error', 'Failed to delete user.');
        } catch {
          Alert.alert('Error', 'Server connection error.');
        }
      }
    );
  };

  const handleApproveWorker = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/workers/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', 'Worker approved successfully.');
      } else {
        Alert.alert('Error', 'Failed to approve worker.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleRejectWorker = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/workers/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', 'Worker verification rejected.');
      } else {
        Alert.alert('Error', 'Failed to reject worker.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleToggleBlockWorker = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/workers/${id}/toggle-block`, { method: 'POST' });
      if (res.ok) {
        fetchData(true);
      } else {
        Alert.alert('Error', 'Failed to toggle block status.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleDeleteWorker = (id: string) => {
    confirmAction(
      'Delete Worker',
      'Remove this worker profile from GigDial?',
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/workers/${id}`, { method: 'DELETE' });
          if (res.ok) fetchData(true);
          else Alert.alert('Error', 'Failed to delete worker.');
        } catch {
          Alert.alert('Error', 'Server connection error.');
        }
      }
    );
  };

  const handleApproveSubscriptionRequest = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/subscription/requests/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', 'Subscription request approved.');
      } else {
        Alert.alert('Error', 'Failed to approve request.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleRejectSubscriptionRequest = async (id: string, remarks: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/subscription/requests/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', adminNotes: remarks })
      });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', 'Subscription request rejected.');
      } else {
        Alert.alert('Error', 'Failed to reject request.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleUpdateBookingStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchData(true);
      else Alert.alert('Error', 'Failed to update booking status.');
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleRefundSubscription = (id: string) => {
    confirmAction(
      'Refund Payment',
      'Confirm refund for this subscription payment?',
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/subscriptions/${id}/refund`, {
            method: 'POST',
          });
          if (res.ok) fetchData(true);
          else Alert.alert('Error', 'Failed to issue refund.');
        } catch {
          Alert.alert('Error', 'Server connection error.');
        }
      }
    );
  };

  const handleSaveSettings = async (newSettings: typeof settings) => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', 'Settings saved successfully.');
      } else {
        Alert.alert('Error', 'Failed to save settings.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  // ─── Newly added endpoints actions ────────────────────────────────────────

  const handleUpdateReviewStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', `Review status updated to ${status}`);
      } else {
        Alert.alert('Error', 'Failed to update review status.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleDeleteReview = (id: string) => {
    confirmAction(
      'Delete Review',
      'Remove this review permanently from database?',
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/reviews/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchData(true);
            Alert.alert('Success', 'Review deleted successfully.');
          } else {
            Alert.alert('Error', 'Failed to delete review.');
          }
        } catch {
          Alert.alert('Error', 'Server connection error.');
        }
      }
    );
  };

  const handleUpdateTicketStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchData(true);
      } else {
        Alert.alert('Error', 'Failed to update ticket status.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleAddBanner = async (bannerData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerData),
      });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', 'Banner added to database.');
      } else {
        Alert.alert('Error', 'Failed to add banner.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleUpdateBanner = async (id: string, updateData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/banners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) fetchData(true);
      else Alert.alert('Error', 'Failed to update banner.');
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleDeleteBanner = (id: string) => {
    confirmAction(
      'Delete Banner',
      'Remove this promo banner permanently from database?',
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/banners/${id}`, { method: 'DELETE' });
          if (res.ok) fetchData(true);
          else Alert.alert('Error', 'Failed to delete banner.');
        } catch {
          Alert.alert('Error', 'Server connection error.');
        }
      }
    );
  };

  const handleAddBlog = async (blogData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/blogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blogData),
      });
      if (res.ok) {
        fetchData(true);
        Alert.alert('Success', 'Blog post created.');
      } else {
        Alert.alert('Error', 'Failed to create blog post.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleUpdateBlog = async (id: string, updateData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/blogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) fetchData(true);
      else Alert.alert('Error', 'Failed to update blog post.');
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const handleDeleteBlog = (id: string) => {
    confirmAction(
      'Delete Blog Post',
      'Remove this blog article permanently from database?',
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/blogs/${id}`, { method: 'DELETE' });
          if (res.ok) fetchData(true);
          else Alert.alert('Error', 'Failed to delete blog post.');
        } catch {
          Alert.alert('Error', 'Server connection error.');
        }
      }
    );
  };

  const handleDeleteFeedback = (id: string) => {
    confirmAction(
      'Delete Feedback',
      'Remove this feedback permanently from database?',
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/feedbacks/${id}`, { method: 'DELETE' });
          if (res.ok) fetchData(true);
          else Alert.alert('Error', 'Failed to delete feedback.');
        } catch {
          Alert.alert('Error', 'Server connection error.');
        }
      }
    );
  };

  // ─── Offline / Error screen ────────────────────────────────────────────────
  const renderOfflineScreen = () => (
    <View style={styles.offlineContainer}>
      <Ionicons name="cloud-offline-outline" size={64} color="#D1D5DB" />
      <Text style={styles.offlineTitle}>Cannot Connect</Text>
      <Text style={styles.offlineSubtitle}>
        Make sure the live Render backend is online.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
        <Text style={styles.retryButtonText}>Retry Connection</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Render current screen ─────────────────────────────────────────────────
  const renderScreen = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primaryBlue} />
          <Text style={styles.loadingText}>Fetching real database data...</Text>
        </View>
      );
    }

    if (hasError) return renderOfflineScreen();

    switch (activeScreen) {
      case 'Dashboard Overview':
        return (
          <DashboardOverview
            stats={stats}
            workers={workers}
            users={allUsers}
            bookings={bookings}
            subscriptions={subscriptions}
            reviews={reviews}
            supportTickets={supportTickets}
            payments={payments}
          />
        );
      case 'Professionals':
        return (
          <ProfessionalsManagement
            workers={workers}
            onApproveWorker={handleApproveWorker}
            onRejectWorker={handleRejectWorker}
            onDeleteWorker={handleDeleteWorker}
            onToggleBlockWorker={handleToggleBlockWorker}
          />
        );
      case 'Customers':
        return (
          <CustomerManagement
            customers={users}
            onToggleBlock={handleToggleBlockUser}
            onDeleteUser={handleDeleteUser}
          />
        );
      case 'Verification Requests':
        return (
          <VerificationPanel
            workers={workers}
            onApproveWorker={handleApproveWorker}
            onRejectWorker={handleRejectWorker}
          />
        );
      case 'Subscriptions':
        return (
          <SubscriptionManagement
            subscriptions={subscriptions}
            onRefundSubscription={handleRefundSubscription}
            subscriptionRequests={subscriptionRequests}
            onApproveRequest={handleApproveSubscriptionRequest}
            onRejectRequest={handleRejectSubscriptionRequest}
          />
        );
      case 'Leads':
        return (
          <LeadManagement
            bookings={bookings}
            onUpdateStatus={handleUpdateBookingStatus}
          />
        );
      case 'Reviews':
        return (
          <ReviewsRatings
            reviews={reviews}
            onUpdateStatus={handleUpdateReviewStatus}
            onDeleteReview={handleDeleteReview}
          />
        );
      case 'Support Tickets':
        return (
          <SupportTickets
            tickets={supportTickets}
            onUpdateStatus={handleUpdateTicketStatus}
          />
        );
      case 'Analytics':
        return (
          <AnalyticsReports
            workers={workers}
            users={allUsers}
            bookings={bookings}
            payments={payments}
          />
        );
      case 'CMS Banner Manager':
        return (
          <CMSBannerManager
            banners={banners}
            blogs={blogs}
            onAddBanner={handleAddBanner}
            onUpdateBanner={handleUpdateBanner}
            onDeleteBanner={handleDeleteBanner}
            onAddBlog={handleAddBlog}
            onUpdateBlog={handleUpdateBlog}
            onDeleteBlog={handleDeleteBlog}
          />
        );
      case 'Settings':
        return (
          <SettingsPanel
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        );
      case 'Feedback Panel':
        return (
          <FeedbackManagement
            feedbacks={feedbacks}
            onDeleteFeedback={handleDeleteFeedback}
          />
        );
      default:
        return <DashboardOverview stats={stats} workers={workers} users={allUsers} bookings={bookings} subscriptions={subscriptions} reviews={reviews} supportTickets={supportTickets} payments={payments} />;
    }
  };

  // Dynamic 4th tab parameters based on active dynamic screen
  const getDynamicTabConfig = () => {
    switch (lastDynamicScreen) {
      case 'Verification Requests':
        return { label: 'Verification', icon: 'shield-checkmark-outline' as const };
      case 'Subscriptions':
        return { label: 'Subscriptions', icon: 'ribbon-outline' as const };
      case 'Reviews':
        return { label: 'Reviews', icon: 'star-outline' as const };
      case 'Support Tickets':
        return { label: 'Support', icon: 'help-circle-outline' as const };
      case 'Analytics':
        return { label: 'Analytics', icon: 'bar-chart-outline' as const };
      case 'CMS Banner Manager':
        return { label: 'CMS', icon: 'images-outline' as const };
      case 'Settings':
        return { label: 'Settings', icon: 'settings-outline' as const };
      case 'Feedback Panel':
        return { label: 'Feedback', icon: 'chatbox-ellipses-outline' as const };
      default:
        return { label: 'Leads', icon: 'flash-outline' as const };
    }
  };

  const dynamicTab = getDynamicTabConfig();

  // Switch to screen helper
  const navigateTo = (screenName: string) => {
    setActiveScreen(screenName);
    const dynamicList = [
      'Leads',
      'Verification Requests',
      'Subscriptions',
      'Reviews',
      'Support Tickets',
      'Analytics',
      'CMS Banner Manager',
      'Settings',
      'Feedback Panel',
    ];
    if (dynamicList.includes(screenName)) {
      setLastDynamicScreen(screenName);
    }
  };

  const moreMenuItems = [
    { name: 'Leads', icon: 'flash', label: 'Lead Management' },
    { name: 'Verification Requests', icon: 'shield-checkmark', label: 'Verification Request' },
    { name: 'Subscriptions', icon: 'ribbon', label: 'Subscriptions' },
    { name: 'Reviews', icon: 'star', label: 'Reviews & Ratings' },
    { name: 'Support Tickets', icon: 'help-circle', label: 'Support Tickets' },
    { name: 'Analytics', icon: 'bar-chart', label: 'Analytics' },
    { name: 'CMS Banner Manager', icon: 'images', label: 'CMS & Banners' },
    { name: 'Settings', icon: 'settings', label: 'Settings' },
    { name: 'Feedback Panel', icon: 'chatbox-ellipses', label: 'User Feedback' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppBar
        title={activeScreen}
        onOpenDrawer={() => setIsMoreMenuOpen(true)}
        isConnected={isConnected}
      />

      <View style={[styles.screenContainer, { paddingBottom: 75 + insets.bottom + 15 }]}>{renderScreen()}</View>

      {/* Custom Bottom Tab Navigation (5-Tabs) */}
      <View style={[styles.bottomTabBar, { bottom: 10 + insets.bottom, borderRadius: 18, height: 65, paddingBottom: 4, paddingTop: 8 }]}>
        {/* Tab 1: Dashboard */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigateTo('Dashboard Overview')}
        >
          <Ionicons
            name={activeScreen === 'Dashboard Overview' ? 'grid' : 'grid-outline'}
            size={22}
            color={activeScreen === 'Dashboard Overview' ? '#3B5BFF' : '#9CA3AF'}
          />
          <Text style={[styles.tabLabel, activeScreen === 'Dashboard Overview' && styles.tabLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Professionals */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigateTo('Professionals')}
        >
          <Ionicons
            name={activeScreen === 'Professionals' ? 'construct' : 'construct-outline'}
            size={22}
            color={activeScreen === 'Professionals' ? '#3B5BFF' : '#9CA3AF'}
          />
          <Text style={[styles.tabLabel, activeScreen === 'Professionals' && styles.tabLabelActive]}>
            Professionals
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Customers */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigateTo('Customers')}
        >
          <Ionicons
            name={activeScreen === 'Customers' ? 'people' : 'people-outline'}
            size={22}
            color={activeScreen === 'Customers' ? '#3B5BFF' : '#9CA3AF'}
          />
          <Text style={[styles.tabLabel, activeScreen === 'Customers' && styles.tabLabelActive]}>
            Customers
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Dynamic Active Screen */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigateTo(lastDynamicScreen)}
        >
          <Ionicons
            name={activeScreen === lastDynamicScreen ? (dynamicTab.icon.replace('-outline', '') as any) : dynamicTab.icon}
            size={22}
            color={activeScreen === lastDynamicScreen ? '#3B5BFF' : '#9CA3AF'}
          />
          <Text style={[styles.tabLabel, activeScreen === lastDynamicScreen && styles.tabLabelActive]}>
            {dynamicTab.label}
          </Text>
        </TouchableOpacity>

        {/* Tab 5: More (Opens bottom sheet sheet menu) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setIsMoreMenuOpen(true)}
        >
          <Ionicons
            name="menu-outline"
            size={24}
            color={isMoreMenuOpen ? '#3B5BFF' : '#9CA3AF'}
          />
          <Text style={[styles.tabLabel, isMoreMenuOpen && styles.tabLabelActive]}>
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* "More Menu" Sidebar Modal */}
      <Modal visible={isMoreMenuOpen} animationType="none" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setIsMoreMenuOpen(false)} />
          
          <View style={modalStyles.sidebar}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>All Modules</Text>
              <TouchableOpacity onPress={() => setIsMoreMenuOpen(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={modalStyles.menuList} showsVerticalScrollIndicator={false}>
              {moreMenuItems.map((item) => {
                const isActive = activeScreen === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      modalStyles.menuItem,
                      isActive && modalStyles.menuItemActive
                    ]}
                    onPress={() => {
                      navigateTo(item.name);
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={isActive ? '#3B5BFF' : '#4B5563'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[
                      modalStyles.menuItemLabel,
                      isActive && modalStyles.menuItemLabelActive
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Real-Time Socket Notification Toast Overlay */}
      {activeToast && (
        <TouchableOpacity 
          style={[styles.toastContainer, { top: insets.top + 10 }]} 
          onPress={handleToastClick}
          activeOpacity={0.9}
        >
          <View style={styles.toastGradientBorder}>
            <View style={styles.toastContent}>
              <View style={styles.toastIconContainer}>
                <Ionicons name="notifications" size={24} color="#3B5BFF" />
              </View>
              <View style={styles.toastTextContainer}>
                <Text style={styles.toastTitle}>{activeToast.title}</Text>
                <Text style={styles.toastMessage} numberOfLines={2}>{activeToast.message}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveToast(null)} style={styles.toastCloseBtn}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  screenContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F9',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
  },
  offlineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F9',
    padding: 24,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E2A47',
    marginTop: 16,
    marginBottom: 8,
  },
  offlineSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B5BFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomTabBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderTopWidth: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#3B5BFF',
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  toastGradientBorder: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    overflow: 'hidden',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  toastIconContainer: {
    marginRight: 12,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2A47',
  },
  toastMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  toastCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16,
    zIndex: 2,
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
    fontSize: 16,
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
  menuList: {
    padding: 12,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: '#EEF2FF',
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  menuItemLabelActive: {
    color: '#3B5BFF',
    fontWeight: '700',
  },
});
