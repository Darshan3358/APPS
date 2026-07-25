import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: string;
  onSelectScreen: (screen: string) => void;
}

const MENU_ITEMS = [
  { name: 'Dashboard', icon: 'grid-outline' as const, label: 'Dashboard' },
  { name: 'Users', icon: 'people-outline' as const, label: 'Users (All)' },
  { name: 'Workers', icon: 'construct-outline' as const, label: 'Workers' },
  { name: 'Customers', icon: 'person-outline' as const, label: 'Customers' },
  { name: 'Bookings', icon: 'clipboard-outline' as const, label: 'Bookings' },
  { name: 'Subscriptions', icon: 'card-outline' as const, label: 'Subscriptions' },
  { name: 'SubscriptionSettings', icon: 'qr-code-outline' as const, label: 'Sub QR Settings' },
  { name: 'Reports', icon: 'stats-chart-outline' as const, label: 'Reports' },
  { name: 'Settings', icon: 'settings-outline' as const, label: 'Settings' },
];

export default function Drawer({ isOpen, onClose, activeScreen, onSelectScreen }: DrawerProps) {
  const { width } = Dimensions.get('window');
  const drawerWidth = Math.min(width * 0.85, 320);
  
  // Animation ref
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isMounted, setIsMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -drawerWidth,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [isOpen, drawerWidth]);

  if (!isMounted) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Overlay Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Container */}
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            width: drawerWidth,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header Block */}
            <View style={styles.headerBlock}>
              <View style={styles.logoRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="flash" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.logoText}>
                  <Text style={styles.logoBlue}>Gig</Text>
                  <Text style={styles.logoGreen}>Dial</Text>
                </Text>
              </View>
              <Text style={styles.tagline}>Connect. Create. Succeed.</Text>
            </View>

            {/* Menu List */}
            <View style={styles.menuList}>
              {MENU_ITEMS.map((item) => {
                const isActive = activeScreen === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.menuItem,
                      isActive && styles.activeMenuItem,
                    ]}
                    onPress={() => {
                      onSelectScreen(item.name);
                      onClose();
                    }}
                  >
                    {/* Left Active Selection Bar */}
                    {isActive && <View style={styles.activeIndicator} />}

                    <View style={styles.menuItemContent}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={isActive ? theme.colors.primaryBlue : theme.colors.mutedGray}
                        style={styles.menuIcon}
                      />
                      <Text
                        style={[
                          styles.menuLabel,
                          isActive && styles.activeMenuLabel,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.logoutButton} onPress={() => alert('Logout clicked')}>
                <Ionicons name="log-out-outline" size={24} color={theme.colors.dangerRed} style={styles.menuIcon} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 99,
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 100,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerBlock: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoBlue: {
    color: '#3B5BFF',
  },
  logoGreen: {
    color: '#16A34A',
  },
  tagline: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  activeMenuItem: {
    backgroundColor: '#EEF2FF',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#3B5BFF',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  activeMenuLabel: {
    fontWeight: 'bold',
    color: '#3B5BFF',
  },
  bottomSection: {
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E8EC',
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dangerRed,
  },
});
