import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileTab() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const menuItems = [
    {
      label: 'Edit Profile',
      icon: 'person-circle-outline',
      action: () => router.push('/edit-profile'),
    },
    {
      label: 'My Bookings',
      icon: 'calendar-outline',
      action: () => router.push('/(tabs)/bookings'),
    },
    {
      label: 'Settings & Support',
      icon: 'settings-outline',
      action: () => router.push('/settings'),
    },
    {
      label: 'Notifications',
      icon: 'notifications-outline',
      action: () => router.push('/notifications'),
    },
    {
      label: 'Logout',
      icon: 'log-out-outline',
      action: handleLogout,
      color: '#EF4444',
    },
  ];

  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : insets.top;
  const tabBarHeight = 75; // 65 height + 10 bottom spacing
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  return (
    <View style={[styles.safeContainer, { paddingTop: topPadding }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <Image 
            source={{ 
              uri: (user?.profilePhoto && !user.profilePhoto.includes('default-avatar.png')) 
                ? user.profilePhoto 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Customer')}&background=0F2C59&color=fff&size=128`
            }} 
            style={styles.avatarImage} 
          />
          <View style={styles.profileMeta}>
            <Text style={styles.workerName}>{user?.name || 'Customer'}</Text>
            <Text style={styles.workerPhone}>{user?.phone || 'No phone added'}</Text>
            <Text style={styles.workerEmail}>{user?.email || ''}</Text>
            <View style={styles.cityBadge}>
              <Ionicons name="location" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
              <Text style={styles.cityText}>{user?.city || 'Ahmedabad'}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items List */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.label} 
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.lastMenuItem
              ]}
              onPress={item.action}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconWrapper, item.color ? { backgroundColor: '#FEE2E2' } : null]}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color={item.color || '#0F2C59'} 
                  />
                </View>
                <Text style={[
                  styles.menuLabel,
                  item.color ? { color: item.color } : null
                ]}>
                  {item.label}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={16} 
                color={item.color || '#9CA3AF'} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContainer: {
    padding: 20,
  },
  profileHeaderCard: {
    backgroundColor: '#0F2C59',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#F3F4F6',
  },
  profileMeta: {
    marginLeft: 16,
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  workerEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  cityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '700',
  },
});
