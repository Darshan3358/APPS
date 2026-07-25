import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/styles/theme';

interface StatusPillProps {
  status: string;
}

export default function StatusPill({ status }: StatusPillProps) {
  const normalized = status?.toLowerCase() || '';

  let stylesConfig = theme.colors.success; // Default to active/success
  let displayLabel = status;

  if (normalized === 'active' || normalized === 'approved' || normalized === 'completed' || normalized === 'success') {
    stylesConfig = theme.colors.success;
    displayLabel = normalized === 'active' ? 'Active' : normalized === 'approved' ? 'Approved' : normalized === 'completed' ? 'Completed' : 'Success';
  } else if (normalized === 'pending') {
    stylesConfig = theme.colors.warning;
    displayLabel = 'Pending';
  } else if (normalized === 'in_progress' || normalized === 'in progress') {
    stylesConfig = theme.colors.info;
    displayLabel = 'In Progress';
  } else if (normalized === 'on_the_way' || normalized === 'on the way') {
    stylesConfig = theme.colors.teal;
    displayLabel = 'On the Way';
  } else if (normalized === 'suspended' || normalized === 'cancelled' || normalized === 'refunded' || normalized === 'rejected') {
    stylesConfig = theme.colors.danger;
    displayLabel = normalized === 'suspended' ? 'Suspended' : normalized === 'cancelled' ? 'Cancelled' : normalized === 'refunded' ? 'Refunded' : 'Rejected';
  }

  return (
    <View style={[styles.pill, { backgroundColor: stylesConfig.bg }]}>
      <Text style={[styles.text, { color: stylesConfig.text }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...theme.typography.statusText,
  },
});
