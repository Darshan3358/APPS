import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

interface AppBarProps {
  title: string;
  onOpenDrawer: () => void;
  isConnected: boolean;
}

export default function AppBar({ title, onOpenDrawer, isConnected }: AppBarProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          <View style={styles.menuButton}>
            <Ionicons
              name="menu-outline"
              size={26}
              color={theme.colors.primaryNavy}
              onPress={onOpenDrawer}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Connection Status (read-only badge) */}
        <View style={[styles.statusBadge, { backgroundColor: isConnected ? '#DCFCE7' : '#FEE2E2' }]}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#16A34A' : '#EF4444' }]} />
          <Text style={[styles.statusText, { color: isConnected ? '#16A34A' : '#EF4444' }]}>
            {isConnected ? 'Live DB' : 'Offline'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.primaryNavy,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
