import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  RefreshControl,
  Share
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useGatePassStore } from '../store/useGatePassStore';
import { VisitorPass } from '../types/gatepass';

/**
 * VisitorPassScreen Component ([VISITOR-03] / UAT-0048).
 * Renders the Visitor Management interface for UNILAG Students.
 *
 * Allows students to:
 * 1. Register expected guests by entering visitor full name and phone number.
 * 2. Generate a secure 6-digit access PIN stored in Turso libSQL SQLite database.
 * 3. View real-time log of all generated visitor passes with status indicators:
 *    - EXPECTED (Yellow): Guest has a valid PIN, awaiting arrival at the gatehouse.
 *    - CHECKED_IN (Green): Guest is currently inside the hostel premises.
 *    - CHECKED_OUT (Gray): Guest has departed and signed out with the gate porter.
 *    - EXPIRED (Red): Pass expired before use.
 * 4. Easily share visitor PINs via SMS, WhatsApp, or messaging apps.
 *
 * Detailed comments added in plain, non-technical English for hostel wardens, porters, and developers.
 */
export const VisitorPassScreen: React.FC = () => {
  // Retrieve authenticated student session from global auth store
  const { session } = useAuthStore();

  // Retrieve visitor management state and actions from global gate pass store
  const {
    visitorPasses,
    isLoading,
    errorMessage,
    createVisitorPass,
    loadVisitorPasses
  } = useGatePassStore();

  const userId = session?.user?.id || 'demo_student_id';
  const studentName = session?.user?.fullName || 'UNILAG Resident';
  const matricNo = session?.user?.matricOrStaffNo || '2000000000';

  // Form input states for new visitor pass creation
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);

  // Holds the newly created visitor pass so the student can view and share the 6-digit PIN
  const [newlyCreatedPass, setNewlyCreatedPass] = useState<VisitorPass | null>(null);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Fetch visitor pass log on initial screen load
  useEffect(() => {
    if (loadVisitorPasses) {
      loadVisitorPasses(userId);
    }
  }, [userId]);

  // Refreshes the visitor pass list from Turso database
  const handleRefresh = async () => {
    setRefreshing(true);
    if (loadVisitorPasses) {
      await loadVisitorPasses(userId);
    }
    setRefreshing(false);
  };

  // Validates inputs and handles submission to create a 6-digit visitor pass PIN
  const handleCreatePass = async () => {
    setFormError(null);

    // Form input validation: Ensure full name is provided
    if (!visitorName.trim()) {
      setFormError('Please enter the full name of your visitor.');
      return;
    }

    // Form input validation: Ensure valid phone number
    const cleanPhone = visitorPhone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('Please enter a valid 11-digit phone number for your visitor.');
      return;
    }

    if (!createVisitorPass) return;

    try {
      const createdPass = await createVisitorPass(userId, visitorName.trim(), cleanPhone, visitDate);
      setNewlyCreatedPass(createdPass);
      setVisitorName('');
      setVisitorPhone('');
    } catch (err: any) {
      setFormError(err.message || 'Unable to create visitor pass. Please try again.');
    }
  };

  // Helper method to share visitor PIN via mobile device native sharing sheet
  const handleSharePin = async (pass: VisitorPass) => {
    try {
      await Share.share({
        message: `Hello ${pass.visitorName}, your UNILAG Hostel Visitor Access PIN is ${pass.passCode}. Present this PIN to the gate porter upon arrival at ${pass.hostelName || 'the hostel gatehouse'}.`
      });
    } catch {}
  };

  // Helper method to render clear color-coded status badges for visitor pass states
  const renderStatusBadge = (status: VisitorPass['status']) => {
    switch (status) {
      case 'EXPECTED':
        return (
          <View className="bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
            <Text className="text-amber-800 text-xs font-bold">EXPECTED (Valid PIN)</Text>
          </View>
        );
      case 'CHECKED_IN':
        return (
          <View className="bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
            <Text className="text-emerald-800 text-xs font-bold">● CHECKED IN (On-Site)</Text>
          </View>
        );
      case 'CHECKED_OUT':
        return (
          <View className="bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-full">
            <Text className="text-slate-700 text-xs font-bold">CHECKED OUT (Departed)</Text>
          </View>
        );
      case 'EXPIRED':
        return (
          <View className="bg-red-100 border border-red-300 px-2.5 py-1 rounded-full">
            <Text className="text-red-800 text-xs font-bold">EXPIRED</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-slate-100"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#7A0000']} />
      }
    >
      {/* Header Banner - UNILAG Maroon Theme */}
      <View className="bg-[#7A0000] px-6 pt-8 pb-6 border-b-4 border-[#D4AF37]">
        <Text className="text-[#D4AF37] font-bold text-xs uppercase tracking-widest mb-1">
          UNILAG Hostel Management System
        </Text>
        <Text className="text-white text-2xl font-black">
          Visitor Pass Generator
        </Text>
        <Text className="text-slate-200 text-xs mt-1">
          Issue 6-digit gatehouse entry PINs for your expected guests.
        </Text>
      </View>

      <View className="p-5">
        {/* Success Card displaying newly generated 6-Digit PIN */}
        {newlyCreatedPass && (
          <View className="bg-emerald-900 border-2 border-emerald-500 rounded-3xl p-6 mb-6 shadow-lg items-center">
            <View className="bg-emerald-800 px-3 py-1 rounded-full mb-2">
              <Text className="text-emerald-200 font-bold text-xs">
                Pass Generated Successfully!
              </Text>
            </View>
            <Text className="text-white text-sm font-semibold mb-1 text-center">
              6-Digit Gate Entry PIN for {newlyCreatedPass.visitorName}:
            </Text>

            {/* Massive, High-Contrast 6-Digit PIN Box */}
            <View className="bg-white px-8 py-3 rounded-2xl my-3 border-2 border-emerald-400 shadow-md">
              <Text className="text-slate-950 text-4xl font-black font-mono tracking-widest">
                {newlyCreatedPass.passCode}
              </Text>
            </View>

            <Text className="text-emerald-200 text-xs text-center mb-4 px-2">
              Give this PIN to {newlyCreatedPass.visitorName}. The gate porter will type this code to grant entry.
            </Text>

            <View className="flex-row space-x-3 w-full">
              <TouchableOpacity
                onPress={() => handleSharePin(newlyCreatedPass)}
                className="bg-amber-500 flex-1 py-3 rounded-xl items-center shadow active:opacity-90 mr-2"
              >
                <Text className="text-slate-950 font-bold text-xs">
                  📤 Share PIN with Guest
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setNewlyCreatedPass(null)}
                className="bg-emerald-800 border border-emerald-600 px-4 py-3 rounded-xl items-center active:opacity-90"
              >
                <Text className="text-white font-bold text-xs">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Visitor Pass Creation Form Card */}
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
          <Text className="text-slate-900 text-lg font-bold mb-1">
            Create Guest Pass
          </Text>
          <Text className="text-slate-500 text-xs mb-4">
            Enter guest details below. A 6-digit access PIN will be created immediately.
          </Text>

          {/* Error Banner */}
          {(formError || errorMessage) && (
            <View className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
              <Text className="text-red-700 text-xs font-medium">
                {formError || errorMessage}
              </Text>
            </View>
          )}

          {/* Visitor Name Field */}
          <Text className="text-slate-700 text-xs font-bold mb-1">
            Guest Full Name *
          </Text>
          <TextInput
            placeholder="e.g. Oluwaseun Adeyemi"
            placeholderTextColor="#94A3B8"
            value={visitorName}
            onChangeText={setVisitorName}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4"
          />

          {/* Visitor Phone Number Field */}
          <Text className="text-slate-700 text-xs font-bold mb-1">
            Guest Phone Number *
          </Text>
          <TextInput
            placeholder="e.g. 08023456789"
            placeholderTextColor="#94A3B8"
            value={visitorPhone}
            onChangeText={setVisitorPhone}
            keyboardType="phone-pad"
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4"
          />

          {/* Expected Visit Date Field */}
          <Text className="text-slate-700 text-xs font-bold mb-1">
            Visit Date (YYYY-MM-DD)
          </Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            value={visitDate}
            onChangeText={setVisitDate}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-5"
          />

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleCreatePass}
            disabled={isLoading}
            className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md active:opacity-90"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-sm">
                Generate 6-Digit Visitor PIN
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Real-Time Visitor Pass Log Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-900 text-lg font-bold">
              My Visitor Log ({visitorPasses?.length || 0})
            </Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text className="text-[#7A0000] font-bold text-xs">
                ↻ Refresh Log
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading && (!visitorPasses || visitorPasses.length === 0) ? (
            <View className="bg-white p-8 rounded-2xl items-center border border-slate-200">
              <ActivityIndicator size="small" color="#7A0000" />
              <Text className="text-slate-500 text-xs mt-2">Loading visitor records...</Text>
            </View>
          ) : !visitorPasses || visitorPasses.length === 0 ? (
            <View className="bg-white p-8 rounded-2xl items-center border border-slate-200">
              <Text className="text-slate-400 text-4xl mb-2">🧑‍🤝‍🧑</Text>
              <Text className="text-slate-700 font-bold text-sm">No Visitor Passes Issued Yet</Text>
              <Text className="text-slate-500 text-xs text-center mt-1">
                Fill the form above to generate a 6-digit access PIN for your first guest.
              </Text>
            </View>
          ) : (
            visitorPasses.map((pass) => (
              <View
                key={pass.id}
                className="bg-white rounded-2xl p-4 mb-3 border border-slate-200 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-slate-900 font-bold text-base">
                      {pass.visitorName}
                    </Text>
                    <Text className="text-slate-500 text-xs">
                      Phone: {pass.visitorPhone}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  {renderStatusBadge(pass.status)}
                </View>

                <View className="bg-slate-50 p-3 rounded-xl my-2 border border-slate-100 flex-row justify-between items-center">
                  <View>
                    <Text className="text-slate-400 text-[10px] uppercase font-bold">
                      6-Digit Access PIN
                    </Text>
                    <Text className="text-slate-900 text-xl font-black font-mono tracking-widest">
                      {pass.passCode}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleSharePin(pass)}
                    className="bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg"
                  >
                    <Text className="text-amber-800 text-xs font-bold">
                      Share
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Date & Timestamps */}
                <View className="flex-row justify-between items-center mt-1 pt-2 border-t border-slate-100">
                  <Text className="text-slate-500 text-xs">
                    Scheduled: {pass.visitDate}
                  </Text>

                  {pass.checkInTime ? (
                    <Text className="text-emerald-700 text-xs font-semibold">
                      In: {new Date(pass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {pass.checkOutTime ? ` | Out: ${new Date(pass.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </Text>
                  ) : (
                    <Text className="text-slate-400 text-xs">
                      Awaiting gate check-in
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default VisitorPassScreen;
