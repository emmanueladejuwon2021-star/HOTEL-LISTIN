import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useNoticeboardStore } from '../store/useNoticeboardStore';
import { AnnouncementCategory, AnnouncementPriority } from '../types/community';

/**
 * NoticeboardBroadcastScreen Component.
 * Enables Hall Wardens to issue official announcements and broadcast notices
 * to student hostel noticeboards.
 * Fully compliant with PRD Section 6 styling and Issue #89 [COMMUNITY-04].
 */
export const NoticeboardBroadcastScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    announcements,
    isLoading,
    isSubmitting,
    errorMessage,
    successMessage,
    selectedCategory,
    fetchAnnouncements,
    createAnnouncement,
    togglePin,
    archiveAnnouncement,
    setSelectedCategory,
    clearMessages,
  } = useNoticeboardStore();

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hostelId, setHostelId] = useState('ALL_HOSTELS');
  const [hostelName, setHostelName] = useState('All Hostels (Campus-Wide)');
  const [category, setCategory] = useState<AnnouncementCategory>('GENERAL');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [isPinned, setIsPinned] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePublish = async () => {
    clearMessages();
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Validation Error', 'Please enter a title (at least 3 characters).');
      return;
    }
    if (!content.trim() || content.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter content body (at least 10 characters).');
      return;
    }

    const wardenId = session?.user.id || 'WARDEN-001';
    const wardenName = session?.user.fullName || 'Hall Warden';

    const success = await createAnnouncement({
      hostelId,
      hostelName,
      wardenId,
      wardenName,
      title,
      content,
      category,
      priority,
      isPinned,
    });

    if (success) {
      setTitle('');
      setContent('');
      setIsPinned(false);
      setShowForm(false);
    }
  };

  const categoriesList: (AnnouncementCategory | 'ALL')[] = [
    'ALL',
    'GENERAL',
    'MAINTENANCE',
    'SECURITY',
    'UTILITIES',
    'EVENTS',
    'EMERGENCY',
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Warden Executive Portal Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-2xl font-bold text-[#7A0000]">
            HOSTEL NOTICEBOARD BROADCAST
          </Text>
          <Text className="text-slate-500 text-xs mt-1">
            Issue official warden announcements & emergency notices to student feeds
          </Text>
          <Text className="text-slate-700 text-xs mt-3 font-semibold">
            Broadcaster: {session?.user.fullName || 'Hall Warden'} ({session?.user.email || 'warden@unilag.edu.ng'})
          </Text>
        </View>

        {/* Alert Banners */}
        {errorMessage ? (
          <View className="bg-rose-100 border border-rose-300 p-4 rounded-xl mb-4">
            <Text className="text-rose-800 font-medium text-sm">{errorMessage}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl mb-4">
            <Text className="text-emerald-800 font-medium text-sm">{successMessage}</Text>
          </View>
        ) : null}

        {/* Action Toggle Button */}
        <TouchableOpacity
          className="bg-[#7A0000] py-3.5 px-5 rounded-xl items-center shadow-md mb-5 flex-row justify-center space-x-2"
          onPress={() => {
            clearMessages();
            setShowForm(!showForm);
          }}
        >
          <Text className="text-white text-base font-bold">
            {showForm ? '✕ Close Broadcast Form' : '＋ Create New Announcement Broadcast'}
          </Text>
        </TouchableOpacity>

        {/* Create Broadcast Form */}
        {showForm && (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <Text className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
              New Noticeboard Announcement
            </Text>

            {/* Target Hostel Picker */}
            <Text className="text-xs font-bold text-slate-500 uppercase mb-1">Target Audience</Text>
            <View className="flex-row space-x-2 mb-4">
              <TouchableOpacity
                className={`flex-1 py-2 px-3 rounded-lg border text-center ${
                  hostelId === 'ALL_HOSTELS'
                    ? 'bg-[#7A0000] border-[#7A0000]'
                    : 'bg-slate-50 border-slate-300'
                }`}
                onPress={() => {
                  setHostelId('ALL_HOSTELS');
                  setHostelName('All Hostels (Campus-Wide)');
                }}
              >
                <Text
                  className={`text-xs font-semibold text-center ${
                    hostelId === 'ALL_HOSTELS' ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  All Hostels
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-2 px-3 rounded-lg border text-center ${
                  hostelId === 'JAJA_HALL'
                    ? 'bg-[#7A0000] border-[#7A0000]'
                    : 'bg-slate-50 border-slate-300'
                }`}
                onPress={() => {
                  setHostelId('JAJA_HALL');
                  setHostelName('King Jaja Hall');
                }}
              >
                <Text
                  className={`text-xs font-semibold text-center ${
                    hostelId === 'JAJA_HALL' ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  King Jaja Hall
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-2 px-3 rounded-lg border text-center ${
                  hostelId === 'MOREMI_HALL'
                    ? 'bg-[#7A0000] border-[#7A0000]'
                    : 'bg-slate-50 border-slate-300'
                }`}
                onPress={() => {
                  setHostelId('MOREMI_HALL');
                  setHostelName('Moremi Hall');
                }}
              >
                <Text
                  className={`text-xs font-semibold text-center ${
                    hostelId === 'MOREMI_HALL' ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  Moremi Hall
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <Text className="text-xs font-bold text-slate-500 uppercase mb-1">Headline Title</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4"
              placeholder="e.g. Mandatory Hall Cleanliness Inspection"
              value={title}
              onChangeText={setTitle}
            />

            {/* Content Input */}
            <Text className="text-xs font-bold text-slate-500 uppercase mb-1">Announcement Body</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4 h-28"
              placeholder="Write detailed broadcast message for students..."
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />

            {/* Category Picker Pills */}
            <Text className="text-xs font-bold text-slate-500 uppercase mb-1">Topic Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {(['GENERAL', 'MAINTENANCE', 'SECURITY', 'UTILITIES', 'EVENTS', 'EMERGENCY'] as AnnouncementCategory[]).map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    className={`py-1.5 px-3 rounded-full border mr-2 ${
                      category === cat
                        ? 'bg-amber-600 border-amber-600'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        category === cat ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            {/* Priority Selector & Pin Toggle */}
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-row space-x-2">
                {(['NORMAL', 'HIGH', 'URGENT'] as AnnouncementPriority[]).map((prio) => (
                  <TouchableOpacity
                    key={prio}
                    className={`py-1 px-2.5 rounded-lg border ${
                      priority === prio
                        ? prio === 'URGENT'
                          ? 'bg-rose-600 border-rose-600'
                          : prio === 'HIGH'
                          ? 'bg-amber-500 border-amber-500'
                          : 'bg-slate-700 border-slate-700'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                    onPress={() => setPriority(prio)}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        priority === prio ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {prio}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                className={`py-1.5 px-3 rounded-lg border flex-row items-center ${
                  isPinned ? 'bg-amber-500 border-amber-500' : 'bg-slate-50 border-slate-300'
                }`}
                onPress={() => setIsPinned(!isPinned)}
              >
                <Text
                  className={`text-xs font-bold ${
                    isPinned ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {isPinned ? '📌 Pinned to Top' : '📌 Pin to Top'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className="bg-[#7A0000] py-3.5 rounded-xl items-center shadow-md active:opacity-90"
              onPress={handlePublish}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-bold">Publish Broadcast</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Category Filter Scroll Bar */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Noticeboard Feed Filter
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categoriesList.map((cat) => (
              <TouchableOpacity
                key={cat}
                className={`py-1.5 px-3.5 rounded-full border mr-2 ${
                  selectedCategory === cat
                    ? 'bg-[#7A0000] border-[#7A0000]'
                    : 'bg-white border-slate-200'
                }`}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedCategory === cat ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Noticeboard Announcements Feed */}
        <View className="space-y-4">
          {isLoading ? (
            <View className="p-8 items-center">
              <ActivityIndicator size="large" color="#7A0000" />
              <Text className="text-slate-500 text-xs mt-2">Loading noticeboard feed...</Text>
            </View>
          ) : announcements.length === 0 ? (
            <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
              <Text className="text-slate-400 font-semibold text-sm">
                No noticeboard announcements found.
              </Text>
              <Text className="text-slate-400 text-xs mt-1">
                Tap 'Create New Announcement Broadcast' to issue a notice.
              </Text>
            </View>
          ) : (
            announcements.map((item) => (
              <View
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4"
              >
                {/* Header Badges */}
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center space-x-2">
                    {item.isPinned && (
                      <View className="bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                        <Text className="text-amber-800 text-[10px] font-extrabold">📌 PINNED</Text>
                      </View>
                    )}
                    <View className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      <Text className="text-slate-700 text-[10px] font-bold">
                        {item.category}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`px-2 py-0.5 rounded-md ${
                      item.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-800'
                        : item.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-extrabold ${
                        item.priority === 'URGENT'
                          ? 'text-rose-800'
                          : item.priority === 'HIGH'
                          ? 'text-amber-800'
                          : 'text-emerald-800'
                      }`}
                    >
                      {item.priority}
                    </Text>
                  </View>
                </View>

                {/* Announcement Title & Content */}
                <Text className="text-base font-bold text-slate-800 mb-1">{item.title}</Text>
                <Text className="text-slate-600 text-sm mb-3 leading-relaxed">{item.content}</Text>

                {/* Footer Metadata & Controls */}
                <View className="border-t border-slate-100 pt-2 flex-row justify-between items-center">
                  <View>
                    <Text className="text-slate-400 text-[11px] font-medium">
                      By {item.wardenName} • {item.hostelName}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">
                      {new Date(item.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {/* Warden Action Buttons */}
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
                      onPress={() => togglePin(item.id, !item.isPinned)}
                    >
                      <Text className="text-slate-700 text-xs font-semibold">
                        {item.isPinned ? 'Unpin' : 'Pin'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                      onPress={() => archiveAnnouncement(item.id)}
                    >
                      <Text className="text-rose-700 text-xs font-semibold">Archive</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
