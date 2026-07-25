import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';

export interface BannerRecord {
  _id: string;
  title: string;
  image: string;
  route: string;
  isActive: boolean;
  status?: string;
}

export interface BlogRecord {
  _id: string;
  title: string;
  slug: string;
  category: string;
  isPublished?: boolean;
  status?: string;
  image?: string;
  thumbnail?: string;
  summary?: string;
  excerpt?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CMSBannerManagerProps {
  banners: BannerRecord[];
  blogs: BlogRecord[];
  onAddBanner: (banner: Omit<BannerRecord, '_id'>) => void;
  onUpdateBanner: (id: string, updateData: Partial<BannerRecord>) => void;
  onDeleteBanner: (id: string) => void;
  onAddBlog: (blog: Omit<BlogRecord, '_id'>) => void;
  onUpdateBlog: (id: string, updateData: Partial<BlogRecord>) => void;
  onDeleteBlog: (id: string) => void;
}

type StatusFilterType = 'All' | 'Active' | 'Inactive';
type BlogCategoryType = 'Tips & Advice' | 'Maintenance' | 'Services Guide' | 'General News';

const BLOG_CATEGORIES: BlogCategoryType[] = [
  'Tips & Advice',
  'Maintenance',
  'Services Guide',
  'General News'
];

export default function CMSBannerManager({
  banners,
  blogs = [],
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  onAddBlog,
  onUpdateBlog,
  onDeleteBlog,
}: CMSBannerManagerProps) {
  const [activeTab, setActiveTab] = useState<'Banners' | 'Blog'>('Banners');
  const [bannerStatusFilter, setBannerStatusFilter] = useState<StatusFilterType>('All');
  
  // Banner Modal state
  const [bannerModalVisible, setBannerModalVisible] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImage, setNewBannerImage] = useState('');
  const [newBannerRoute, setNewBannerRoute] = useState('');

