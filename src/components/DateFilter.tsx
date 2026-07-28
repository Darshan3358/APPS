import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateFilterState {
  preset: DatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

interface DateFilterProps {
  value: DateFilterState;
  onChange: (newValue: DateFilterState) => void;
  style?: any;
}

export function filterByDateRange<T>(
  items: T[],
  dateExtractor: (item: T) => string | Date | number | undefined | null,
  filterState: DateFilterState
): T[] {
  if (!Array.isArray(items)) return [];
  if (!filterState || filterState.preset === 'all') return items;

  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  if (filterState.preset === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (filterState.preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
    end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
  } else if (filterState.preset === 'week') {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (filterState.preset === 'month') {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (filterState.preset === 'custom') {
    if (filterState.startDate) {
      start = new Date(filterState.startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (filterState.endDate) {
      end = new Date(filterState.endDate);
      end.setHours(23, 59, 59, 999);
    }
  }

  return items.filter((item) => {
    const rawVal = dateExtractor(item);
    if (!rawVal) return false;
    const itemDate = new Date(rawVal);
    if (isNaN(itemDate.getTime())) return false;

    if (start && itemDate < start) return false;
    if (end && itemDate > end) return false;
    return true;
  });
}

export default function DateFilter({ value, onChange, style }: DateFilterProps) {
  const [showCustomInputs, setShowCustomInputs] = useState(value.preset === 'custom');

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  const handleSelectPreset = (id: DatePreset) => {
    if (id === 'custom') {
      setShowCustomInputs(true);
      onChange({ ...value, preset: 'custom' });
    } else {
      setShowCustomInputs(false);
      onChange({ preset: id });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.presetsRow}>
        <Ionicons name="calendar-outline" size={18} color="#0F2C59" style={{ marginRight: 6 }} />
        <Text style={styles.filterLabel}>Date Filter:</Text>
        
        <View style={styles.pillsScroll}>
          {presets.map((p) => {
            const isActive = value.preset === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.presetBtn, isActive && styles.presetBtnActive]}
                onPress={() => handleSelectPreset(p.id)}
              >
                <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showCustomInputs && (
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>From:</Text>
          <TextInput
            style={styles.dateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            value={value.startDate || ''}
            onChangeText={(txt) => onChange({ ...value, startDate: txt })}
          />
          <Text style={styles.customLabel}>To:</Text>
          <TextInput
            style={styles.dateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            value={value.endDate || ''}
            onChangeText={(txt) => onChange({ ...value, endDate: txt })}
          />
          {(value.startDate || value.endDate) && (
            <TouchableOpacity 
              style={styles.clearBtn}
              onPress={() => onChange({ preset: 'custom', startDate: '', endDate: '' })}
            >
              <Ionicons name="close-circle" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } : {}),
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C59',
    marginRight: 4,
  },
  pillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetBtnActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
    flexWrap: 'wrap',
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#111827',
    minWidth: 100,
  },
  clearBtn: {
    padding: 2,
  },
});
