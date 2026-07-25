import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '@/styles/theme';
import ToggleRow from '@/components/ToggleRow';

interface SettingsData {
  platformFeeRate: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
}

interface SettingsScreenProps {
  settings: SettingsData;
  onSaveSettings: (settings: SettingsData) => void;
}

export default function SettingsScreen({ settings, onSaveSettings }: SettingsScreenProps) {
  const [feeRate, setFeeRate] = useState('12.0');
  const [maintenance, setMaintenance] = useState(false);
  const [registrations, setRegistrations] = useState(true);

  useEffect(() => {
    if (settings) {
      setFeeRate(String(settings.platformFeeRate));
      setMaintenance(settings.maintenanceMode);
      setRegistrations(settings.allowNewRegistrations);
    }
  }, [settings]);

  const handleSave = () => {
    const rate = parseFloat(feeRate);
    if (isNaN(rate)) {
      alert('Please enter a valid number for Platform Fee Rate');
      return;
    }
    onSaveSettings({
      platformFeeRate: rate,
      maintenanceMode: maintenance,
      allowNewRegistrations: registrations,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenHeader}>System Parameters</Text>

        <View style={styles.card}>
          {/* Commission Parameters Section */}
          <Text style={styles.sectionTitle}>Commission Parameters</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Platform Fee Rate (%):</Text>
            <TextInput
              style={styles.textInput}
              value={feeRate}
              onChangeText={setFeeRate}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Operational Modes Section */}
          <Text style={styles.sectionTitle}>Operational Modes</Text>
          <ToggleRow
            title="Maintenance Mode"
            description="Render platform offline for scheduled maintenance"
            value={maintenance}
            onValueChange={setMaintenance}
          />
          <ToggleRow
            title="Allow New Registrations"
            description="Temporarily lock sign-up routes for new profiles"
            value={registrations}
            onValueChange={setRegistrations}
          />

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Parameters</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.layout.paddingHorizontal,
    paddingBottom: 32,
  },
  screenHeader: {
    ...theme.typography.sectionHeading,
    color: theme.colors.primaryNavy,
    marginTop: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.layout.cardRadius,
    padding: 20,
    ...theme.shadows.soft,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primaryNavy,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  textInput: {
    width: 80,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  spacer: {
    height: 16,
  },
  saveButton: {
    backgroundColor: '#2E2D6E', // Navy/purple matching Save button in settings image
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
