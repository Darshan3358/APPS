import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

interface SettingsPanelProps {
  settings: {
    platformFeeRate: number;
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
  };
  onSaveSettings: (settings: any) => void;
}

export default function SettingsPanel({ settings, onSaveSettings }: SettingsPanelProps) {
  const [platformFee, setPlatformFee] = useState(String(settings.platformFeeRate));
  const [maintMode, setMaintMode] = useState(settings.maintenanceMode);
  const [allowReg, setAllowReg] = useState(settings.allowNewRegistrations);
  const [activeSection, setActiveSection] = useState<string | null>(null); // Null shows list of options

  const handleSave = () => {
    onSaveSettings({
      platformFeeRate: Number(platformFee) || 12.0,
      maintenanceMode: maintMode,
      allowNewRegistrations: allowReg,
    });
  };

  const sections = [
    { name: 'General Settings', icon: 'settings-outline' },
    { name: 'Company Details', icon: 'business-outline' },
    { name: 'Contact Details', icon: 'call-outline' },
    { name: 'Payment Gateway', icon: 'card-outline' },
    { name: 'Email Settings', icon: 'mail-outline' },
    { name: 'SMS Settings', icon: 'chatbubbles-outline' },
    { name: 'Social Login', icon: 'logo-google' },
    { name: 'SEO Settings', icon: 'search-outline' },
    { name: 'App Settings', icon: 'phone-portrait-outline' },
  ];

  if (activeSection === null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sidebarList}>
          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.name}
              style={styles.sidebarItem}
              onPress={() => setActiveSection(sec.name)}
            >
              <Ionicons name={sec.icon as any} size={20} color="#6B7280" style={{ marginRight: 10 }} />
              <Text style={styles.sidebarItemText}>
                {sec.name}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Back Button Header */}
      <TouchableOpacity style={styles.backHeader} onPress={() => setActiveSection(null)}>
        <Ionicons name="arrow-back" size={20} color="#3B5BFF" style={{ marginRight: 8 }} />
        <Text style={styles.backHeaderText}>Back to Settings</Text>
      </TouchableOpacity>

      {/* Selected Setting Detail View */}
      <View style={styles.detailsPanel}>
        {activeSection === 'App Settings' ? (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>App Settings</Text>

            {/* Platform Commission Fee */}
            <Text style={styles.inputLabel}>Platform Commission Fee (%)</Text>
            <TextInput
              placeholder="e.g. 12"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              style={styles.input}
              value={platformFee}
              onChangeText={setPlatformFee}
            />

            {/* Maintenance Mode Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleMeta}>
                <Text style={styles.toggleLabel}>Maintenance Mode</Text>
                <Text style={styles.toggleDesc}>Put all apps offline for maintenance</Text>
              </View>
              <Switch
                value={maintMode}
                onValueChange={setMaintMode}
                trackColor={{ false: '#D1D5DB', true: '#3B5BFF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Allow New Registrations Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleMeta}>
                <Text style={styles.toggleLabel}>Allow New Registrations</Text>
                <Text style={styles.toggleDesc}>Control signups for partners and customers</Text>
              </View>
              <Switch
                value={allowReg}
                onValueChange={setAllowReg}
                trackColor={{ false: '#D1D5DB', true: '#3B5BFF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyDetails}>
            <Ionicons name="construct-outline" size={48} color="#3B5BFF" style={{ marginBottom: 12 }} />
            <Text style={styles.sectionTitle}>{activeSection}</Text>
            <Text style={styles.emptyDetailsText}>
              {activeSection} configurations are handled under system parameters.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sidebarList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sidebarItemText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  backHeaderText: { fontSize: 14, fontWeight: '700', color: '#3B5BFF' },
  detailsPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 280,
  },
  formContainer: { gap: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E2A47', marginBottom: 6 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#E5E8EC', paddingHorizontal: 14, fontSize: 14, color: '#1E2A47' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toggleMeta: { flex: 1, marginRight: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#1E2A47' },
  toggleDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  saveBtn: { height: 44, borderRadius: 10, backgroundColor: '#3B5BFF', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emptyDetails: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyDetailsText: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
});
