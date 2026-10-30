import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { DatabaseService } from '../api/databaseService';
import { DatabaseStats, SchemaIntegrityResult } from '../types/database';

/**
 * DatabaseSchemaScreen Component.
 * Interactive System Administrator interface for managing Turso libSQL SQLite Database Schema DDL,
 * indexing optimization, UNILAG & CMUL hostel directory seeding, foreign key integrity checks,
 * and database metrics monitoring.
 *
 * Designed with NativeWind / Tailwind CSS in compliance with PRD Section 6 & 9.
 */
export const DatabaseSchemaScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [integrity, setIntegrity] = useState<SchemaIntegrityResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Database Ready');

  // Load database statistics and verify integrity on component mount
  useEffect(() => {
    loadDatabaseOverview();
  }, []);

  const loadDatabaseOverview = async () => {
    setLoading(true);
    try {
      await DatabaseService.initializeFullSchema();
      const currentStats = await DatabaseService.getDatabaseStats();
      const currentIntegrity = await DatabaseService.verifySchemaIntegrity();
      setStats(currentStats);
      setIntegrity(currentIntegrity);
      setStatusMessage('Turso Database Connection Active & Verified');
    } catch (err: any) {
      setStatusMessage(`Error loading schema: ${err.message || 'Unknown database error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDDL = async () => {
    setActionInProgress(true);
    try {
      await DatabaseService.initializeFullSchema();
      await loadDatabaseOverview();
      setStatusMessage('Successfully initialized 16 DDL tables and indexes in Turso DB');
    } catch (err: any) {
      Alert.alert('Initialization Error', err.message || 'Failed to create database schema.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSeedDatabase = async () => {
    setActionInProgress(true);
    try {
      const result = await DatabaseService.seedDatabase();
      await loadDatabaseOverview();
      setStatusMessage(
        `Seeded ${result.hostelsCreated} hostels and ${result.bedspacesCreated} bedspaces successfully!`
      );
    } catch (err: any) {
      Alert.alert('Seeding Error', err.message || 'Failed to seed hostel data.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setActionInProgress(true);
    try {
      const result = await DatabaseService.verifySchemaIntegrity();
      setIntegrity(result);
      if (result.isValid) {
        setStatusMessage('Schema Integrity Verified: 100% compliant with 0 FK violations');
      } else {
        setStatusMessage(`Schema Integrity Warning: Missing ${result.missingTables.length} tables`);
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Failed to check schema integrity.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResetDatabase = async () => {
    Alert.alert(
      'Reset Database Warning',
      'Are you sure you want to clear all records from all database tables? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Tables',
          style: 'destructive',
          onPress: async () => {
            setActionInProgress(true);
            try {
              await DatabaseService.resetDatabase();
              await loadDatabaseOverview();
              setStatusMessage('All database tables reset successfully.');
            } catch (err: any) {
              Alert.alert('Reset Error', err.message || 'Failed to reset database.');
            } finally {
              setActionInProgress(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center p-6">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="text-white text-base font-semibold mt-4">
          Inspecting Turso libSQL Database Schema...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Header Title Card */}
        <View className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xl font-bold text-white tracking-wide">
              TURSO LIBSQL DATABASE MANAGER
            </Text>
            <View className="bg-[#D4AF37] px-2.5 py-1 rounded-full">
              <Text className="text-slate-900 text-xs font-black">SYSTEM ADMIN</Text>
            </View>
          </View>
          <Text className="text-slate-400 text-xs">
            Schema DDL, Optimization Indexes, Foreign Key Constraints & Seed Engine
          </Text>
        </View>

        {/* Status Alert Banner */}
        <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-5">
          <Text className="text-emerald-900 font-bold text-sm">System Status</Text>
          <Text className="text-emerald-700 text-xs mt-0.5">{statusMessage}</Text>
        </View>

        {/* Metrics Grid Overview */}
        {stats && (
          <View className="flex-row flex-wrap justify-between mb-5">
            <View className="w-[48%] bg-white p-4 rounded-xl border border-slate-200 mb-3 shadow-sm">
              <Text className="text-xs font-bold text-slate-400 uppercase">Total Tables</Text>
              <Text className="text-2xl font-black text-slate-900 mt-1">{stats.totalTables}</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">PRD Schema Compliant</Text>
            </View>

            <View className="w-[48%] bg-white p-4 rounded-xl border border-slate-200 mb-3 shadow-sm">
              <Text className="text-xs font-bold text-slate-400 uppercase">Total Rows</Text>
              <Text className="text-2xl font-black text-[#7A0000] mt-1">{stats.totalRows}</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">Records stored in Turso</Text>
            </View>

            <View className="w-[48%] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <Text className="text-xs font-bold text-slate-400 uppercase">DB Indexes</Text>
              <Text className="text-2xl font-black text-amber-600 mt-1">{stats.totalIndexes}</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">Optimization Indexes</Text>
            </View>

            <View className="w-[48%] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <Text className="text-xs font-bold text-slate-400 uppercase">Seed Status</Text>
              <Text className={`text-xl font-black mt-1 ${stats.isSeeded ? 'text-emerald-600' : 'text-slate-400'}`}>
                {stats.isSeeded ? 'SEEDED' : 'EMPTY'}
              </Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">Hostels & Accounts</Text>
            </View>
          </View>
        )}

        {/* Database Management Action Buttons */}
        <View className="space-y-3 mb-6">
          <TouchableOpacity
            className="bg-[#7A0000] py-3.5 px-4 rounded-xl flex-row items-center justify-center shadow-sm"
            onPress={handleInitializeDDL}
            disabled={actionInProgress}
          >
            {actionInProgress ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white font-bold text-sm">
                Initialize Full Schema DDL & Indexes
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-slate-900 py-3.5 px-4 rounded-xl flex-row items-center justify-center shadow-sm"
            onPress={handleSeedDatabase}
            disabled={actionInProgress}
          >
            <Text className="text-[#D4AF37] font-bold text-sm">
              Seed UNILAG & CMUL Hostels & Accounts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-emerald-800 py-3.5 px-4 rounded-xl flex-row items-center justify-center shadow-sm"
            onPress={handleVerifyIntegrity}
            disabled={actionInProgress}
          >
            <Text className="text-white font-bold text-sm">
              Verify Schema & Foreign Key Integrity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-rose-100 border border-rose-300 py-3.5 px-4 rounded-xl flex-row items-center justify-center"
            onPress={handleResetDatabase}
            disabled={actionInProgress}
          >
            <Text className="text-rose-700 font-bold text-sm">
              Clear / Truncate Database Tables
            </Text>
          </TouchableOpacity>
        </View>

        {/* Schema Integrity Verification Details Card */}
        {integrity && (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
            <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
              Schema Integrity Assessment
            </Text>
            <View className="flex-row items-center mb-2">
              <View className={`w-3 h-3 rounded-full mr-2 ${integrity.isValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <Text className="text-xs font-semibold text-slate-700">
                {integrity.isValid ? 'Schema Valid & Healthy' : 'Schema Requires Attention'}
              </Text>
            </View>
            {integrity.details.map((detail, index) => (
              <Text key={index} className="text-xs text-slate-600 mt-1 pl-5">
                • {detail}
              </Text>
            ))}
          </View>
        )}

        {/* Database Tables Breakdown List */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
          <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Turso Database Table Directory
          </Text>

          {stats?.tables.map((tbl) => (
            <View
              key={tbl.tableName}
              className="flex-row items-center justify-between py-2.5 border-b border-slate-100 last:border-b-0"
            >
              <View className="flex-1 pr-3">
                <Text className="text-xs font-bold text-slate-900 font-mono">
                  {tbl.tableName}
                </Text>
                <Text className="text-[10px] text-slate-500">{tbl.description}</Text>
              </View>

              <View className="bg-slate-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-slate-700">{tbl.rowCount} rows</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
