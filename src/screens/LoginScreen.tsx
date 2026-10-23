import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { AuthService } from '../api/authService';
import { useAuthStore } from '../store/useAuthStore';
import { validateMatricOrStaffNo, validatePassword } from '../utils/validation';

/**
 * LoginScreen component rendered when no active user session exists.
 * Allows UNILAG students and staff to sign in with their Matriculation or Staff Number and Password.
 * Provides clear error messaging, input validation, and loading indicators.
 */
export const LoginScreen: React.FC = () => {
  // Local state holding the typed user identifier (Matric Number or Staff ID)
  const [identifier, setIdentifier] = useState('');
  // Local state holding the typed password
  const [password, setPassword] = useState('');
  // Local state holding any validation or authentication error message to display
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Access global authentication store state and actions
  const { setLoading, isLoading, setSession, session, isAuthenticated, logoutUser } = useAuthStore();

  /**
   * Triggers login when the user taps the 'Sign In' button.
   * Steps:
   * 1. Clear previous error message.
   * 2. Validate format of Matriculation or Staff ID.
   * 3. Validate password length requirements.
   * 4. Call AuthService.login to verify credentials against Turso DB.
   * 5. Store session in global Zustand store upon success.
   */
  const handleLogin = async () => {
    setErrorMessage(null);

    // Validate identity format (9-digit undergraduate matric, UTME ID, or STAFF/ID)
    const idCheck = validateMatricOrStaffNo(identifier);
    if (!idCheck.isValid) {
      setErrorMessage(idCheck.error || 'Invalid Matriculation or Staff Number.');
      return;
    }

    // Validate password format (minimum 6 characters)
    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      setErrorMessage(passCheck.error || 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      // Perform live database authentication
      const userSession = await AuthService.login({ identifier, password });
      // Update global store session
      setSession(userSession);
    } catch (err: any) {
      // Display user-friendly error message if login fails
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Triggers user sign out when an authenticated user taps 'Sign Out'.
   */
  const handleLogout = async () => {
    await logoutUser();
    setIdentifier('');
    setPassword('');
    setErrorMessage(null);
  };

  // If user is already authenticated, display welcome dashboard banner with option to sign out
  if (isAuthenticated && session) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center px-6 py-8">
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-[#7A0000] rounded-full justify-center items-center mb-4 shadow-lg">
            <Text className="text-white text-3xl font-bold">UNILAG</Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {session.user.fullName}!</Text>
          <Text className="text-sm text-slate-500 mt-1">{session.user.matricOrStaffNo} ({session.user.role})</Text>
        </View>

        {session.studentProfile && (
          <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
            <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">Student Information</Text>
            <Text className="text-slate-800 text-sm mb-1"><Text className="font-bold">Faculty:</Text> {session.studentProfile.faculty}</Text>
            <Text className="text-slate-800 text-sm mb-1"><Text className="font-bold">Department:</Text> {session.studentProfile.department}</Text>
            <Text className="text-slate-800 text-sm mb-1"><Text className="font-bold">Level:</Text> {session.studentProfile.level}L</Text>
            <Text className="text-slate-800 text-sm"><Text className="font-bold">Campus:</Text> {session.studentProfile.campus}</Text>
          </View>
        )}

        <TouchableOpacity
          className="bg-red-700 h-14 rounded-xl justify-center items-center shadow-md active:opacity-90"
          onPress={handleLogout}
        >
          <Text className="text-white text-lg font-bold">Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center px-6 py-8">
      {/* UNILAG Header Logo & Branding */}
      <View className="items-center mb-8">
        <View className="w-24 h-24 bg-[#7A0000] rounded-full justify-center items-center mb-4 shadow-lg">
          <Text className="text-white text-3xl font-bold">UNILAG</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900 tracking-tight">UnilagStay</Text>
        <Text className="text-sm text-slate-500 mt-1">Hostel Management Portal</Text>
      </View>

      {/* Error Message Box */}
      {errorMessage && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <Text className="text-red-700 text-sm font-medium">{errorMessage}</Text>
        </View>
      )}

      {/* Credentials Input Fields */}
      <View className="space-y-4 mb-6">
        <View>
          <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Matriculation / Staff Number</Text>
          <TextInput
            className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-slate-900 text-base shadow-sm"
            placeholder="e.g. 190407088 or STAFF/1042"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <View>
          <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Password</Text>
          <TextInput
            className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-slate-900 text-base shadow-sm"
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
      </View>

      {/* Login Action Button */}
      <TouchableOpacity
        className="bg-[#7A0000] h-14 rounded-xl justify-center items-center shadow-md active:opacity-90"
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white text-lg font-bold">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="mt-8 items-center">
        <Text className="text-xs text-slate-400">University of Lagos Student Affairs Division</Text>
      </View>
    </SafeAreaView>
  );
};
