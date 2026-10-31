/**
 * UNILAG Hostel Management Mobile Application ("UnilagStay")
 * Database Schema & System Infrastructure Dashboard
 *
 * Target Role: SYSTEM / ADMIN
 * Non-Technical Description: High-visibility dashboard displaying database table counts,
 * index listings, foreign key checks, and a single-tap button to run or verify schema setup.
 * All comments are written in plain, simple English for non-technical administrators.
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useDatabaseStore } from '../store/useDatabaseStore';

export const DatabaseSchemaScreen: React.FC = () => {
  const {
    isLoading,
    message,
    tables,
    indexes,
    healthStatus,
    initializeSchema,
    fetchTables,
    fetchIndexes,
    checkHealth,
    clearMessage,
  } = useDatabaseStore();

  useEffect(() => {
    // Fetch initial database status on screen load
    fetchTables();
    fetchIndexes();
    checkHealth();
  }, []);

  return (
    <ScrollView className="flex-1 bg-slate-900 p-4">
      {/* Header Banner */}
      <View className="bg-slate-800 p-6 rounded-3xl mb-6 border border-slate-700 shadow-xl">
        <Text className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">
          System Administration & Infrastructure
        </Text>
        <Text className="text-white text-2xl font-black mb-2">
          Database Schema & Indexes
        </Text>
        <Text className="text-slate-300 text-sm leading-relaxed">
          Manage Turso libSQL SQLite database structure, indexes, and relationship safeguards for UnilagStay.
        </Text>
      </View>

      {/* Database Connection & Health Card */}
      <View className="bg-slate-800 p-5 rounded-2xl mb-6 border border-slate-700">
        <Text className="text-white text-lg font-bold mb-4">Database Health Metrics</Text>
        <View className="flex-row justify-between items-center py-2 border-b border-slate-700">
          <Text className="text-slate-400 font-medium">Turso Connection</Text>
          <View className="flex-row items-center">
            <View className={`w-3 h-3 rounded-full mr-2 ${healthStatus?.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <Text className={`font-bold ${healthStatus?.isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {healthStatus?.isConnected ? 'Connected (Active)' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center py-2 border-b border-slate-700">
          <Text className="text-slate-400 font-medium">Foreign Key Safeguards</Text>
          <Text className={`font-bold ${healthStatus?.foreignKeysEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
            {healthStatus?.foreignKeysEnabled ? 'ENFORCED (PRAGMA ON)' : 'Disabled'}
          </Text>
        </View>

        <View className="flex-row justify-between items-center py-2 border-b border-slate-700">
          <Text className="text-slate-400 font-medium">Total Database Tables</Text>
          <Text className="text-white font-bold text-base">{healthStatus?.tableCount ?? tables.length}</Text>
        </View>

        <View className="flex-row justify-between items-center py-2 border-b border-slate-700">
          <Text className="text-slate-400 font-medium">Total Search Indexes</Text>
          <Text className="text-white font-bold text-base">{healthStatus?.indexCount ?? indexes.length}</Text>
        </View>

        <View className="flex-row justify-between items-center py-2">
          <Text className="text-slate-400 font-medium">Hostel Directory Seed Data</Text>
          <Text className={`font-bold ${healthStatus?.isSeeded ? 'text-emerald-400' : 'text-amber-400'}`}>
            {healthStatus?.isSeeded ? 'Loaded' : 'Pending / Not Seeded'}
          </Text>
        </View>
      </View>

      {/* Action Button: Execute DDL Initialization */}
      <TouchableOpacity
        onPress={() => initializeSchema()}
        disabled={isLoading}
        className={`py-4 px-6 rounded-2xl items-center justify-center mb-6 shadow-lg active:opacity-90 ${
          isLoading ? 'bg-slate-700' : 'bg-emerald-600'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold text-lg">
            Initialize / Verify Database Schema
          </Text>
        )}
      </TouchableOpacity>

      {/* System Status Message Banner */}
      {message && (
        <View className="bg-slate-800 border-l-4 border-emerald-500 p-4 rounded-xl mb-6 flex-row justify-between items-center">
          <Text className="text-slate-200 flex-1 text-sm font-medium mr-2">{message}</Text>
          <TouchableOpacity onPress={clearMessage} className="bg-slate-700 px-3 py-1 rounded-lg">
            <Text className="text-slate-300 text-xs font-bold">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List of Created Tables */}
      <View className="mb-6">
        <Text className="text-white text-xl font-bold mb-3">Database Tables ({tables.length})</Text>
        {tables.length === 0 ? (
          <Text className="text-slate-500 italic">No tables created yet. Tap the button above to run setup.</Text>
        ) : (
          tables.map((t) => (
            <View key={t.name} className="bg-slate-800 p-4 rounded-2xl mb-3 border border-slate-700">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-amber-400 font-bold text-base">{t.name}</Text>
                <View className="bg-slate-700 px-3 py-1 rounded-full">
                  <Text className="text-slate-300 text-xs font-semibold">{t.columnCount} columns</Text>
                </View>
              </View>
              <Text className="text-slate-400 text-xs font-mono bg-slate-950 p-2 rounded-lg mt-2 overflow-hidden" numberOfLines={2}>
                {t.sql}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* List of Search Indexes */}
      <View className="mb-12">
        <Text className="text-white text-xl font-bold mb-3">Database Indexes ({indexes.length})</Text>
        {indexes.length === 0 ? (
          <Text className="text-slate-500 italic">No custom indexes created yet.</Text>
        ) : (
          indexes.map((idx) => (
            <View key={idx.name} className="bg-slate-800 p-4 rounded-2xl mb-3 border border-slate-700">
              <Text className="text-emerald-400 font-bold text-base mb-1">{idx.name}</Text>
              <Text className="text-slate-300 text-xs mb-2">Target Table: <Text className="font-bold">{idx.tableName}</Text></Text>
              <Text className="text-slate-400 text-xs font-mono bg-slate-950 p-2 rounded-lg overflow-hidden" numberOfLines={2}>
                {idx.sql}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
