import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useBallotingStore } from '../store/useBallotingStore';

export const BallotingCountdownScreen: React.FC = () => {
  const { session } = useAuthStore();
  const { countdownState, isLoading, error, fetchCountdown, tickTimer } = useBallotingStore();

  const userCategory = session?.studentProfile?.priorityCategory || 'FRESHER';

  useEffect(() => {
    fetchCountdown(userCategory).catch(() => {});
  }, [userCategory]);

  useEffect(() => {
    const timer = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
