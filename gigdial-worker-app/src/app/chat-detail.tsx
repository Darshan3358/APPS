import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, 
  KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Image, 
  ActivityIndicator, Alert, Linking, Modal 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL as LOCAL_API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  _id?: string;
  bookingId: string;
  senderRole: 'customer' | 'worker';
  text?: string;
  type?: 'text' | 'image' | 'location';
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    addressName?: string;
  };
  timestamp: string;
  createdAt: number;
}

export default function ChatDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId, title } = useLocalSearchParams();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const paddingTop = Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, insets.top) + 10 : Math.max(insets.top, 12);
  const paddingBottom = Math.max(insets.bottom, 12);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/${bookingId}/chats`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.log('Error fetching chat messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const originalText = inputText;
    setInputText('');
    setShowAttachMenu(false);

    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/${bookingId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: 'worker',
          text: originalText,
          type: 'text'
        })
      });

      if (res.ok) {
        fetchMessages();
      } else {
        setInputText(originalText);
      }
    } catch (err) {
      console.log('Error sending message:', err);
      setInputText(originalText);
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!msg._id) return;
    const msgId = msg._id;
    setSelectedMessage(null);

    // Optimistically remove from local state
    setMessages((prev) => prev.filter((m) => m._id !== msgId));

    try {
      await fetch(`${LOCAL_API_URL}/bookings/${bookingId}/chats/${msgId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.log('Error deleting message:', err);
    }
  };

  // Share Live GPS Location with Real Coordinates
  const handleShareLocation = async () => {
    setShowAttachMenu(false);
    setUploading(true);

    try {
      let lat = 23.0225;
      let lng = 72.5714;
      let locName = 'Worker Live Location';

      if ((Platform.OS as string) === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            await sendLocationMsg(lat, lng, locName);
          },
          async () => {
            await sendLocationMsg(lat, lng, locName);
          },
          { timeout: 5000 }
        );
      } else {
        await sendLocationMsg(lat, lng, locName);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to fetch current location.');
      setUploading(false);
    }
  };

  const sendLocationMsg = async (latitude: number, longitude: number, addressName: string) => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/${bookingId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: 'worker',
          text: '📍 Shared Live Location',
          type: 'location',
          location: { latitude, longitude, addressName }
        })
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.log('Error sending location:', err);
    } finally {
      setUploading(false);
    }
  };

  // Send Image from Gallery / Camera (Cloudinary + Base64 fallback)
  const handlePickImage = async () => {
    setShowAttachMenu(false);

    try {
      if ((Platform.OS as string) === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;

          setUploading(true);
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64Url = event.target?.result as string;
            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('folder', 'chat_images');

              const res = await fetch(`${LOCAL_API_URL}/upload`, {
                method: 'POST',
                body: formData,
              });
              const data = await res.json();
              const cloudUrl = data.url || data.secure_url;
              await sendImageMsg(cloudUrl || base64Url);
            } catch (err) {
              await sendImageMsg(base64Url);
            } finally {
              setUploading(false);
            }
          };
          reader.readAsDataURL(file);
        };
        input.click();
        return;
      }

      // Native Mobile (APK)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access media library is required to send photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const asset = result.assets[0];
      const localUri = asset.uri;
      const base64Uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : localUri;

      try {
        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || `chat_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('file', {
          uri: asset.uri,
          name: filename,
          type: asset.mimeType || type,
        } as any);
        formData.append('folder', 'chat_images');

        let data: any;
        if ((Platform.OS as string) === 'web') {
          const res = await fetch(`${LOCAL_API_URL}/upload`, {
            method: 'POST',
            body: formData,
          });
          data = await res.json();
        } else {
          data = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${LOCAL_API_URL}/upload`);
            xhr.onload = () => {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(e);
              }
            };
            xhr.onerror = (e) => reject(e);
            xhr.send(formData);
          });
        }
        const cloudUrl = data.url || data.secure_url;
        await sendImageMsg(cloudUrl || base64Uri);
      } catch (err) {
        await sendImageMsg(base64Uri);
      } finally {
        setUploading(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select image from gallery.');
      setUploading(false);
    }
  };

  const sendImageMsg = async (imageUrl: string) => {
    if (!imageUrl) return;
    try {
      const res = await fetch(`${LOCAL_API_URL}/bookings/${bookingId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: 'worker',
          text: imageUrl,
          type: 'image',
          imageUrl: imageUrl
        })
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.log('Error sending image message:', err);
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open Google Maps.');
    });
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderRole === 'worker';
    const isLocationMsg = item.type === 'location' || (item.text && (item.text.includes('Location') || item.text.includes('📍')));
    
    // Check if message is a real image message with valid URL
    const displayImgUrl = item.imageUrl || (item.text && (item.text.startsWith('http') || item.text.startsWith('data:image/')) ? item.text : null);
    const isValidImageSrc = !!displayImgUrl && (displayImgUrl.startsWith('http://') || displayImgUrl.startsWith('https://') || displayImgUrl.startsWith('data:image/'));
    const isImageMsg = item.type === 'image' || isValidImageSrc;

    const lat = item.location?.latitude || 23.0225;
    const lng = item.location?.longitude || 72.5714;
    const mapEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;

    return (
      <TouchableOpacity 
        style={[styles.messageContainer, isMe ? styles.messageMe : styles.messageOther]}
        onLongPress={() => setSelectedMessage(item)}
        activeOpacity={0.9}
      >
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          
          {/* Quick Delete Option Indicator */}
          <TouchableOpacity 
            style={styles.deleteQuickBtn} 
            onPress={() => setSelectedMessage(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={14} color={isMe ? '#93C5FD' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* Real Interactive Google Maps Location Card */}
          {isLocationMsg ? (
            <View style={styles.locationCardContainer}>
              <View style={styles.locationCardHeader}>
                <Ionicons name="location" size={20} color="#EF4444" />
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.locationCardTitle}>Live Tracking Location</Text>
                  <Text style={styles.locationCardSub}>{item.location?.addressName || 'Current GPS Pin'}</Text>
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>

              {/* Embedded Google Map Preview */}
              {(Platform.OS as string) === 'web' ? (
                <View style={styles.mapIframeWrapper}>
                  <iframe
                    title="Google Map Live Location"
                    width="100%"
                    height="140"
                    style={{ border: 0, borderRadius: 10 }}
                    src={mapEmbedUrl}
                    loading="lazy"
                  />
                </View>
              ) : (
                <View style={styles.mapMobileCard}>
                  <Ionicons name="map" size={36} color="#0F2C59" />
                  <Text style={styles.mapMobileText}>Google Maps GPS Pin</Text>
                  <Text style={styles.mapMobileCoords}>Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.googleMapsNavBtn} 
                onPress={() => openGoogleMaps(lat, lng)}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.googleMapsNavBtnText}>Open Google Maps Live Tracking</Text>
              </TouchableOpacity>
            </View>
          ) : (isImageMsg && isValidImageSrc) ? (
            /* Real Uploaded Image Display */
            <TouchableOpacity 
              style={styles.imageCard}
              onPress={() => setSelectedImageModal(displayImgUrl)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: displayImgUrl }} style={styles.chatImagePreview} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            /* Text Message Type */
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {item.text || (item.type === 'image' ? '📷 Photo Attachment' : '')}
            </Text>
          )}

          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {item.timestamp || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header with Dynamic Status Bar Safe Area Padding */}
      <View style={[styles.header, { paddingTop }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/leads');
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{title || 'Chat'}</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerSub}>Online</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color="#0F2C59" />
            <Text style={styles.uploadingText}>Uploading photo to Cloudinary...</Text>
          </View>
        )}

        {/* WhatsApp Style Attachment Action Menu */}
        {showAttachMenu && (
          <View style={styles.attachMenuSheet}>
            <TouchableOpacity style={styles.attachOption} onPress={handleShareLocation}>
              <View style={[styles.attachIconBg, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="location" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.attachOptionText}>Share Live Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
              <View style={[styles.attachIconBg, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="image" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.attachOptionText}>Send Photo / Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar with Dynamic Bottom Navigation Bar Safe Area Padding */}
        <View style={[styles.inputContainer, { paddingBottom }]}>
          <TouchableOpacity 
            style={[styles.attachToggleBtn, showAttachMenu && styles.attachToggleBtnActive]} 
            onPress={() => setShowAttachMenu(!showAttachMenu)}
          >
            <Ionicons name={showAttachMenu ? "close" : "add"} size={24} color={showAttachMenu ? "#EF4444" : "#0F2C59"} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity style={styles.sendBtn} onPress={handleSendText}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full Image Preview Modal */}
      {selectedImageModal && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalBg}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedImageModal(null)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: selectedImageModal }} style={styles.modalFullImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* Delete / Message Options Modal */}
      {selectedMessage && (
        <Modal visible={true} transparent={true} animationType="fade">
          <TouchableOpacity 
            style={styles.modalBg} 
            activeOpacity={1} 
            onPress={() => setSelectedMessage(null)}
          >
            <View style={styles.actionSheetCard}>
              <Text style={styles.actionSheetTitle}>Message Options</Text>
              
              <TouchableOpacity 
                style={styles.actionSheetBtnDelete} 
                onPress={() => handleDeleteMessage(selectedMessage)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={styles.actionSheetBtnDeleteText}>Delete Message</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionSheetBtnCancel} 
                onPress={() => setSelectedMessage(null)}
              >
                <Text style={styles.actionSheetBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EC',
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  headerSub: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    width: '100%',
  },
  messageMe: {
    justifyContent: 'flex-end',
  },
  messageOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    position: 'relative',
  },
  bubbleMe: {
    backgroundColor: '#0F2C59',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  deleteQuickBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    zIndex: 5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
    paddingRight: 12,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#1A1A1A',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: '#E5E8EC',
  },
  timeTextOther: {
    color: '#6B7280',
  },
  locationCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 260,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F2C59',
  },
  locationCardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#15803D',
  },
  mapIframeWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapMobileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mapMobileText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F2C59',
    marginTop: 4,
  },
  mapMobileCoords: {
    fontSize: 11,
    color: '#64748B',
  },
  googleMapsNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  googleMapsNavBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  imageCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  chatImagePreview: {
    width: 240,
    height: 170,
    borderRadius: 12,
  },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#EEF2F6',
    gap: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: '#0F2C59',
    fontWeight: '600',
  },
  attachMenuSheet: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EC',
  },
  attachOption: {
    alignItems: 'center',
  },
  attachIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  attachOptionText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E8EC',
  },
  attachToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachToggleBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F6FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#1A1A1A',
    fontSize: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  modalFullImage: {
    width: '90%',
    height: '80%',
  },
  actionSheetCard: {
    width: '84%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionSheetBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginBottom: 10,
  },
  actionSheetBtnDeleteText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionSheetBtnCancel: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetBtnCancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
});
