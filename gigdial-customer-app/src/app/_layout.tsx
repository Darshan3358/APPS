import { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { API_URL } from '../config/api';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function AppContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<{
    title: string;
    message: string;
    type?: string;
  } | null>(null);

  useEffect(() => {
    if (!user || !user.id) return;

    let lastNotificationId = '';
    const fetchLatestNotification = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        if (res.ok) {
          const notifications = await res.json();
          if (Array.isArray(notifications) && notifications.length > 0) {
            const latest = notifications[0];
            if (latest && latest._id && latest._id !== lastNotificationId && !latest.read) {
              lastNotificationId = latest._id;
              setActiveToast({
                title: latest.title || 'Notification',
                message: latest.message || 'You have a new update.',
                type: latest.type
              });
              setTimeout(() => {
                setActiveToast(null);
              }, 5000);
            }
          }
        }
      } catch (err) {}
    };

    fetchLatestNotification();
    const interval = setInterval(fetchLatestNotification, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleToastPress = () => {
    if (!activeToast) return;
    setActiveToast(null);
    // Route to notifications screen
    router.push('/notifications');
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat-detail" />
        <Stack.Screen name="chats" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="saved-workers" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="all-professionals" />
      </Stack>

      {activeToast && (
        <TouchableOpacity 
          style={styles.toast} 
          onPress={handleToastPress}
          activeOpacity={0.9}
        >
          <View style={styles.toastContent}>
            <Ionicons name="notifications" size={22} color="#3B5BFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{activeToast.title}</Text>
              <Text style={styles.toastMessage} numberOfLines={1}>{activeToast.message}</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveToast(null)}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E2A47',
  },
  toastMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
