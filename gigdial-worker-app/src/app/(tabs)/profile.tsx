import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL as LOCAL_API_URL } from '../../config/api';

export default function ProfileTab() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : insets.top;

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
      label: 'My Leads (Orders)',
      icon: 'document-text-outline',
      action: () => router.push('/(tabs)/leads'),
    },
    {
      label: 'Manage Categories & Skills',
      icon: 'construct-outline',
      action: () => router.push('/manage-categories'),
    },
    {
      label: 'Subscription Plans',
      icon: 'card-outline',
      action: () => router.push('/(tabs)/subscription'),
    },
    {
      label: 'Settings',
      icon: 'settings-outline',
      action: () => router.push('/settings'),
    },
    {
      label: 'Logout',
      icon: 'log-out-outline',
      action: handleLogout,
      color: '#EF4444',
    },
  ];

  const getProfilePhotoUri = (photo: string | undefined, fallbackName: string = 'Worker'): string => {
    if (!photo || photo.includes('default-avatar.png') || photo.includes('worker_ramesh.png')) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0D9488&color=fff&size=128`;
    }
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    const serverRoot = LOCAL_API_URL.replace('/api', '');
    const cleanPhoto = photo.startsWith('/') ? photo : `/${photo}`;
    return `${serverRoot}${cleanPhoto}`;
  };

  const tabBarHeight = 75; 
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: getProfilePhotoUri(user?.profilePhoto, user?.name) }} 
              style={styles.avatarImage} 
            />
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.workerName}>{user?.name || 'Worker Partner'}</Text>
            <Text style={styles.workerPhone}>{user?.phone || 'No phone added'}</Text>
            <Text style={styles.workerEmail}>{user?.email || ''}</Text>
            
            {user?.mainCategory && (
              <View style={styles.categoryBadge}>
                <Ionicons name="briefcase" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                <Text style={styles.categoryText} numberOfLines={1}>{user.mainCategory}</Text>
              </View>
            )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E8EC',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C59',
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
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#F5F6FA',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  categoryText: {
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
