import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useBallotingStore } from '../store/useBallotingStore';

/**
 * BallotingCountdownScreen Component.
 * Displays live priority balloting window countdown, real-time queue access tokens,
 * quota availability across UNILAG & CMUL hostels, and balloting room selector entry CTA.
 */
export const BallotingCountdownScreen: React.FC = () => {
  const { session } = useAuthStore();
  const { countdownState, isLoading, error, fetchCountdown, issueQueueTicket, tickTimer } = useBallotingStore();

  const userId = session?.user?.id;
  const userCategory = session?.studentProfile?.priorityCategory || 'FRESHER';

  const [queueSuccessMsg, setQueueSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCountdown(userCategory, userId).catch(() => {});
  }, [userCategory, userId]);

  useEffect(() => {
    const timer = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRequestQueueTicket = async () => {
    if (!userId) return;
    setQueueSuccessMsg(null);
    try {
      const token = await issueQueueTicket(userId, userCategory);
      setQueueSuccessMsg(`Queue token #${token.positionInQueue} issued successfully!`);
    } catch {
      // Store handles error automatically
    }
  };

  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Header */}
        <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">Balloting Engine</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Real-Time Priority Quota Balloting & Countdown
          </Text>
        </View>

        {isLoading && !countdownState && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-3">Fetching balloting windows from Turso DB...</Text>
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <Text className="text-red-800 font-semibold text-base mb-1">Error Loading Engine</Text>
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {queueSuccessMsg && (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
            <Text className="text-emerald-800 font-semibold text-base mb-1">Queue Ticket Issued</Text>
            <Text className="text-emerald-700 text-sm">{queueSuccessMsg}</Text>
          </View>
        )}

        {countdownState && (
          <>
            {/* Live Countdown Banner (S-03 Specification) */}
            <View className="bg-[#D4AF37] p-5 rounded-2xl mb-4 shadow-md items-center">
              <Text className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-1">
                {countdownState.isWindowActive ? 'BALLOTING WINDOW ACTIVE' : 'NEXT BALLOTING WINDOW STARTS IN'}
              </Text>
              <Text className="text-slate-900 text-4xl font-extrabold tracking-tight my-2">
                {formatCountdown(countdownState.timeRemainingSeconds)}
              </Text>
              <Text className="text-slate-900 text-xs font-semibold">
                Priority Category: {userCategory}
              </Text>
            </View>

            {/* Fair Real-Time Queue Token Card */}
            <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Fair Priority Queue Token
                </Text>
                {countdownState.queueToken && (
                  <View className="bg-emerald-600 px-2.5 py-0.5 rounded-full">
                    <Text className="text-white text-[10px] font-bold uppercase">Ticket Issued</Text>
                  </View>
                )}
              </View>

              {countdownState.queueToken ? (
                <View className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-slate-500 text-xs font-medium">Your Queue Position</Text>
                    <Text className="text-[#7A0000] font-black text-2xl">
                      #{countdownState.queueToken.positionInQueue}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-xs">Estimated Wait Time</Text>
                    <Text className="text-slate-900 font-bold text-xs">
                      ~{countdownState.queueToken.estimatedWaitTimeSeconds} Seconds
                    </Text>
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-slate-500 text-xs mb-3">
                    Request a real-time priority queue token to secure your position when balloting opens.
                  </Text>
                  <TouchableOpacity
                    className="bg-slate-800 h-11 rounded-xl justify-center items-center active:opacity-90"
                    onPress={handleRequestQueueTicket}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-white text-xs font-bold">Request Queue Ticket</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Current Window Metadata */}
            {countdownState.currentWindow && (
              <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Window Details
                </Text>
                <Text className="text-slate-900 text-lg font-bold">{countdownState.currentWindow.title}</Text>
                <Text className="text-slate-500 text-xs mt-1">
                  Start: {new Date(countdownState.currentWindow.startTime).toLocaleString()}
                </Text>
                <Text className="text-slate-500 text-xs mt-0.5">
                  End: {new Date(countdownState.currentWindow.endTime).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Quota Allocation Matrix Header */}
            <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Live Hostel Quotas & Capacity
              </Text>

              <View className="space-y-3">
                {countdownState.quotas.map((quota) => (
                  <View
                    key={quota.hostelId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-slate-900 font-bold text-sm">{quota.hostelName}</Text>
                      <Text className="text-slate-500 text-xs">
                        {quota.campus} ({quota.gender})
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-emerald-700 font-extrabold text-sm">
                        {quota.availableBedspaces} Beds Available
                      </Text>
                      <Text className="text-slate-400 text-xs">
                        Total: {quota.totalCapacity}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Enter Balloting Selector CTA */}
            <TouchableOpacity
              className={`h-14 rounded-xl justify-center items-center shadow-md active:opacity-90 ${
                countdownState.isWindowActive ? 'bg-[#7A0000]' : 'bg-slate-400'
              }`}
              disabled={!countdownState.isWindowActive}
            >
              <Text className="text-white text-base font-bold">
                {countdownState.isWindowActive ? 'Enter Balloting Room Selector' : 'Window Not Active'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
