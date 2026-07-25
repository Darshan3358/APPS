import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL as LOCAL_API_URL } from '../../config/api';

interface Category {
  _id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
}

export default function ServicesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${LOCAL_API_URL}/master/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const SERVICE_GROUPS = [
    {
      title: 'Home Services',
      color: '#FFF0F0',
      iconColor: '#2B6CB0',
      services: [
        { name: 'Painting and Decoration', icon: 'brush-outline' },
        { name: 'Lighting and Electrical', icon: 'flash-outline' },
        { name: 'Plumbing', icon: 'water-outline' },
        { name: 'Furniture Repair and Assembly', icon: 'construct-outline' },
        { name: 'Ghar ki Marramat and Nirman', icon: 'hammer-outline' },
        { name: 'Home Cleaning', icon: 'brush-outline' },
        { name: 'AC and Appliance Repair', icon: 'construct-outline' },
        { name: 'Pest Control', icon: 'bug-outline' },
        { name: 'Carpentry', icon: 'hammer-outline' }
      ]
    },
    {
      title: 'Logistics and Moving',
      color: '#EFF6FF',
      iconColor: '#2563EB',
      services: [
        { name: 'House Shifting', icon: 'cube-outline' },
        { name: 'Heavy Lifting', icon: 'barbell-outline' },
        { name: 'Local Delivery', icon: 'bicycle-outline' },
        { name: 'Import-Export Support', icon: 'archive-outline' },
        { name: 'Vehicle Rental Assistance', icon: 'car-outline' },
        { name: 'Courier Services', icon: 'paper-plane-outline' }
      ]
    },
    {
      title: 'Events and Hospitality',
      color: '#FDF2F8',
      iconColor: '#DB2777',
      services: [
        { name: 'Waiter and Catering', icon: 'restaurant-outline' },
        { name: 'Event Planning', icon: 'calendar-outline' },
        { name: 'Photography', icon: 'camera-outline' },
        { name: 'Decoration', icon: 'rose-outline' },
        { name: 'Bartending', icon: 'wine-outline' },
        { name: 'Sound and DJ Services', icon: 'musical-notes-outline' }
      ]
    },
    {
      title: 'IT and Technology',
      color: '#F5F3FF',
      iconColor: '#7C3AED',
      services: [
        { name: 'Laptop/Mobile Repair', icon: 'hardware-chip-outline' },
        { name: 'Smart Home Installation', icon: 'home-outline' },
        { name: 'Network and Wi-Fi Support', icon: 'wifi-outline' },
        { name: 'Digital Marketing', icon: 'megaphone-outline' },
        { name: 'Website Development', icon: 'code-slash-outline' },
        { name: 'App Installation and Support', icon: 'phone-portrait-outline' }
      ]
    },
    {
      title: 'Education and Professional Services',
      color: '#FFFBEB',
      iconColor: '#D97706',
      services: [
        { name: 'Tuition', icon: 'book-outline' },
        { name: 'Business Guide', icon: 'briefcase-outline' },
        { name: 'Stock Analysis', icon: 'trending-up-outline' },
        { name: 'Career Counseling', icon: 'people-outline' },
        { name: 'Language Training', icon: 'language-outline' },
        { name: 'Skill Workshops', icon: 'construct-outline' }
      ]
    },
    {
      title: 'Unique and Trendy Services',
      color: '#FFF5F5',
      iconColor: '#E53E3E',
      services: [
        { name: 'Pet Grooming and Care', icon: 'paw-outline' },
        { name: 'Sustainable Gardening', icon: 'leaf-outline' },
        { name: 'Elderly Care', icon: 'heart-outline' },
        { name: 'DIY Craft and Workshops', icon: 'color-palette-outline' },
        { name: 'Local Tour Guide', icon: 'compass-outline' },
        { name: 'Home-Based Meal Prep', icon: 'restaurant-outline' },
        { name: 'Personalized Gifts', icon: 'gift-outline' },
        { name: 'Fitness Coaching', icon: 'barbell-outline' },
        { name: 'Home Organization', icon: 'grid-outline' },
        { name: 'Astrology/Numerology', icon: 'sparkles-outline' },
        { name: 'Content Writing', icon: 'document-text-outline' },
        { name: 'Tailoring and Fashion Design', icon: 'shirt-outline' }
      ]
    }
  ];

  const handleCategoryPress = (categoryName: string) => {
    router.push({
      pathname: '/(tabs)/book',
      params: { selectedCategory: categoryName }
    });
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = SERVICE_GROUPS.map(group => {
    const filteredServices = group.services.filter(srv =>
      srv.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...group,
      services: filteredServices
    };
  }).filter(group => group.services.length > 0);

  const insets = useSafeAreaInsets();
  const tabBarHeight = 75; // 65 height + 10 bottom spacing
  const bottomPadding = tabBarHeight + insets.bottom + 20;

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Services</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search service categories..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>



        {/* Grouped Services Sections */}
        {filteredGroups.map((group, idx) => (
          <View key={idx} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.trendyGrid}>
              {group.services.map((service, sIdx) => (
                <TouchableOpacity 
                  key={sIdx} 
                  style={styles.trendyCard}
                  onPress={() => handleCategoryPress(service.name)}
                >
                  <View style={[styles.trendyIconCircle, { backgroundColor: group.color }]}>
                    <Ionicons name={service.icon as any} size={22} color={group.iconColor} />
                  </View>
                  <Text style={styles.trendyName} numberOfLines={2}>{service.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Post Requirement Card */}
        <View style={styles.postCard}>
          <View style={styles.postCardLeft}>
            <View style={styles.postIconContainer}>
              <Ionicons name="document-text" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.postTextCol}>
              <Text style={styles.postTitle}>Can't find your service?</Text>
              <Text style={styles.postSubtitle}>Post your requirement directly — the right professional will find you.</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.postBtn}
            onPress={() => Alert.alert('Post Requirement', 'Requirement posting is handled directly in the Booking wizard. Click Book tab to post a new job!')}
          >
            <Text style={styles.postBtnText}>Post Now</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2C59',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2C59',
    marginBottom: 16,
    marginTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F2C59',
    marginBottom: 16,
    marginTop: 8,
  },
  trendyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  trendyCard: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  trendyName: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },
  postCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    gap: 16,
    borderWidth: 1,
    borderColor: '#60A5FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  postIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  postTextCol: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  postSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  postBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtnText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
