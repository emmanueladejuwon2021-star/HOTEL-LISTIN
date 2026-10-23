import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { AuthService } from '../api/authService';
import { useAuthStore } from '../store/useAuthStore';
import { validateMatricOrStaffNo, validatePassword } from '../utils/validation';

export const LoginScreen: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setLoading, isLoading, setSession } = useAuthStore();

  const handleLogin = async () => {
    setErrorMessage(null);

    const idCheck = validateMatricOrStaffNo(identifier);
    if (!idCheck.isValid) {
      setErrorMessage(idCheck.error || 'Invalid Matriculation or Staff Number.');
      return;
    }

    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      setErrorMessage(passCheck.error || 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const session = await AuthService.login({ identifier, password });
      setSession(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center px-6 py-8">
      <View className="items-center mb-8">
        <View className="w-24 h-24 bg-[#7A0000] rounded-full justify-center items-center mb-4 shadow-lg">
          <Text className="text-white text-3xl font-bold">UNILAG</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900 tracking-tight">UnilagStay</Text>
        <Text className="text-sm text-slate-500 mt-1">Hostel Management Portal</Text>
      </View>

      {errorMessage && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <Text className="text-red-700 text-sm font-medium">{errorMessage}</Text>
        </View>
      )}

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
