import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNoticeboardStore } from '../store/useNoticeboardStore';
import { useAuthStore } from '../store/useAuthStore';
import { PriorityLevel, AnnouncementCategory, HostelNotice } from '../types/noticeboard';

/**
 * NoticeboardScreen Component.
 * Official UNILAG Hostel Noticeboard Broadcast Feed for Students and Hall Wardens.
 * Allows students to view pinned & categorized warden announcements, while enabling
 * Wardens to create, pin, and manage broadcast posts.
 */
export const NoticeboardScreen: React.FC = () => {
  const { session } = useAuthStore();
  const isWarden = session?.user.role === 'WARDEN' || session?.user.role === 'ADMIN';

  const {
    notices,
    isLoading,
    error,
    selectedCategory,
    fetchNotices,
    createNotice,
    togglePinNotice,
    deleteNotice,
    setSelectedCategory,
    clearError
  } = useNoticeboardStore();

  // Modal creation state for Warden broadcasts
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('GENERAL');
  const [category, setCategory] = useState<AnnouncementCategory>('GENERAL');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  /**
   * Submits a new broadcast notice post as a Hall Warden.
   */
  const handlePublishNotice = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Incomplete Form', 'Please enter both an announcement title and detailed message body.');
      return;
    }

    try {
      await createNotice({
        hostelId: 'ALL_HOSTELS',
        authorWardenId: session?.user.id || 'warden_admin',
        title: title.trim(),
        content: content.trim(),
        priority,
        category,
        isPinned
      });

      Alert.alert('Broadcast Published', 'Your official hostel announcement has been posted successfully.');
      setModalVisible(false);
      setTitle('');
      setContent('');
      setPriority('GENERAL');
      setCategory('GENERAL');
      setIsPinned(false);
    } catch (err: any) {
      Alert.alert('Publishing Failed', err.message || 'Unable to publish announcement broadcast.');
    }
  };

  /**
   * Formats priority tags with Tailwind styling.
   */
  const renderPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case 'EMERGENCY':
        return <View className="bg-red-100 px-3 py-1 rounded-full"><Text className="text-red-700 text-xs font-bold uppercase">Emergency</Text></View>;
      case 'URGENT':
        return <View className="bg-amber-100 px-3 py-1 rounded-full"><Text className="text-amber-800 text-xs font-bold uppercase">Urgent</Text></View>;
      case 'IMPORTANT':
        return <View className="bg-blue-100 px-3 py-1 rounded-full"><Text className="text-blue-800 text-xs font-bold uppercase">Important</Text></View>;
      default:
        return <View className="bg-slate-100 px-3 py-1 rounded-full"><Text className="text-slate-600 text-xs font-bold uppercase">General</Text></View>;
    }
  };

  const categories: Array<{ label: string; value: AnnouncementCategory | 'ALL' }> = [
    { label: 'All', value: 'ALL' },
    { label: 'General', value: 'GENERAL' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Security', value: 'SECURITY' },
    { label: 'Health', value: 'HEALTH' },
    { label: 'Event', value: 'EVENT' }
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header Banner */}
      <View className="bg-[#7A0000] p-5 rounded-b-3xl shadow-md">
        <Text className="text-2xl font-black text-white uppercase tracking-wider">Hostel Noticeboard</Text>
        <Text className="text-slate-200 text-xs mt-1 font-medium">
          Official Warden Announcements & Emergency Campus Updates
        </Text>
      </View>

      {/* Category Filter Scroll */}
      <View className="py-3 px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
          {categories.map((cat) => {
            const active = selectedCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-xl border ${
                  active ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Broadcast Notice Feed */}
      <ScrollView contentContainerClassName="p-4 pb-20">
        {error ? (
          <View className="bg-red-50 p-4 rounded-2xl border border-red-200 mb-4">
            <Text className="text-red-700 text-xs font-semibold">{error}</Text>
            <TouchableOpacity onPress={clearError} className="mt-2">
              <Text className="text-red-900 text-xs font-bold underline">Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading && notices.length === 0 ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-500 text-xs mt-3">Loading official notices...</Text>
          </View>
        ) : notices.length === 0 ? (
          <View className="bg-white p-8 rounded-3xl border border-slate-200 items-center mt-6">
            <Text className="text-slate-400 font-bold text-base mb-1">No Announcements Found</Text>
            <Text className="text-slate-500 text-xs text-center">
              There are currently no published warden notices in this category.
            </Text>
          </View>
        ) : (
          notices.map((notice) => (
            <View
              key={notice.id}
              className={`bg-white p-5 rounded-3xl border mb-4 shadow-sm ${
                notice.isPinned ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              {/* Card Top Row: Category, Priority, and Pin Indicator */}
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center space-x-2">
                  {notice.isPinned ? (
                    <View className="bg-amber-100 px-2.5 py-1 rounded-full flex-row items-center">
                      <Text className="text-amber-800 text-xs font-extrabold mr-1">📌 PINNED</Text>
                    </View>
                  ) : null}
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {notice.category}
                  </Text>
                </View>
                {renderPriorityBadge(notice.priority)}
              </View>

              {/* Title & Body */}
              <Text className="text-lg font-extrabold text-slate-900 mb-2">{notice.title}</Text>
              <Text className="text-slate-700 text-sm leading-relaxed mb-4">{notice.content}</Text>

              {/* Card Footer */}
              <View className="border-t border-slate-100 pt-3 flex-row justify-between items-center">
                <View>
                  <Text className="text-xs font-semibold text-[#7A0000]">
                    {notice.authorName || 'Hall Warden Office'}
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    Published: {new Date(notice.createdAt).toLocaleDateString()} at{' '}
                    {new Date(notice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* Warden Management Controls */}
                {isWarden ? (
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      onPress={() => togglePinNotice(notice.id, !notice.isPinned)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200"
                    >
                      <Text className="text-xs font-bold text-slate-700">
                        {notice.isPinned ? 'Unpin' : 'Pin'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Delete Notice', 'Are you sure you want to delete this announcement?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteNotice(notice.id) }
                        ]);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200"
                    >
                      <Text className="text-xs font-bold text-red-600">Delete</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button for Wardens */}
      {isWarden ? (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="absolute bottom-6 right-6 bg-[#7A0000] px-5 py-4 rounded-full shadow-lg active:opacity-90 flex-row items-center"
        >
          <Text className="text-white text-base font-extrabold mr-1">+</Text>
          <Text className="text-white text-sm font-bold">New Broadcast</Text>
        </TouchableOpacity>
      ) : null}

      {/* Warden Broadcast Creator Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <Text className="text-xl font-black text-[#7A0000]">Publish Warden Broadcast</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-slate-400 font-bold text-base">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerClassName="space-y-4">
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase mb-1">Announcement Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Mandatory Hostel Maintenance Water Shutdown"
                  className="bg-slate-100 p-3.5 rounded-xl text-slate-900 text-sm font-medium border border-slate-200"
                />
              </View>

              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase mb-1">Detailed Message</Text>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter full announcement details for hostel residents..."
                  className="bg-slate-100 p-3.5 rounded-xl text-slate-900 text-sm font-medium border border-slate-200 min-h-[100px]"
                />
              </View>

              {/* Priority Select */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Priority Level</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(['GENERAL', 'IMPORTANT', 'URGENT', 'EMERGENCY'] as PriorityLevel[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      className={`px-3 py-2 rounded-xl border ${
                        priority === p ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${priority === p ? 'text-white' : 'text-slate-700'}`}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Select */}
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Category</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(['GENERAL', 'MAINTENANCE', 'SECURITY', 'HEALTH', 'EVENT'] as AnnouncementCategory[]).map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCategory(c)}
                      className={`px-3 py-2 rounded-xl border ${
                        category === c ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${category === c ? 'text-white' : 'text-slate-700'}`}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Pin Switch Option */}
              <TouchableOpacity
                onPress={() => setIsPinned(!isPinned)}
                className="flex-row items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-200 my-2"
              >
                <Text className="text-amber-900 font-bold text-xs">Pin to Top of Noticeboard</Text>
                <Text className="text-amber-800 font-extrabold text-sm">{isPinned ? 'YES 📌' : 'NO'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePublishNotice}
                className="bg-[#7A0000] py-4 rounded-2xl items-center shadow-md mt-2"
              >
                <Text className="text-white text-base font-bold">Publish Notice Broadcast</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
