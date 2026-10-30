import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useNoticeboardStore } from '../store/useNoticeboardStore';
import { NoticeCategory, NoticePriority } from '../types/noticeboard';

/**
 * NoticeboardScreen Component.
 * Provides official hostel announcement broadcast system for Hall Wardens and Student Affairs Administrators,
 * as well as feed view for students and staff.
 * Designed according to PRD Section 6 specifications with high contrast and large touch targets.
 */
export const NoticeboardScreen: React.FC = () => {
  const { session } = useAuthStore();
  const isWardenOrAdmin =
    session?.user.role === 'WARDEN' || session?.user.role === 'ADMIN';

  const {
    announcements,
    isLoading,
    isSubmitting,
    error,
    activeFilter,
    fetchAnnouncements,
    createAnnouncement,
    togglePinAnnouncement,
    deleteAnnouncement,
    setFilter,
    clearError,
  } = useNoticeboardStore();

  // New Announcement Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('GENERAL');
  const [priority, setPriority] = useState<NoticePriority>('NORMAL');
  const [targetHostelId, setTargetHostelId] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleBroadcast = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter an announcement title.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Validation Error', 'Please enter announcement content.');
      return;
    }

    try {
      await createAnnouncement({
        title,
        content,
        category,
        priority,
        targetHostelId: targetHostelId.trim() || null,
        authorId: session?.user.id || 'WARDEN-01',
        authorName: session?.user.fullName || 'Hall Warden',
        authorRole: session?.user.role || 'WARDEN',
        isPinned,
      });

      Alert.alert('Success', 'Announcement broadcasted successfully to hostel noticeboard.');
      setTitle('');
      setContent('');
      setCategory('GENERAL');
      setPriority('NORMAL');
      setTargetHostelId('');
      setIsPinned(false);
      setShowCreateModal(false);
    } catch (err: any) {
      Alert.alert('Broadcast Error', err.message || 'Failed to broadcast announcement.');
    }
  };

  const getPriorityBadgeClass = (p: NoticePriority) => {
    switch (p) {
      case 'URGENT':
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getCategoryBadgeClass = (c: NoticeCategory) => {
    switch (c) {
      case 'EMERGENCY':
        return 'bg-red-600 text-white';
      case 'MAINTENANCE':
        return 'bg-amber-600 text-white';
      case 'SECURITY':
        return 'bg-purple-600 text-white';
      case 'EVENT':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-20">
        {/* Top Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 pr-2">
              <Text className="text-2xl font-extrabold text-[#7A0000]">
                HOSTEL NOTICEBOARD
              </Text>
              <Text className="text-slate-500 text-xs mt-1">
                Official Warden Broadcasts & General Announcements
              </Text>
            </View>
            {isWardenOrAdmin && (
              <TouchableOpacity
                className="bg-[#7A0000] px-4 py-3 rounded-xl shadow active:opacity-90 min-h-[48px] justify-center items-center"
                onPress={() => setShowCreateModal(!showCreateModal)}
              >
                <Text className="text-white font-bold text-sm">
                  {showCreateModal ? 'Close Form' : '+ New Broadcast'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Warden Broadcast Composition Form */}
        {isWardenOrAdmin && showCreateModal && (
          <View className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md mb-6">
            <Text className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">
              Compose Official Broadcast
            </Text>

            <Text className="text-xs font-bold text-slate-700 uppercase mb-1">Title</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 p-3 rounded-xl mb-3 text-slate-900 font-medium"
              placeholder="e.g. Water Supply Maintenance Schedule"
              value={title}
              onChangeText={setTitle}
            />

            <Text className="text-xs font-bold text-slate-700 uppercase mb-1">Content</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 p-3 rounded-xl mb-3 text-slate-900 min-h-[100px] font-medium"
              placeholder="Type official notice details..."
              multiline
              numberOfLines={4}
              value={content}
              onChangeText={setContent}
            />

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-700 uppercase mb-1">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1">
                  {(['GENERAL', 'MAINTENANCE', 'SECURITY', 'EVENT', 'EMERGENCY'] as NoticeCategory[]).map(
                    (cat) => (
                      <TouchableOpacity
                        key={cat}
                        className={`px-3 py-2 rounded-lg border ${
                          category === cat
                            ? 'bg-[#7A0000] border-[#7A0000]'
                            : 'bg-slate-100 border-slate-300'
                        }`}
                        onPress={() => setCategory(cat)}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            category === cat ? 'text-white' : 'text-slate-700'
                          }`}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-700 uppercase mb-1">Priority</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1">
                  {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as NoticePriority[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      className={`px-3 py-2 rounded-lg border ${
                        priority === p
                          ? 'bg-amber-600 border-amber-600'
                          : 'bg-slate-100 border-slate-300'
                      }`}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          priority === p ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              className={`p-3 rounded-xl border mb-4 flex-row items-center justify-between ${
                isPinned ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-300'
              }`}
              onPress={() => setIsPinned(!isPinned)}
            >
              <Text className="text-xs font-bold text-slate-800">Pin to Top of Noticeboard</Text>
              <Text className="text-xs font-bold text-[#7A0000]">
                {isPinned ? '📌 PINNED' : 'UNPINNED'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-[#7A0000] py-4 rounded-xl items-center shadow min-h-[56px] justify-center active:opacity-90"
              onPress={handleBroadcast}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-bold uppercase tracking-wider">
                  Publish Broadcast
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Category & Search Filter Bar */}
        <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Filter Announcements
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-3">
            {['ALL', 'GENERAL', 'MAINTENANCE', 'SECURITY', 'EVENT', 'EMERGENCY'].map((cat) => (
              <TouchableOpacity
                key={cat}
                className={`px-4 py-2 rounded-xl border ${
                  activeFilter.category === cat
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-slate-100 border-slate-200'
                }`}
                onPress={() => setFilter({ category: cat as any })}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeFilter.category === cat ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-900 text-xs"
            placeholder="Search announcements by keyword..."
            value={activeFilter.searchQuery || ''}
            onChangeText={(text) => setFilter({ searchQuery: text })}
          />
        </View>

        {/* Error Notice */}
        {error && (
          <View className="bg-red-50 border border-red-300 p-4 rounded-xl mb-4">
            <Text className="text-red-800 text-xs font-bold">{error}</Text>
          </View>
        )}

        {/* Feed List */}
        {isLoading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-500 text-xs mt-2 font-medium">
              Loading hostel announcements...
            </Text>
          </View>
        ) : announcements.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center">
            <Text className="text-slate-400 font-bold text-base mb-1">
              No Announcements Found
            </Text>
            <Text className="text-slate-500 text-xs text-center">
              There are no official notices matching your search criteria.
            </Text>
          </View>
        ) : (
          announcements.map((item) => (
            <View
              key={item.id}
              className={`bg-white p-5 rounded-2xl border mb-4 shadow-sm ${
                item.isPinned ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              {/* Card Header Badges */}
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center gap-2">
                  <View className={`px-2.5 py-1 rounded-md ${getCategoryBadgeClass(item.category)}`}>
                    <Text className="text-[10px] font-extrabold uppercase">{item.category}</Text>
                  </View>
                  <View
                    className={`px-2.5 py-1 rounded-md border ${getPriorityBadgeClass(item.priority)}`}
                  >
                    <Text className="text-[10px] font-extrabold uppercase">{item.priority}</Text>
                  </View>
                </View>

                {item.isPinned && (
                  <View className="bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-extrabold text-amber-800">📌 PINNED</Text>
                  </View>
                )}
              </View>

              {/* Title & Body */}
              <Text className="text-lg font-bold text-slate-900 mb-2">{item.title}</Text>
              <Text className="text-slate-700 text-sm leading-relaxed mb-4">{item.content}</Text>

              {/* Footer Metadata */}
              <View className="border-t border-slate-100 pt-3 flex-row justify-between items-center">
                <View>
                  <Text className="text-xs font-bold text-slate-800">{item.authorName}</Text>
                  <Text className="text-[10px] text-slate-500">
                    {item.authorRole} • {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {/* Warden Management Quick Actions */}
                {isWardenOrAdmin && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-slate-200 px-3 py-1.5 rounded-lg active:opacity-80"
                      onPress={() => togglePinAnnouncement(item.id, !item.isPinned)}
                    >
                      <Text className="text-xs font-bold text-slate-800">
                        {item.isPinned ? 'Unpin' : 'Pin'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="bg-red-100 px-3 py-1.5 rounded-lg active:opacity-80"
                      onPress={() => deleteAnnouncement(item.id)}
                    >
                      <Text className="text-xs font-bold text-red-700">Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