  // Blog Modal state
  const [blogModalVisible, setBlogModalVisible] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogCategory, setBlogCategory] = useState<BlogCategoryType>('Tips & Advice');
  const [blogIsPublished, setBlogIsPublished] = useState(true);
  const [blogImage, setBlogImage] = useState('');
  const [blogSummary, setBlogSummary] = useState('');
  const [blogContent, setBlogContent] = useState('');

  // Helper to check blog published status
  const checkIsBlogPublished = (blog: BlogRecord) => {
    if (blog.status !== undefined && blog.status !== null && blog.status !== '') {
      return blog.status.toLowerCase() === 'published';
    }
    return blog.isPublished !== false;
  };

  // Auto-generate slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  const handleTitleChange = (text: string) => {
    setBlogTitle(text);
    if (!editingBlogId) {
      setBlogSlug(generateSlug(text));
    }
  };

  const checkIsActive = (item: any) => {
    if (item.status !== undefined && item.status !== null && item.status !== '') {
      return item.status.toLowerCase() === 'active';
    }
    return item.isActive !== false;
  };

  const filteredBanners = banners.filter((b) => {
    const active = checkIsActive(b);
    if (bannerStatusFilter === 'Active') return active;
    if (bannerStatusFilter === 'Inactive') return !active;
    return true;
  });

  const handleCreateBanner = () => {
    if (!newBannerTitle || !newBannerImage || !newBannerRoute) {
      alert('Please fill out all banner fields');
      return;
    }
    onAddBanner({
      title: newBannerTitle,
      image: newBannerImage,
      route: newBannerRoute,
      isActive: true,
    } as any);
    setNewBannerTitle('');
    setNewBannerImage('');
    setNewBannerRoute('');
    setBannerModalVisible(false);
  };

  const openNewBlogModal = () => {
    setEditingBlogId(null);
    setBlogTitle('');
    setBlogSlug('');
    setBlogCategory('Tips & Advice');
    setBlogIsPublished(true);
    setBlogImage('');
    setBlogSummary('');
    setBlogContent('');
    setBlogModalVisible(true);
  };

  const openEditBlogModal = (item: BlogRecord) => {
    setEditingBlogId(item._id);
    setBlogTitle(item.title);
    setBlogSlug(item.slug || generateSlug(item.title));
    setBlogCategory((item.category as BlogCategoryType) || 'Tips & Advice');
    setBlogIsPublished(checkIsBlogPublished(item));
    setBlogImage(item.thumbnail || item.image || '');
    setBlogSummary(item.excerpt || item.summary || '');
    setBlogContent(item.content || '');
    setBlogModalVisible(true);
  };

  const handleSaveBlog = () => {
    if (!blogTitle || !blogImage || !blogSummary) {
      alert('Please enter Title, Image URL, and Summary');
      return;
    }

    const finalSlug = blogSlug.trim() || generateSlug(blogTitle);

    if (editingBlogId) {
      onUpdateBlog(editingBlogId, {
        title: blogTitle,
        slug: finalSlug,
        category: blogCategory,
        isPublished: blogIsPublished,
        status: blogIsPublished ? 'published' : 'draft',
        image: blogImage,
        thumbnail: blogImage,
        summary: blogSummary,
        excerpt: blogSummary,
        content: blogContent,
      });
    } else {
      onAddBlog({
        title: blogTitle,
        slug: finalSlug,
        category: blogCategory,
        isPublished: blogIsPublished,
        status: blogIsPublished ? 'published' : 'draft',
        image: blogImage,
        thumbnail: blogImage,
        summary: blogSummary,
        excerpt: blogSummary,
        content: blogContent,
      });
    }

    setBlogModalVisible(false);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Navigation Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Banners' && styles.tabBtnActive]}
            onPress={() => setActiveTab('Banners')}
          >
            <Text style={[styles.tabText, activeTab === 'Banners' && styles.tabTextActive]}>Banners</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Blog' && styles.tabBtnActive]}
            onPress={() => setActiveTab('Blog')}
          >
            <Text style={[styles.tabText, activeTab === 'Blog' && styles.tabTextActive]}>Blog</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Top Bar */}
        <View style={styles.headerRow}>
          {activeTab === 'Banners' ? (
            <View style={styles.filterPillsRow}>
              {(['All', 'Active', 'Inactive'] as StatusFilterType[]).map((st) => {
                const isActive = bannerStatusFilter === st;
                const count = st === 'All'
                  ? banners.length
                  : st === 'Active'
                    ? banners.filter(b => checkIsActive(b)).length
                    : banners.filter(b => !checkIsActive(b)).length;

                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setBannerStatusFilter(st)}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {st} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.sectionHeading}>Blog Posts ({blogs.length})</Text>
          )}

          {/* Dynamic Top Action Button */}
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => (activeTab === 'Banners' ? setBannerModalVisible(true) : openNewBlogModal())}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              {activeTab === 'Banners' ? 'Add Banner' : 'Add Blog Post'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Banners List */}
        {activeTab === 'Banners' ? (
          <View style={styles.list}>
            {filteredBanners.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No banners found for this filter</Text>
              </View>
            ) : (
              filteredBanners.map((item) => {
                const bannerActive = checkIsActive(item);
                return (
                  <View key={item._id} style={styles.card}>
                    <Image source={{ uri: item.image }} style={styles.bannerImage} resizeMode="cover" />
                    
                    <View style={styles.cardContent}>
                      <View style={styles.meta}>
                        <Text style={styles.bannerTitle}>{item.title}</Text>
                        <Text style={styles.bannerRoute}>{item.route}</Text>
                      </View>
                      
                      <View style={styles.controlsRow}>
                        <View style={styles.switchCol}>
                          <Text style={[styles.statusText, bannerActive ? styles.statusActive : styles.statusInactive]}>
                            {bannerActive ? 'Active' : 'Inactive'}
                          </Text>
                          <Switch
                            value={bannerActive}
                            onValueChange={(val) => onUpdateBanner(item._id, {
                              isActive: val,
                              status: val ? 'active' : 'inactive',
                            })}
                            trackColor={{ false: '#D1D5DB', true: '#3B5BFF' }}
                            thumbColor="#FFFFFF"
                            style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } : {}}
                          />
                        </View>

                        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDeleteBanner(item._id)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* Tab 2: Blog Posts Table / List */
          <View style={styles.list}>
            {blogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="journal-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No blog posts published yet</Text>
              </View>
            ) : (
              blogs.map((item) => {
                const isPub = checkIsBlogPublished(item);
                const thumbnailUri = item.thumbnail || item.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500';
                const summaryText = item.excerpt || item.summary || 'No summary provided';

                return (
                  <View key={item._id} style={styles.blogCard}>
                    <Image 
                      source={{ uri: thumbnailUri }} 
                      style={styles.blogThumbnail} 
                      resizeMode="cover" 
                    />
                    
                    <View style={styles.blogCardContent}>
                      <View style={styles.blogHeaderRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.category || 'Tips & Advice'}</Text>
                        </View>
                        <Text style={styles.blogDate}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Draft'}
                        </Text>
                      </View>

                      <Text style={styles.blogTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.blogSlugText}>slug: /blog/{item.slug}</Text>
                      <Text style={styles.blogSummary} numberOfLines={2}>{summaryText}</Text>
                      
                      <View style={styles.blogFooterRow}>
                        <View style={styles.switchColHorizontal}>
                          <Text style={[styles.statusText, isPub ? styles.statusActive : styles.statusInactive]}>
                            {isPub ? 'Published' : 'Draft'}
                          </Text>
                          <Switch
                            value={isPub}
                            onValueChange={(val) => onUpdateBlog(item._id, {
                              isPublished: val,
                              status: val ? 'published' : 'draft'
                            })}
                            trackColor={{ false: '#D1D5DB', true: '#16A34A' }}
                            thumbColor="#FFFFFF"
                            style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } : {}}
                          />
                        </View>

                        <TouchableOpacity style={styles.actionIconButton} onPress={() => openEditBlogModal(item)}>
                          <Ionicons name="pencil" size={16} color="#3B5BFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIconButton} onPress={() => onDeleteBlog(item._id)}>
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Banner Modal */}
      <Modal visible={bannerModalVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>Add Banner</Text>
              <TouchableOpacity onPress={() => setBannerModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.content}>
              <Text style={modalStyles.inputLabel}>Banner Title</Text>
              <TextInput
                placeholder="e.g. Summer Discount Offer"
                placeholderTextColor="#9CA3AF"
                style={modalStyles.input}
                value={newBannerTitle}
                onChangeText={setNewBannerTitle}
              />

              <Text style={modalStyles.inputLabel}>Image URL</Text>
              <TextInput
                placeholder="https://images.unsplash.com/photo-..."
                placeholderTextColor="#9CA3AF"
                style={modalStyles.input}
                value={newBannerImage}
                onChangeText={setNewBannerImage}
              />

              <Text style={modalStyles.inputLabel}>Route/Link</Text>
              <TextInput
                placeholder="e.g. /register or /details"
                placeholderTextColor="#9CA3AF"
                style={modalStyles.input}
                value={newBannerRoute}
                onChangeText={setNewBannerRoute}
              />

              <TouchableOpacity style={modalStyles.submitBtn} onPress={handleCreateBanner}>
                <Text style={modalStyles.submitBtnText}>Create Banner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Write & Publish Blog Post Modal */}
      <Modal visible={blogModalVisible} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { maxHeight: '90%' }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>
                {editingBlogId ? 'Edit Blog Post' : 'Write & Publish Blog Post'}
              </Text>
              <TouchableOpacity onPress={() => setBlogModalVisible(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#1E2A47" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              {/* Title & Slug */}
              <Text style={modalStyles.inputLabel}>Blog Title</Text>
              <TextInput
                placeholder="e.g. 10 Essential Home Maintenance Tips"
                placeholderTextColor="#9CA3AF"
                style={modalStyles.input}
                value={blogTitle}
                onChangeText={handleTitleChange}
              />

              <View style={modalStyles.slugBox}>
                <Ionicons name="link-outline" size={16} color="#3B5BFF" style={{ marginRight: 6 }} />
                <Text style={modalStyles.slugLabel}>URL Slug:</Text>
                <TextInput
                  style={modalStyles.slugInput}
                  value={blogSlug}
                  onChangeText={setBlogSlug}
                  placeholder="auto-generated-slug"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Category Picker */}
              <Text style={modalStyles.inputLabel}>Category</Text>
              <View style={modalStyles.categoryRow}>
                {BLOG_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      modalStyles.catBtn,
                      blogCategory === cat && modalStyles.catBtnActive
                    ]}
                    onPress={() => setBlogCategory(cat)}
                  >
                    <Text style={[
                      modalStyles.catBtnText,
                      blogCategory === cat && modalStyles.catBtnTextActive
                    ]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Publish Status Toggle */}
              <View style={modalStyles.publishStatusRow}>
                <View>
                  <Text style={modalStyles.inputLabel}>Publication Status</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    {blogIsPublished ? 'Visible to all customers & professionals' : 'Saved as draft'}
                  </Text>
                </View>
                <Switch
                  value={blogIsPublished}
                  onValueChange={setBlogIsPublished}
                  trackColor={{ false: '#D1D5DB', true: '#16A34A' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Cover Image URL */}
              <Text style={modalStyles.inputLabel}>Cover Thumbnail Image URL</Text>
              <TextInput
                placeholder="https://images.unsplash.com/photo-..."
                placeholderTextColor="#9CA3AF"
                style={modalStyles.input}
                value={blogImage}
                onChangeText={setBlogImage}
              />

              {/* Short Excerpt */}
              <Text style={modalStyles.inputLabel}>Short Excerpt / Summary</Text>
              <TextInput
                placeholder="Brief summary of the article for card preview..."
                placeholderTextColor="#9CA3AF"
                style={[modalStyles.input, { height: 60 }]}
                multiline
                value={blogSummary}
                onChangeText={setBlogSummary}
              />

              {/* Article Content */}
              <Text style={modalStyles.inputLabel}>Main Article Body Content</Text>
              <TextInput
                placeholder="Write the full blog article content here..."
                placeholderTextColor="#9CA3AF"
                style={[modalStyles.input, { height: 120, textAlignVertical: 'top' }]}
                multiline
                value={blogContent}
                onChangeText={setBlogContent}
              />

              <TouchableOpacity style={modalStyles.submitBtn} onPress={handleSaveBlog}>
                <Text style={modalStyles.submitBtnText}>
                  {editingBlogId ? 'Update Blog Post' : (blogIsPublished ? 'Publish Article Now' : 'Save Draft')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E2A47', marginBottom: 16 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#E5E8EC', borderRadius: 8, padding: 3, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  tabTextActive: { color: '#1E2A47' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: '#1E2A47' },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E8EC',
  },
  filterPillActive: {
    backgroundColor: '#3B5BFF',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B5BFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  list: { gap: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerImage: { width: '100%', height: 120 },
  cardContent: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { flex: 1, marginRight: 10 },
  bannerTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E2A47' },
  bannerRoute: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchCol: { alignItems: 'center' },
  statusText: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  statusActive: { color: '#16A34A' },
  statusInactive: { color: '#EF4444' },
  deleteBtn: { padding: 6 },

  // Blog Card Styles
  blogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  blogThumbnail: { width: 100, height: '100%', minHeight: 120 },
  blogCardContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  blogHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  categoryBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', color: '#3B5BFF' },
  blogDate: { fontSize: 11, color: '#9CA3AF' },
  blogTitle: { fontSize: 14, fontWeight: '800', color: '#1E2A47', marginTop: 2 },
  blogSlugText: { fontSize: 11, color: '#3B5BFF', fontStyle: 'italic', marginBottom: 4 },
  blogSummary: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  blogFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  switchColHorizontal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blogActionsRow: { flexDirection: 'row', gap: 8 },
  actionIconButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingBottom: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E2A47' },
  closeBtn: { padding: 4 },
  content: { gap: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E2A47',
    backgroundColor: '#F9FAFB',
  },
  slugBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  slugLabel: { fontSize: 11, fontWeight: '700', color: '#3B5BFF', marginRight: 4 },
  slugInput: { flex: 1, fontSize: 12, color: '#1E2A47', padding: 0 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E8EC' },
  catBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#3B5BFF' },
  catBtnText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  catBtnTextActive: { color: '#3B5BFF' },
  publishStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  submitBtn: {
    marginTop: 12,
    height: 44,
    backgroundColor: '#3B5BFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
