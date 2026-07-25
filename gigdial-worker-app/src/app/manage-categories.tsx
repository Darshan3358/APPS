import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_URL as LOCAL_API_URL } from '../config/api';

export default function ManageCategoriesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : insets.top;

  const [activeCategory, setActiveCategory] = useState(user?.mainCategory || 'Electrician');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [masterCategories, setMasterCategories] = useState<{ name: string }[]>([]);
  const [masterSkills, setMasterSkills] = useState<{ name: string }[]>([]);

  const fetchProfileCategories = async () => {
    if (!user?.id) return;
    try {
      // 1. Fetch worker categories & skills
      const workerRes = await fetch(`${LOCAL_API_URL}/worker/${user.id}/categories`);
      if (workerRes.ok) {
        const workerData = await workerRes.json();
        setSelectedSkills(workerData.skills || []);
        if (workerData.categories && workerData.categories.length > 0) {
          setActiveCategory(workerData.categories[0]);
        }
      }

      // 2. Fetch Master Categories
      const catsRes = await fetch(`${LOCAL_API_URL}/master/categories`);
      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setMasterCategories(catsData);
      }

      // 3. Fetch Master Skills
      const skillsRes = await fetch(`${LOCAL_API_URL}/master/skills`);
      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        setMasterSkills(skillsData);
      }
    } catch (err) {
      console.log('Error fetching categories & skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileCategories();
  }, [user?.id]);

  const toggleSkill = (skillName: string) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`${LOCAL_API_URL}/worker/${user.id}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: [activeCategory],
          skills: selectedSkills
        })
      });

      setSaving(false);
      if (res.ok) {
        Alert.alert('Success', 'Category & Skills saved successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update category & skills.');
      }
    } catch (err: any) {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Manage Skills</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F2C59" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.cardContainer}>
            <Text style={styles.sectionLabel}>Active Category</Text>
            <View style={styles.categoryRow}>
              {masterCategories.map((cat) => (
                <TouchableOpacity 
                  key={cat.name} 
                  style={[
                    styles.catItem,
                    activeCategory === cat.name && styles.catItemActive
                  ]}
                  onPress={() => setActiveCategory(cat.name)}
                >
                  <Text style={[
                    styles.catText,
                    activeCategory === cat.name && styles.catTextActive
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Registered Skills</Text>
            <View style={styles.skillsContainer}>
              {masterSkills.map((skill) => {
                const active = selectedSkills.includes(skill.name);
                return (
                  <TouchableOpacity 
                    key={skill.name} 
                    style={[
                      styles.skillChip,
                      active && styles.skillChipActive
                    ]}
                    onPress={() => toggleSkill(skill.name)}
                  >
                    <Text style={[
                      styles.skillChipText,
                      active && styles.skillChipTextActive
                    ]}>
                      {skill.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, saving && styles.disabledBtn]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Skills</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  catItem: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F5F6FA',
  },
  catItemActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  catText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  catTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
    gap: 6,
  },
  skillChip: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F6FA',
  },
  skillChipActive: {
    backgroundColor: '#0F2C59',
    borderColor: '#0F2C59',
  },
  skillChipText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  skillChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
