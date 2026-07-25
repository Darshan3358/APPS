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
  Image,
} from 'react-native';
import { theme } from '@/styles/theme';
import ToggleRow from '@/components/ToggleRow';

export interface SubscriptionSettingsData {
  upiId: string;
  qrCodeImageUrl: string;
  autoGenerateQr: boolean;
}

interface SubscriptionSettingsScreenProps {
  settings: SubscriptionSettingsData;
  onSaveSettings: (settings: SubscriptionSettingsData) => void;
}

export default function SubscriptionSettingsScreen({
  settings,
  onSaveSettings,
}: SubscriptionSettingsScreenProps) {
  const [upiId, setUpiId] = useState('gigdial@upi');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [autoGen, setAutoGen] = useState(true);

  useEffect(() => {
    if (settings) {
      setUpiId(settings.upiId || 'gigdial@upi');
      setQrCodeUrl(settings.qrCodeImageUrl || '');
      setAutoGen(settings.autoGenerateQr !== false);
    }
  }, [settings]);

  const handleSave = () => {
    if (!upiId.trim()) {
      alert('Please enter a valid UPI ID');
      return;
    }
    onSaveSettings({
      upiId: upiId.trim(),
      qrCodeImageUrl: qrCodeUrl.trim(),
      autoGenerateQr: autoGen,
    });
  };

  const previewUpiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=GigDial&am=499&cu=INR`;
  const qrPreviewUrl = autoGen
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(previewUpiString)}`
    : qrCodeUrl;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenHeader}>Subscription Payment Settings</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>UPI Payment Configuration</Text>
          <Text style={styles.helperText}>
            Configure the default UPI details that workers will scan to pay for their Pro subscriptions.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Admin UPI ID</Text>
            <TextInput
              style={styles.textInput}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="e.g., business@okaxis"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.spacer} />

          <Text style={styles.sectionTitle}>QR Code Properties</Text>
          <ToggleRow
            title="Auto-Generate QR Code"
            description="Dynamically build scan QR from the specified UPI ID above"
            value={autoGen}
            onValueChange={setAutoGen}
          />

          {!autoGen && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Custom QR Code Image URL</Text>
              <TextInput
                style={styles.textInput}
                value={qrCodeUrl}
                onChangeText={setQrCodeUrl}
                placeholder="e.g., https://example.com/qr-code.png"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {/* QR Code Live Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Live Preview</Text>
            {(autoGen || qrPreviewUrl) ? (
              <View style={styles.qrFrame}>
                <Image
                  source={{ uri: qrPreviewUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrCaption}>Scan to Pay ₹499 via UPI</Text>
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.placeholderText}>Enter custom QR Image URL or select Auto-Generate</Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save UPI Parameters</Text>
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
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  spacer: {
    height: 16,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  qrFrame: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrCaption: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
    fontWeight: '500',
  },
  qrPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placeholderText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#0D9488',
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
