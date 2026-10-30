import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * DatabaseManagementScreen Component.
 * Master Database Control Panel for System Administrators.
 * Displays database connection health, schema table statistics, performance index verification cards,
 * foreign key integrity reports, and interactive CTA buttons for schema initialization & seeding.
 *
 * Implements:
 * - [DATABASE-01] Turso libSQL Database Schema DDL & Indexes Component 1
 * - [DATABASE-02] Turso libSQL Database Schema DDL & Indexes Component 2
 * - [DATABASE-03] Turso libSQL Database Schema DDL & Indexes Component 3 (Issue #93)
 */
export const DatabaseManagementScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    healthStats,
    indexVerificationList,
    foreignKeyCheck,
    isLoading,
    errorMessage,
    successMessage,
    initializeSchema,
    fetchHealthStats,
    verifyIndexes,
    checkForeignKeys,
    seedDefaults,
    clearMessages
  } = useDatabaseStore();

  useEffect(() => {
    fetchHealthStats();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView contentContainerClassName="p-5 pb-16">
        {/* Master System Banner */}
        <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6 shadow-md">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xl font-black text-amber-400">DATABASE CONTROL CENTER</Text>
            <View className="bg-emerald-900 px-3 py-1 rounded-full border border-emerald-500">
              <Text className="text-emerald-300 text-[10px] font-bold uppercase">TURSO LIBSQL</Text>
            </View>
          </View>
          <Text className="text-slate-300 text-xs mt-1">
            Schema DDL Execution, Performance Indexes & Foreign Key Verification
          </Text>
          <Text className="text-slate-400 text-xs mt-2">
            System Admin: <Text className="text-white font-bold">{session?.user.fullName || 'System Engineer'}</Text>
          </Text>
        </View>

        {/* Status Messages */}
        {errorMessage && (
          <TouchableOpacity
            className="bg-rose-900/90 border border-rose-500 p-4 rounded-xl mb-4 flex-row justify-between items-center"
            onPress={clearMessages}
          >
            <Text className="text-rose-100 text-xs font-semibold flex-1 pr-2">{errorMessage}</Text>
            <Text className="text-rose-300 text-xs font-bold">Dismiss</Text>
          </TouchableOpacity>
        )}

        {successMessage && (
          <TouchableOpacity
            className="bg-emerald-900/90 border border-emerald-500 p-4 rounded-xl mb-4 flex-row justify-between items-center"
            onPress={clearMessages}
          >
            <Text className="text-emerald-100 text-xs font-semibold flex-1 pr-2">{successMessage}</Text>
            <Text className="text-emerald-300 text-xs font-bold">Dismiss</Text>
          </TouchableOpacity>
        )}

        {/* Action Controls Ribbon */}
        <View className="flex-row space-x-3 mb-6">
          <TouchableOpacity
            className="flex-1 bg-[#7A0000] py-3.5 px-4 rounded-xl items-center shadow-lg active:opacity-90"
            onPress={() => initializeSchema()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white text-xs font-bold uppercase tracking-wider">Initialize Schema</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-amber-600 py-3.5 px-4 rounded-xl items-center shadow-lg active:opacity-90"
            onPress={() => seedDefaults()}
            disabled={isLoading}
          >
            <Text className="text-white text-xs font-bold uppercase tracking-wider">Seed Hostels</Text>
          </TouchableOpacity>
        </View>

        {/* Foreign Key & Connection Overview */}
        <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6 space-y-3">
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            System Integrity & Connection Status
          </Text>
          <View className="flex-row justify-between items-center py-2 border-b border-slate-700">
            <Text className="text-slate-300 text-xs">Connection State</Text>
            <Text className="text-emerald-400 text-xs font-extrabold">{healthStats?.connectionStatus || 'ONLINE'}</Text>
          </View>
          <View className="flex-row justify-between items-center py-2 border-b border-slate-700">
            <Text className="text-slate-300 text-xs">Foreign Key Enforcement</Text>
            <Text className={`text-xs font-extrabold ${foreignKeyCheck?.status === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {foreignKeyCheck?.status === 'HEALTHY' ? 'ENFORCED (0 Violations)' : 'CHECKING...'}
            </Text>
          </View>
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-slate-300 text-xs">Total Active Tables</Text>
            <Text className="text-amber-300 text-xs font-extrabold">{healthStats?.totalTables || 11} System Tables</Text>
          </View>

          <TouchableOpacity
            className="bg-slate-700 py-2.5 rounded-xl items-center mt-2 active:opacity-90"
            onPress={() => checkForeignKeys()}
          >
            <Text className="text-slate-200 text-xs font-bold">Run Foreign Key Audit Check</Text>
          </TouchableOpacity>
        </View>

        {/* Database Table Statistics Grid */}
        <Text className="text-slate-200 font-bold text-sm mb-3">Database Table Record Metrics</Text>
        <View className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-6">
          {healthStats?.tableStatsList && healthStats.tableStatsList.length > 0 ? (
            healthStats.tableStatsList.map((stat, idx) => (
              <View
                key={stat.tableName}
                className={`flex-row justify-between items-center py-2.5 ${idx !== healthStats.tableStatsList.length - 1 ? 'border-b border-slate-700' : ''}`}
              >
                <View className="flex-row items-center space-x-2">
                  <View className="w-2 h-2 rounded-full bg-amber-400" />
                  <Text className="text-slate-200 text-xs font-semibold">{stat.tableName}</Text>
                </View>
                <View className="flex-row items-center space-x-3">
                  <Text className="text-slate-400 text-[11px]">{stat.columnCount} cols</Text>
                  <View className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700">
                    <Text className="text-emerald-400 text-xs font-bold">{stat.rowCount} rows</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-slate-400 text-xs text-center py-4">Tap "Initialize Schema" to display table metrics.</Text>
          )}
        </View>

        {/* Performance Index Verification Cards */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-slate-200 font-bold text-sm">Performance Index Verification</Text>
          <TouchableOpacity onPress={() => verifyIndexes()}>
            <Text className="text-amber-400 text-xs font-bold">Verify Indexes</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-3 mb-6">
          {indexVerificationList && indexVerificationList.length > 0 ? (
            indexVerificationList.map((idx) => (
              <View key={idx.indexName} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-row justify-between items-center">
                <View>
                  <Text className="text-amber-300 font-bold text-xs">{idx.indexName}</Text>
                  <Text className="text-slate-400 text-[11px] mt-0.5">
                    Table: {idx.tableName} ({idx.columns.join(', ')})
                  </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-md ${idx.isVerified ? 'bg-emerald-900/80 border border-emerald-500' : 'bg-rose-900/80 border border-rose-500'}`}>
                  <Text className={`text-[10px] font-black ${idx.isVerified ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {idx.isVerified ? 'VERIFIED ACTIVE' : 'UNVERIFIED'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <Text className="text-slate-400 text-xs text-center">Indexes active for users, bedspaces, maintenance, and visitor codes.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
