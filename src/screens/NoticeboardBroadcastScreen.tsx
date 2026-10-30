import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useNoticeboardStore } from '../store/useNoticeboardStore';
import {
  AnnouncementPriority,
  AnnouncementTargetAudience
} from '../types/noticeboard';

/**
 * NoticeboardBroadcastScreen Component.
 * Enables Hall Wardens to broadcast official notices and announcements to students.
 * Styled according to Section 6 of PRD.md using NativeWind Tailwind CSS.
 */
export const NoticeboardBroadcastScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    announcements,
    isLoading,
    error,
    noticeMessage,
    fetchAnnouncements,
    postAnnouncement,
    togglePin,
    deleteAnnouncement,
    clearNoticeMessage,
    clearError
  } = useNoticeboardStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [targetAudience, setTargetAudience] = useState<AnnouncementTargetAudience>('ALL_STUDENTS');
  const [isPinned, setIsPinned] = useState(false);
  const [hostelId, setHostelId] = useState('hostel_jafojo'); // Default hostel for warden session

  useEffect(() => {
    if (session?.user.id) {
      fetchAnnouncements(hostelId, session.user.id);
    }
  }, [session?.user.id, hostelId]);

  const handlePost = async () => {
    if (!session?.user.id) return;
    const success = await postAnnouncement({
      hostelId,
      wardenId: session.user.id,
      title,
      content,
      priority,
      targetAudience,
      isPinned
    });

    if (success) {
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setTargetAudience('ALL_STUDENTS');
      setIsPinned(false);
    }
  };

  const getPriorityBadgeStyle = (pri: AnnouncementPriority) => {
    switch (pri) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Header Title Section */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-2xl font-bold text-[#7A0000]">HOSTEL NOTICEBOARD</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Publish official warden announcements and alerts directly to student dashboards.
          </Text>
          <Text className="text-slate-700 text-xs mt-2 font-semibold">
            Posting as: {session?.user.fullName || 'Hall Warden'}
          </Text>
        </View>

        {/* Feedback Banners */}
        {error && (
          <View className="bg-red-50 border border-red-300 p-4 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-red-800 text-xs font-semibold flex-1 mr-2">{error}</Text>
            <TouchableOpacity onPress={clearError} className="px-2 py-1 bg-red-200 rounded-lg">
              <Text className="text-red-900 text-xs font-bold">Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {noticeMessage && (
          <View className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-emerald-800 text-xs font-semibold flex-1 mr-2">{noticeMessage}</Text>
            <TouchableOpacity onPress={clearNoticeMessage} className="px-2 py-1 bg-emerald-200 rounded-lg">
              <Text className="text-emerald-900 text-xs font-bold">Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Create Broadcast Form */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-base font-bold text-slate-800 mb-3">Create New Broadcast</Text>

          {/* Announcement Title */}
          <Text className="text-xs font-semibold text-slate-600 mb-1">Announcement Headline / Title *</Text>
          <TextInput
            className="bg-slate-50 border border-slate-300 p-3 rounded-xl text-slate-800 text-sm mb-4"
            placeholder="e.g. Water Supply Maintenance & Power Interruption Notice"
            value={title}
            onChangeText={setTitle}
          />

          {/* Announcement Body Content */}
          <Text className="text-xs font-semibold text-slate-600 mb-1">Detailed Notice Content *</Text>
          <TextInput
            className="bg-slate-50 border border-slate-300 p-3 rounded-xl text-slate-800 text-sm mb-4 h-24"
            placeholder="Enter the full message for hall residents..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          {/* Priority Level Selector */}
          <Text className="text-xs font-semibold text-slate-600 mb-2">Priority Level</Text>
          <View className="flex-row space-x-2 mb-4">
            {(['NORMAL', 'HIGH', 'URGENT'] as AnnouncementPriority[]).map((pri) => (
              <TouchableOpacity
                key={pri}
                onPress={() => setPriority(pri)}
                className={`flex-1 py-2 rounded-xl items-center border ${
                  priority === pri
                    ? pri === 'URGENT'
                      ? 'bg-red-600 border-red-700'
                      : pri === 'HIGH'
                      ? 'bg-amber-600 border-amber-700'
                      : 'bg-[#7A0000] border-[#7A0000]'
                    : 'bg-slate-100 border-slate-300'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    priority === pri ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {pri}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Target Audience Selector */}
          <Text className="text-xs font-semibold text-slate-600 mb-2">Target Resident Audience</Text>
          <View className="flex-row space-x-2 mb-4">
            {(
              [
                { key: 'ALL_STUDENTS', label: 'All Residents' },
                { key: 'FRESHERS_ONLY', label: 'Freshers Only' },
                { key: 'FINALISTS_ONLY', label: 'Finalists Only' }
              ] as { key: AnnouncementTargetAudience; label: string }[]
            ).map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setTargetAudience(item.key)}
                className={`flex-1 py-2 px-1 rounded-xl items-center border ${
                  targetAudience === item.key
                    ? 'bg-slate-800 border-slate-900'
                    : 'bg-slate-100 border-slate-300'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    targetAudience === item.key ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pin to Top Checkbox Toggle */}
          <TouchableOpacity
            onPress={() => setIsPinned(!isPinned)}
            className="flex-row items-center bg-slate-50 border border-slate-300 p-3 rounded-xl mb-4"
          >
            <View
              className={`w-5 h-5 rounded border items-center justify-center mr-3 ${
                isPinned ? 'bg-[#7A0000] border-[#7A0000]' : 'border-slate-400 bg-white'
              }`}
            >
              {isPinned && <Text className="text-white text-xs font-bold">✓</Text>}
            </View>
            <Text className="text-xs font-semibold text-slate-700">
              Pin to top of Noticeboard Feed
            </Text>
          </TouchableOpacity>

          {/* Publish Action Button */}
          <TouchableOpacity
            onPress={handlePost}
            disabled={isLoading}
            className="bg-[#7A0000] py-4 rounded-xl items-center shadow-sm active:opacity-90"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white font-bold text-sm">Publish Announcement</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Announcements History Feed */}
        <Text className="text-base font-bold text-slate-800 mb-3">
          Published Announcements ({announcements.length})
        </Text>

        {announcements.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
            <Text className="text-slate-400 text-sm">No announcements published yet.</Text>
          </View>
        ) : (
          announcements.map((item) => (
            <View
              key={item.id}
              className={`bg-white p-4 rounded-2xl border mb-3 shadow-sm ${
                item.isPinned ? 'border-[#7A0000] bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              {/* Card Header & Badges */}
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center space-x-2">
                  <View
                    className={`px-2 py-0.5 rounded-md border ${getPriorityBadgeStyle(
                      item.priority
                    )}`}
                  >
                    <Text className="text-[10px] font-bold">{item.priority}</Text>
                  </View>
                  {item.isPinned && (
                    <View className="bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-bold text-amber-800">📌 PINNED</Text>
                    </View>
                  )}
                </View>
                <Text className="text-[10px] text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {/* Title & Body */}
              <Text className="text-sm font-bold text-slate-900 mb-1">{item.title}</Text>
              <Text className="text-xs text-slate-600 mb-3 leading-relaxed">{item.content}</Text>

              {/* Footer Meta & Actions */}
              <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
                <Text className="text-[10px] text-slate-500 font-medium">
                  Audience: {item.targetAudience.replace('_', ' ')}
                </Text>

                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() =>
                      togglePin(item.id, item.isPinned, hostelId, session?.user.id)
                    }
                    className="px-2 py-1 bg-slate-100 rounded-lg border border-slate-300"
                  >
                    <Text className="text-[10px] font-semibold text-slate-700">
                      {item.isPinned ? 'Unpin' : 'Pin'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteAnnouncement(item.id, hostelId, session?.user.id)}
                    className="px-2 py-1 bg-red-100 rounded-lg border border-red-300"
                  >
                    <Text className="text-[10px] font-semibold text-red-700">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
