import React, { useState, useEffect } from 'react';
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
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(user?.profilePhoto || null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setCity(user.city || '');
      setAddress(user.address || '');
      setSelectedPhoto(user.profilePhoto || null);
    }
  }, [user]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const selectDefaultAvatar = (url: string) => {
    setSelectedPhoto(url);
  };

  const pickImageFromGallery = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;

          setUploadingPhoto(true);
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'customer_profiles');

            const res = await fetch(`${LOCAL_API_URL}/upload`, {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.url || data.secure_url) {
              setSelectedPhoto(data.url || data.secure_url);
              Alert.alert('Success', 'Profile photo uploaded!');
            } else {
              Alert.alert('Upload Failed', data.error || 'Failed to upload photo');
            }
          } catch (err: any) {
            Alert.alert('Upload Error', err.message || 'Error uploading photo');
          } finally {
            setUploadingPhoto(false);
          }
        };
        input.click();
        return;
      }

      // Native Mobile APK / iOS
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
      setUploadingPhoto(true);

      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || `profile_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', {
        uri: asset.uri,
        name: filename,
        type: asset.mimeType || type,
      } as any);
      formData.append('folder', 'customer_profiles');

      const res = await fetch(`${LOCAL_API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url || data.secure_url) {
        setSelectedPhoto(data.url || data.secure_url);
        Alert.alert('Success', 'Profile photo uploaded!');
      } else {
        Alert.alert('Upload Failed', data.error || 'Failed to upload photo');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Error selecting photo from gallery');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim() || !phone.trim() || !city.trim() || !email.trim()) {
      setError('Name, Phone, Email, and City are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        phone,
        email,
        city,
        address,
        avatar: selectedPhoto
      };

      const res = await fetch(`${LOCAL_API_URL}/customer/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Fetch updated user profile
        const fetchRes = await fetch(`${LOCAL_API_URL}/customer/profile?phone=${phone}`);
        if (fetchRes.ok) {
          const updatedDbUser = await fetchRes.json();
          const mappedUser = {
            ...updatedDbUser,
            id: updatedDbUser._id.toString(),
            profilePhoto: updatedDbUser.avatar
          };
          setUser(mappedUser);
        }

        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server.');
    } finally {
      setSaving(false);
    }
  };

  const photoUri = (selectedPhoto && !selectedPhoto.includes('default-avatar.png')) 
    ? selectedPhoto 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Customer')}&background=0F2C59&color=fff&size=128`;

  return (
    <SafeAreaView style={[styles.safeContainer, { paddingTop: topPadding }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        {/* Profile Photo Section */}
        <View style={styles.photoContainer}>
          <TouchableOpacity style={styles.avatarFrame} onPress={pickImageFromGallery} activeOpacity={0.8}>
            <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chooseGalleryBtn} onPress={pickImageFromGallery} disabled={uploadingPhoto}>
            <Ionicons name="image-outline" size={16} color="#3B5BFF" style={{ marginRight: 6 }} />
            <Text style={styles.chooseGalleryText}>
              {uploadingPhoto ? 'Uploading to Cloudinary...' : 'Choose from Gallery'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Default Avatars Section */}
        <Text style={styles.avatarSectionTitle}>Or Select Avatar</Text>
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
          editable={false} // Disable changing phone as it's the identifier
        />

        <Input
          label="Email Address"
          placeholder="Enter email address"
          iconName="mail-outline"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          label="City"
          placeholder="Enter city name"
          iconName="pin-outline"
          value={city}
          onChangeText={setCity}
        />

        <Input
          label="Default Delivery Address"
          placeholder="Enter complete address"
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scrollContainer: {
    padding: 24,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#3B5BFF',
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
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  chooseGalleryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B5BFF',
  },
  avatarSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    textAlign: 'center',
  },
  defaultAvatarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  defaultAvatarBtn: {
    marginHorizontal: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: 25,
    padding: 2,
  },
  selectedAvatarBtn: {
    borderColor: '#0D9488',
  },
  defaultAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    backgroundColor: '#0F2C59',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
