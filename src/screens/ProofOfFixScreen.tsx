import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaintenanceStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';

type Props = NativeStackScreenProps<MaintenanceStackParamList, 'ProofOfFixUpload'>;

// Standard sample base64 placeholder image representing fixed hostel fixture
const DEFAULT_PROOF_PHOTO_SAMPLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * ProofOfFixScreen Component.
 * Allows maintenance artisans to inspect ticket details, attach/camera upload
 * proof-of-fix images, provide completion notes, and transition ticket status to RESOLVED.
 */
export const ProofOfFixScreen: React.FC<Props> = ({ route, navigation }) => {
  const ticketId = route.params?.ticketId || '';
  const { session } = useAuthStore();
  const { selectedTicket, uploadProofOfFix, isLoading, error } = useMaintenanceStore();

  const [photoUrl, setPhotoUrl] = useState<string>(
    selectedTicket?.photoAfterUrl || DEFAULT_PROOF_PHOTO_SAMPLE
  );
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const artisanId = session?.user.id || 'ARTISAN-STAFF';

  const handleUploadProof = async () => {
    if (!ticketId) {
      Alert.alert('Error', 'Missing ticket identification code.');
      return;
    }

    if (!photoUrl) {
      Alert.alert('Photo Required', 'Please attach or select a proof-of-fix image.');
      return;
    }

    const success = await uploadProofOfFix({
      ticketId,
      artisanId,
      photoAfterUrl: photoUrl,
      resolutionNotes,
    });

    if (success) {
      Alert.alert(
        'Repair Completed',
        'Proof-of-fix photo verified and repair ticket successfully marked as RESOLVED.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Header Title */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-xl font-bold text-amber-800">PROOF-OF-FIX UPLOAD</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Upload completed repair photo evidence to finalize maintenance dispatch ticket.
          </Text>
          <Text className="text-slate-700 text-xs mt-2 font-semibold">
            Ticket ID: #{ticketId ? ticketId.slice(0, 8) : 'N/A'}
          </Text>
        </View>

        {/* Ticket Details Summary Card */}
        {selectedTicket && (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
            <Text className="text-sm font-bold text-slate-900 mb-1">
              {selectedTicket.hostelName || 'Hostel'} — {selectedTicket.roomNumber}
            </Text>
            <Text className="text-xs text-amber-800 font-bold mb-2">
              Category: {selectedTicket.category}
            </Text>
            <Text className="text-xs text-slate-600 mb-3">
              Description: {selectedTicket.description}
            </Text>

            {selectedTicket.photoBeforeUrl && (
              <View className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <Text className="text-[10px] text-slate-500 font-semibold mb-1">
                  Original Reported Defect Photo:
                </Text>
                <Image
                  source={{ uri: selectedTicket.photoBeforeUrl }}
                  className="w-full h-32 rounded-lg bg-slate-200"
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        )}

        {/* Proof of Fix Photo Upload Section */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-sm font-bold text-slate-900 mb-2">
            Completed Repair Photo Evidence *
          </Text>
          <Text className="text-xs text-slate-500 mb-4">
            Capture or select photo showing the fully fixed fixture or replaced hardware.
          </Text>

          {/* Photo Preview Container */}
          <View className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl p-4 items-center justify-center mb-4">
            <Image
              source={{ uri: photoUrl }}
              className="w-full h-48 rounded-xl bg-slate-200 mb-3"
              resizeMode="cover"
            />
            <Text className="text-xs text-emerald-800 font-bold">
              Proof Photo Preview Attached
            </Text>
          </View>

          {/* Simulate Camera Attach Action */}
          <TouchableOpacity
            onPress={() => {
              setPhotoUrl(
                `data:image/png;base64,FIXED_REPAIR_PHOTO_PROOF_${Date.now()}`
              );
              Alert.alert('Photo Captured', 'Proof-of-fix camera photo attached successfully.');
            }}
            className="bg-amber-100 border border-amber-300 py-3 rounded-xl items-center mb-2"
          >
            <Text className="text-amber-800 text-xs font-bold">
              📷 Capture / Re-take Fix Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Artisan Remarks */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-sm font-bold text-slate-900 mb-2">
            Artisan Completion Notes (Optional)
          </Text>
          <TextInput
            value={resolutionNotes}
            onChangeText={setResolutionNotes}
            placeholder="e.g., Replaced faulty washer and tested water flow. No leaks found."
            multiline
            numberOfLines={3}
            className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-normal"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {/* Error Feedback */}
        {error && (
          <View className="bg-rose-50 p-4 rounded-xl border border-rose-200 mb-4">
            <Text className="text-rose-800 text-xs font-semibold">{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={handleUploadProof}
          disabled={isLoading}
          className="bg-emerald-600 py-4 rounded-xl items-center shadow-md active:opacity-90 mb-3"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-white text-base font-bold">
              Submit Proof & Resolve Ticket
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-slate-200 py-3.5 rounded-xl items-center mb-8"
        >
          <Text className="text-slate-700 text-xs font-bold">Cancel & Return to Queue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
