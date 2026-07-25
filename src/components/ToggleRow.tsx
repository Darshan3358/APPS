import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { theme } from '@/styles/theme';

interface ToggleRowProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}

export default function ToggleRow({ title, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        trackColor={{ false: '#E5E7EB', true: '#3A3F58' }}
        thumbColor={value ? '#1E2A47' : '#9CA3AF'}
        ios_backgroundColor="#E5E7EB"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
