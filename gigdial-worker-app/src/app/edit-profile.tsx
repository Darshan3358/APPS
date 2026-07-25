import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Image, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { API_URL as LOCAL_API_URL } from '../config/api';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
];

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : insets.top;

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(user?.profilePhoto || null);
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Handle default avatar selection
  const selectDefaultAvatar = async (url: string) => {
    setSelectedPhoto(url);
    if (!user?.id) return;
    setUploading(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/worker/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhoto: url })
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...data.user, id: data.user._id.toString() };
        setUser(updatedUser);
        Alert.alert('Avatar Updated', 'Selected default profile photo.');
      } else {
        Alert.alert('Error', data.error || 'Failed to update photo.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to connect to server.');
    } finally {
      setUploading(false);
    }
  };

  // Open device media gallery / custom file selector
  const handleCustomUpload = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User session not found.');
      return;
    }

    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;

          setUploading(true);
          try {
            const formData = new FormData();
            formData.append('profilePhoto', file);

            const res = await fetch(`${LOCAL_API_URL}/worker/${user.id}/upload-profile-photo`, {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (res.ok) {
              setSelectedPhoto(data.profilePhoto);
              const updatedUser = { ...data.user, id: data.user._id.toString() };
              setUser(updatedUser);
              Alert.alert('Success', 'Profile photo updated successfully!');
            } else {
              Alert.alert('Upload Failed', data.error || 'Failed to upload photo.');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to upload photo.');
          } finally {
            setUploading(false);
          }
        };
        input.click();
        return;
      }

      // Native Mobile (Android APK / iOS)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access media library is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || `profile_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('profilePhoto', {
        uri: asset.uri,
        name: filename,
        type: asset.mimeType || type,
      } as any);

      const res = await fetch(`${LOCAL_API_URL}/worker/${user.id}/upload-profile-photo`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedPhoto(data.profilePhoto);
        const updatedUser = { ...data.user, id: data.user._id.toString() };
        setUser(updatedUser);
        Alert.alert('Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('Upload Failed', data.error || 'Failed to upload photo.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to select image from gallery.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim() || !phone.trim() || !city.trim()) {
      setError('Name, Phone, and City are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/worker/${user?.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, city, address })
      });

      setSaving(false);
      const data = await res.json();

      if (res.ok) {
        const updatedUser = { ...data.user, id: data.user._id.toString() };
        setUser(updatedUser);
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        setError(data.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setSaving(false);
      setError(err.message || 'Failed to connect to server.');
    }
  };

  const getProfilePhotoUri = (photo: string | null | undefined, fallbackName: string = 'Worker'): string => {
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

  const photoUri = getProfilePhotoUri(selectedPhoto, user?.name);

  return (
    <SafeAreaView style={[styles.safeContainer, { paddingTop: topPadding }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        <View style={styles.cardContainer}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {/* Profile Photo Section */}
          <View style={styles.photoContainer}>
            <TouchableOpacity style={styles.avatarFrame} onPress={handleCustomUpload}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-circle" size={80} color="#9CA3AF" />
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            {uploading ? (
              <ActivityIndicator size="small" color="#0D9488" style={{ marginTop: 10 }} />
            ) : (
              <TouchableOpacity style={styles.chooseGalleryBtn} onPress={handleCustomUpload}>
                <Ionicons name="image-outline" size={14} color="#0D9488" style={{ marginRight: 6 }} />
                <Text style={styles.chooseGalleryText}>Choose Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Default Avatars Section */}
          <Text style={styles.avatarSectionTitle}>Choose Default Avatar</Text>
          <View style={styles.defaultAvatarsRow}>
            {DEFAULT_AVATARS.map((url, idx) => {
              const isSelected = selectedPhoto === url;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.defaultAvatarBtn, isSelected && styles.selectedAvatarBtn]}
                  onPress={() => selectDefaultAvatar(url)}
                >
                  <Image source={{ uri: url }} style={styles.defaultAvatarImg} />
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Full Name"
            placeholder="Enter your name"
            iconName="person-outline"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Phone Number"
            placeholder="Enter phone number"
            iconName="call-outline"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Input
            label="City"
            placeholder="Enter city name"
            iconName="pin-outline"
            value={city}
            onChangeText={setCity}
          />

          <Input
            label="Complete Address"
            placeholder="Enter residence address"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
          />

          <TouchableOpacity 
            style={[styles.saveBtn, saving && styles.disabledBtn]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
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
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E8EC',
    shadowColor: '#0F2C59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarFrame: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0D9488',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chooseGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  chooseGalleryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F2C59',
  },
  avatarSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  defaultAvatarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  defaultAvatarBtn: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 22,
    padding: 2,
  },
  selectedAvatarBtn: {
    borderColor: '#0D9488',
  },
  defaultAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  errorBanner: {
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#0D9488', // Accent Green
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
