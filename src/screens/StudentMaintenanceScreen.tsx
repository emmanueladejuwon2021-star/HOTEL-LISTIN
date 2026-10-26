import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { MaintenanceCategory, CATEGORY_METADATA } from '../types/maintenance';
import {
  createMaintenanceTicket,
  getStudentTickets,
  cancelMaintenanceTicket,
} from '../api/maintenanceService';

/**
 * StudentMaintenanceScreen Component for UNILAG Hostel Students.
 * Implements [MAINTENANCE-03 / UAT-0053].
 *
 * Allows non-technical UNILAG students to:
 * 1. Select a repair category (Plumbing, Electrical, Carpentry, Masonry, Appliance, Structural)
 * 2. Attach a photo showing the damaged facility or defect
 * 3. Type a clear description of the problem
 * 4. View estimated response time (SLA) before submitting
 * 5. Submit the ticket to Turso DB and track repair progress status
 */
export const StudentMaintenanceScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    tickets,
    activeCategory,
    description,
    photoUrl,
    hostelId,
    roomNumber,
    isLoading,
    errorMessage,
    successMessage,
    setCategory,
    setDescription,
    setPhotoUrl,
    setHostelId,
    setRoomNumber,
    setTickets,
    setIsLoading,
    setErrorMessage,
    setSuccessMessage,
    resetForm,
  } = useMaintenanceStore();

  const studentId = session?.user?.id || 'std-1001';

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await getStudentTickets(studentId);
      setTickets(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load maintenance tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [studentId]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErrorMessage('Please describe the problem in your room or facility.');
      return;
    }

    if (!photoUrl.trim()) {
      setErrorMessage('Please attach a photo URL showing the broken item.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await createMaintenanceTicket({
        studentId,
        hostelId,
        roomNumber,
        category: activeCategory,
        description: description.trim(),
        photoBeforeUrl: photoUrl.trim(),
      });

      setSuccessMessage('Your repair request has been submitted successfully!');
      resetForm();
      await loadTickets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting repair request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTicket = (ticketId: string) => {
    Alert.alert(
      'Cancel Repair Request',
      'Are you sure you want to cancel this maintenance ticket?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const ok = await cancelMaintenanceTicket(ticketId, studentId);
              if (ok) {
                setSuccessMessage('Ticket cancelled.');
                await loadTickets();
              } else {
                setErrorMessage('Unable to cancel ticket.');
              }
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to cancel ticket.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const activeCategoryMeta = CATEGORY_METADATA[activeCategory];

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Header Banner */}
      <View className="bg-[#7A0000] p-5 rounded-2xl mb-4 shadow-sm">
        <Text className="text-white text-xl font-bold mb-1">Hostel Repair & Maintenance</Text>
        <Text className="text-slate-200 text-xs">
          Report broken items in your hostel room for quick repair by university artisans.
        </Text>
      </View>

      {/* Messages */}
      {errorMessage ? (
        <View className="bg-red-100 border border-red-300 p-3 rounded-xl mb-4">
          <Text className="text-red-800 text-xs font-semibold">{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View className="bg-emerald-100 border border-emerald-300 p-3 rounded-xl mb-4">
          <Text className="text-emerald-800 text-xs font-semibold">{successMessage}</Text>
        </View>
      ) : null}

      {/* Form Container */}
      <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <Text className="text-slate-900 font-bold text-base mb-3">1. Select Problem Category</Text>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row space-x-2">
            {(Object.keys(CATEGORY_METADATA) as MaintenanceCategory[]).map((catKey) => {
              const meta = CATEGORY_METADATA[catKey];
              const isSelected = activeCategory === catKey;
              return (
                <TouchableOpacity
                  key={catKey}
                  onPress={() => setCategory(catKey)}
                  className={`px-4 py-2.5 rounded-xl border ${
                    isSelected ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Selected Category Info Banner */}
        <View className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 flex-row justify-between items-center">
          <View className="flex-1 mr-2">
            <Text className="text-amber-900 font-bold text-xs">{activeCategoryMeta.label}</Text>
            <Text className="text-amber-700 text-[11px]">{activeCategoryMeta.description}</Text>
          </View>
          <View className="bg-amber-200 px-2.5 py-1 rounded-lg">
            <Text className="text-amber-900 text-[10px] font-bold">
              SLA: {activeCategoryMeta.targetSla}
            </Text>
          </View>
        </View>

        {/* Room & Hostel Details */}
        <Text className="text-slate-900 font-bold text-base mb-2">2. Hostel & Room Details</Text>
        <View className="flex-row space-x-2 mb-4">
          <View className="flex-1">
            <Text className="text-slate-600 text-[11px] font-medium mb-1">Hostel Name</Text>
            <TextInput
              value={hostelId}
              onChangeText={setHostelId}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs"
              placeholder="e.g. King Jaja Hall"
            />
          </View>
          <View className="flex-1">
            <Text className="text-slate-600 text-[11px] font-medium mb-1">Room Number</Text>
            <TextInput
              value={roomNumber}
              onChangeText={setRoomNumber}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs"
              placeholder="e.g. Room A-204"
            />
          </View>
        </View>

        {/* Issue Description */}
        <Text className="text-slate-900 font-bold text-base mb-2">3. Describe the Problem</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholder="Type details about the issue (e.g., Leaking water pipe under the wash basin)..."
          className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-xs mb-4 text-start"
        />

        {/* Photo URL Attachment */}
        <Text className="text-slate-900 font-bold text-base mb-2">4. Attach Photo Proof URL</Text>
        <TextInput
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder="https://example.com/photo-proof.jpg"
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs mb-3"
        />

        {/* Photo Preview if Provided */}
        {photoUrl.trim() ? (
          <View className="mb-4 items-center">
            <Text className="text-slate-500 text-[10px] mb-1">Photo Attachment Preview:</Text>
            <Image
              source={{ uri: photoUrl.trim() }}
              className="w-full h-36 rounded-xl border border-slate-300"
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Quick Sample Photo Helper Buttons */}
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            onPress={() => setPhotoUrl('https://images.unsplash.com/photo-1584622650111-993a426fbf0a')}
            className="bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
          >
            <Text className="text-slate-700 text-[10px] font-medium">📷 Plumbing Sample</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPhotoUrl('https://images.unsplash.com/photo-1621905251189-08b45d6a269e')}
            className="bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
          >
            <Text className="text-slate-700 text-[10px] font-medium">⚡ Electrical Sample</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPhotoUrl('https://images.unsplash.com/photo-1513694203232-719a280e022f')}
            className="bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
          >
            <Text className="text-slate-700 text-[10px] font-medium">🚪 Carpentry Sample</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className="bg-[#7A0000] py-3.5 rounded-xl items-center shadow-md active:opacity-90"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-white font-bold text-sm">Submit Repair Ticket</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Ticket History List Section */}
      <View className="mb-10">
        <Text className="text-slate-900 font-bold text-base mb-3">Your Submitted Repair Requests</Text>

        {tickets.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
            <Text className="text-slate-400 text-xs">No repair tickets submitted yet.</Text>
          </View>
        ) : (
          tickets.map((tkt) => (
            <View key={tkt.id} className="bg-white p-4 rounded-2xl border border-slate-200 mb-3 shadow-sm">
              <View className="flex-row justify-between items-center mb-2">
                <View className="bg-slate-100 px-2.5 py-1 rounded-md">
                  <Text className="text-slate-800 text-[10px] font-bold">{tkt.id}</Text>
                </View>
                <View
                  className={`px-2.5 py-1 rounded-full ${
                    tkt.status === 'RESOLVED'
                      ? 'bg-emerald-100'
                      : tkt.status === 'IN_PROGRESS'
                      ? 'bg-amber-100'
                      : tkt.status === 'CANCELLED'
                      ? 'bg-slate-100'
                      : 'bg-blue-100'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      tkt.status === 'RESOLVED'
                        ? 'text-emerald-800'
                        : tkt.status === 'IN_PROGRESS'
                        ? 'text-amber-800'
                        : tkt.status === 'CANCELLED'
                        ? 'text-slate-600'
                        : 'text-blue-800'
                    }`}
                  >
                    {tkt.status}
                  </Text>
                </View>
              </View>

              <Text className="text-slate-800 text-xs font-semibold mb-1">
                {tkt.category} ({tkt.hostelId} - {tkt.roomNumber})
              </Text>
              <Text className="text-slate-600 text-xs mb-3">{tkt.description}</Text>

              {/* Photo Proof */}
              {tkt.photoBeforeUrl ? (
                <Image
                  source={{ uri: tkt.photoBeforeUrl }}
                  className="w-full h-28 rounded-xl border border-slate-200 mb-3"
                  resizeMode="cover"
                />
              ) : null}

              <View className="flex-row justify-between items-center border-t border-slate-100 pt-2.5">
                <Text className="text-slate-400 text-[10px]">
                  Target SLA: {tkt.targetSla}
                </Text>

                {tkt.status === 'OPEN' ? (
                  <TouchableOpacity
                    onPress={() => handleCancelTicket(tkt.id)}
                    className="bg-red-50 px-2.5 py-1 rounded-md border border-red-200"
                  >
                    <Text className="text-red-700 text-[10px] font-bold">Cancel Ticket</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
