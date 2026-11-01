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
  Modal,
} from 'react-native';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  MaintenanceCategory,
  CATEGORY_METADATA,
  StatusFilterOption,
  MaintenanceTicket,
} from '../types/maintenance';
import {
  createMaintenanceTicket,
  getStudentTickets,
  getStudentTicketsByStatus,
  cancelMaintenanceTicket,
  confirmTicketResolution,
} from '../api/maintenanceService';

/**
 * StudentMaintenanceScreen Component for UNILAG Hostel Students.
 * Implements [MAINTENANCE-04 / UAT-0054].
 *
 * Allows non-technical UNILAG students to:
 * 1. Select a repair category (Plumbing, Electrical, Carpentry, Masonry, Appliance, Structural)
 * 2. Attach a photo showing the damaged facility or defect
 * 3. Type a clear description of the problem
 * 4. View estimated response time (SLA) before submitting
 * 5. Filter tickets by status (All, Open, In Progress, Resolved, Cancelled)
 * 6. View detailed ticket information with proof-of-fix photo comparison ('Before' vs 'After')
 * 7. Confirm completed repairs with a 1-5 star rating and feedback comment saved in Turso DB
 */
export const StudentMaintenanceScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    tickets,
    activeCategory,
    statusFilter,
    selectedTicket,
    rating,
    studentFeedback,
    description,
    photoUrl,
    hostelId,
    roomNumber,
    isLoading,
    errorMessage,
    successMessage,
    setCategory,
    setStatusFilter,
    setSelectedTicket,
    setRating,
    setStudentFeedback,
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

  const loadTickets = async (filter: StatusFilterOption = statusFilter) => {
    try {
      setIsLoading(true);
      const data = await getStudentTicketsByStatus(studentId, filter);
      setTickets(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load maintenance tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(statusFilter);
  }, [studentId, statusFilter]);

  const handleFilterChange = (filter: StatusFilterOption) => {
    setStatusFilter(filter);
  };

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

  const handleConfirmFix = async () => {
    if (!selectedTicket) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const ok = await confirmTicketResolution({
        ticketId: selectedTicket.id,
        studentId,
        rating,
        studentFeedback,
      });

      if (ok) {
        setSuccessMessage('Thank you! Your resolution confirmation and rating have been saved.');
        setSelectedTicket(null);
        setRating(5);
        setStudentFeedback('');
        await loadTickets();
      } else {
        setErrorMessage('Unable to confirm resolution.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error confirming fix.');
    } finally {
      setIsLoading(false);
    }
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

      {/* Status Filter Tab Bar */}
      <View className="mb-4">
        <Text className="text-slate-900 font-bold text-base mb-2">Filter Repair Requests</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'] as StatusFilterOption[]).map(
              (filterOpt) => {
                const isActive = statusFilter === filterOpt;
                return (
                  <TouchableOpacity
                    key={filterOpt}
                    onPress={() => handleFilterChange(filterOpt)}
                    className={`px-3.5 py-2 rounded-xl border ${
                      isActive
                        ? 'bg-slate-900 border-slate-900'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {filterOpt === 'ALL'
                        ? 'All Requests'
                        : filterOpt === 'IN_PROGRESS'
                        ? 'In Progress'
                        : filterOpt.charAt(0) + filterOpt.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </ScrollView>
      </View>

      {/* Ticket History List Section */}
      <View className="mb-10">
        <Text className="text-slate-900 font-bold text-base mb-3">Your Submitted Repair Requests</Text>

        {tickets.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
            <Text className="text-slate-400 text-xs">No repair tickets found for this status.</Text>
          </View>
        ) : (
          tickets.map((tkt) => (
            <TouchableOpacity
              key={tkt.id}
              onPress={() => setSelectedTicket(tkt)}
              activeOpacity={0.8}
              className="bg-white p-4 rounded-2xl border border-slate-200 mb-3 shadow-sm"
            >
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
                    {tkt.status === 'IN_PROGRESS' ? 'IN PROGRESS' : tkt.status}
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

              {/* Rating badge if confirmed */}
              {tkt.rating ? (
                <View className="bg-amber-50 border border-amber-200 p-2 rounded-lg mb-2 flex-row items-center">
                  <Text className="text-amber-800 text-[11px] font-bold mr-1">
                    Student Rating: {'⭐'.repeat(tkt.rating)} ({tkt.rating}/5)
                  </Text>
                </View>
              ) : null}

              <View className="flex-row justify-between items-center border-t border-slate-100 pt-2.5">
                <Text className="text-slate-400 text-[10px]">
                  Target SLA: {tkt.targetSla}
                </Text>

                <View className="flex-row space-x-2">
                  <Text className="text-[#7A0000] text-[10px] font-bold self-center">
                    Tap for Details →
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
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Ticket Details & Fix Confirmation Modal */}
      <Modal
        visible={selectedTicket !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTicket ? (
                <View>
                  {/* Modal Header */}
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-slate-900 font-bold text-lg">
                      Ticket {selectedTicket.id} Details
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedTicket(null)}
                      className="bg-slate-100 p-2 rounded-full"
                    >
                      <Text className="text-slate-600 font-bold text-xs">✕ Close</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status Badge */}
                  <View className="flex-row items-center mb-4">
                    <Text className="text-slate-500 text-xs mr-2">Current Status:</Text>
                    <View className="bg-emerald-100 px-3 py-1 rounded-full">
                      <Text className="text-emerald-800 font-bold text-xs">
                        {selectedTicket.status}
                      </Text>
                    </View>
                  </View>

                  {/* Ticket Info */}
                  <View className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-1">
                    <Text className="text-slate-700 text-xs">
                      <Text className="font-bold">Category:</Text> {selectedTicket.category}
                    </Text>
                    <Text className="text-slate-700 text-xs">
                      <Text className="font-bold">Location:</Text> {selectedTicket.hostelId} - Room {selectedTicket.roomNumber}
                    </Text>
                    <Text className="text-slate-700 text-xs">
                      <Text className="font-bold">Urgency Priority:</Text> {selectedTicket.priority}
                    </Text>
                    <Text className="text-slate-700 text-xs">
                      <Text className="font-bold">Expected SLA:</Text> {selectedTicket.targetSla}
                    </Text>
                    <Text className="text-slate-700 text-xs">
                      <Text className="font-bold">Description:</Text> {selectedTicket.description}
                    </Text>
                  </View>

                  {/* Photos Comparison: Before vs After */}
                  <Text className="text-slate-900 font-bold text-xs mb-2">
                    Proof-of-Fix Inspection Photos
                  </Text>
                  <View className="flex-row space-x-2 mb-4">
                    <View className="flex-1">
                      <Text className="text-slate-600 text-[10px] font-semibold mb-1">
                        1. Before Repair (Reported)
                      </Text>
                      {selectedTicket.photoBeforeUrl ? (
                        <Image
                          source={{ uri: selectedTicket.photoBeforeUrl }}
                          className="w-full h-32 rounded-xl border border-slate-300"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-32 rounded-xl bg-slate-100 justify-center items-center">
                          <Text className="text-slate-400 text-[10px]">No photo</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-slate-600 text-[10px] font-semibold mb-1">
                        2. After Repair (Artisan Proof)
                      </Text>
                      {selectedTicket.photoAfterUrl ? (
                        <Image
                          source={{ uri: selectedTicket.photoAfterUrl }}
                          className="w-full h-32 rounded-xl border border-slate-300"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-32 rounded-xl bg-slate-100 justify-center items-center p-2">
                          <Text className="text-slate-400 text-[10px] text-center">
                            {selectedTicket.status === 'RESOLVED'
                              ? 'Artisan completed fix'
                              : 'Pending artisan proof upload'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Student Resolution Confirmation Section */}
                  {selectedTicket.status === 'RESOLVED' && !selectedTicket.confirmedAt ? (
                    <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-4">
                      <Text className="text-emerald-900 font-bold text-sm mb-1">
                        Confirm Repair Completion
                      </Text>
                      <Text className="text-emerald-700 text-xs mb-3">
                        University artisans marked this repair as finished. Please inspect your room and rate the quality of the fix.
                      </Text>

                      {/* Star Rating Picker */}
                      <Text className="text-emerald-900 font-semibold text-xs mb-1">
                        Quality Rating (1 to 5 Stars):
                      </Text>
                      <View className="flex-row space-x-2 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            className={`px-3 py-1.5 rounded-lg border ${
                              rating >= star
                                ? 'bg-amber-400 border-amber-500'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            <Text className="text-xs font-bold">⭐ {star}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Student Feedback Comment Input */}
                      <Text className="text-emerald-900 font-semibold text-xs mb-1">
                        Optional Feedback Comment:
                      </Text>
                      <TextInput
                        value={studentFeedback}
                        onChangeText={setStudentFeedback}
                        placeholder="Leave a comment about the artisan's work..."
                        className="bg-white border border-emerald-300 rounded-xl p-2.5 text-slate-800 text-xs mb-3"
                      />

                      {/* Confirm Fix Button */}
                      <TouchableOpacity
                        onPress={handleConfirmFix}
                        disabled={isLoading}
                        className="bg-emerald-700 py-3 rounded-xl items-center shadow-sm"
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text className="text-white font-bold text-xs">
                            Confirm Fix & Submit Rating
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : selectedTicket.confirmedAt ? (
                    <View className="bg-emerald-100 border border-emerald-300 p-3 rounded-xl mb-4">
                      <Text className="text-emerald-900 font-bold text-xs mb-1">
                        ✓ Fix Confirmed by Student
                      </Text>
                      <Text className="text-emerald-800 text-[11px]">
                        Rating: {'⭐'.repeat(selectedTicket.rating || 5)} ({selectedTicket.rating}/5)
                      </Text>
                      {selectedTicket.studentFeedback ? (
                        <Text className="text-emerald-700 text-[11px] italic mt-1">
                          "{selectedTicket.studentFeedback}"
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
