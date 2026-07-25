import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Switch, ActivityIndicator, Alert, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { API_URL as LOCAL_API_URL } from '../config/api';

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : insets.top;

  // Notification states
  const [emailNotify, setEmailNotify] = useState(true);
  const [smsNotify, setSmsNotify] = useState(false);
  const [pushNotify, setPushNotify] = useState(true);

  // Support ticket states
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const handleSaveNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/worker/${user.id}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailNotify,
          sms: smsNotify,
          push: pushNotify
        })
      });
      if (res.ok) {
        Alert.alert('Preferences Saved', 'Notification settings updated successfully!');
      }
    } catch (err) {
      console.log('Error saving notifications:', err);
    }
  };

  const handleSupportSubmit = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Validation Error', 'Subject and message are required.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerUid: user?.id,
          subject: ticketSubject,
          message: ticketMessage
        })
      });

      setSubmittingTicket(false);
      if (res.ok) {
        setTicketSubject('');
        setTicketMessage('');
        Alert.alert('Ticket Created', 'Your support ticket has been registered. Our team will contact you soon.');
      } else {
        Alert.alert('Error', 'Failed to submit support ticket.');
      }
    } catch (err: any) {
      setSubmittingTicket(false);
      Alert.alert('Error', err.message || 'Failed to connect to server.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { paddingTop: topPadding }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Notifications Preferences */}
        <Text style={styles.sectionLabel}>Notification Preferences</Text>
        <View style={styles.cardContainer}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Email Notifications</Text>
            <Switch
              value={emailNotify}
              onValueChange={(val) => { setEmailNotify(val); setTimeout(handleSaveNotifications, 200); }}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>SMS Alerts</Text>
            <Switch
              value={smsNotify}
              onValueChange={(val) => { setSmsNotify(val); setTimeout(handleSaveNotifications, 200); }}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Switch
              value={pushNotify}
              onValueChange={(val) => { setPushNotify(val); setTimeout(handleSaveNotifications, 200); }}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Support Ticketing */}
        <Text style={styles.sectionLabel}>Help & Support</Text>
        <View style={styles.cardContainer}>
          <Text style={styles.cardInfo}>Need help? Create a support ticket below.</Text>
          <Input
            label="Subject"
            placeholder="e.g. Booking dispute, App crash"
            value={ticketSubject}
            onChangeText={setTicketSubject}
          />
          <Input
            label="Message"
            placeholder="Describe your issue in detail..."
            multiline
            numberOfLines={4}
            value={ticketMessage}
            onChangeText={setTicketMessage}
          />
          <TouchableOpacity 
            style={[styles.ticketBtn, submittingTicket && styles.disabledBtn]} 
            onPress={handleSupportSubmit}
            disabled={submittingTicket}
          >
            {submittingTicket ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ticketBtnText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Version Information */}
        <Text style={styles.sectionLabel}>About App</Text>
        <View style={styles.cardContainer}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutVal}>v1.0.0 (Expo SDK 57)</Text>
          </View>
          <TouchableOpacity style={[styles.aboutRow, { borderBottomWidth: 0 }]} onPress={() => Alert.alert('Privacy Policy', 'Standard platform terms & conditions apply.')}>
            <Text style={styles.aboutLink}>Privacy Policy & Terms</Text>
            <Ionicons name="chevron-forward" size={16} color="#0D9488" />
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EC',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 10,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
  },
  switchLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  cardInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  ticketBtn: {
    backgroundColor: '#0D9488', // Accent Green
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  ticketBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
  },
  aboutLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  aboutVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  aboutLink: {
    fontSize: 14,
    color: '#0D9488',
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
