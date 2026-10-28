import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useClearanceStore } from '../store/useClearanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { WardenClearanceSubmission, ClearanceDocument } from '../types/clearance';

/**
 * WardenClearanceQueueScreen Component.
 * Allows Hall Wardens to review, inspect, approve, or reject student digital clearance document packages.
 * Renders according to Section 6 specs with high contrast UI, clear document tags, and single-tap actions.
 */
export const WardenClearanceQueueScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    pendingQueue,
    isLoading,
    errorMessage,
    successMessage,
    fetchPendingQueue,
    reviewClearancePackage,
    clearMessages
  } = useClearanceStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubmission, setSelectedSubmission] = useState<WardenClearanceSubmission | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isRejectModalVisible, setIsRejectModalVisible] = useState<boolean>(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchPendingQueue(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') => {
    clearMessages();
    setActiveTab(tab);
  };

  const handleApprove = async (submission: WardenClearanceSubmission) => {
    clearMessages();
    const wardenId = session?.user.id || 'usr_warden_default';
    const success = await reviewClearancePackage(submission.userId, wardenId, 'APPROVED');
    if (success && selectedSubmission?.userId === submission.userId) {
      setIsDetailModalVisible(false);
      setSelectedSubmission(null);
    }
  };

  const handleOpenRejectModal = (submission: WardenClearanceSubmission) => {
    clearMessages();
    setSelectedSubmission(submission);
    setRejectionReasonInput('');
    setIsRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedSubmission) return;
    if (!rejectionReasonInput.trim()) {
      useClearanceStore.setState({ errorMessage: 'Please enter a reason for rejecting the clearance submission.' });
      return;
    }

    const wardenId = session?.user.id || 'usr_warden_default';
    const success = await reviewClearancePackage(
      selectedSubmission.userId,
      wardenId,
      'REJECTED',
      rejectionReasonInput.trim()
    );

    if (success) {
      setIsRejectModalVisible(false);
      setIsDetailModalVisible(false);
      setSelectedSubmission(null);
      setRejectionReasonInput('');
    }
  };

  const handleViewDetails = (submission: WardenClearanceSubmission) => {
    clearMessages();
    setSelectedSubmission(submission);
    setIsDetailModalVisible(true);
  };

  // Filter queue by search text (Name or Matric No)
  const filteredQueue = pendingQueue.filter((item: WardenClearanceSubmission) => {
    const text = searchQuery.toLowerCase().trim();
    if (!text) return true;
    return (
      item.fullName.toLowerCase().includes(text) ||
      item.matricNo.toLowerCase().includes(text) ||
      item.department.toLowerCase().includes(text)
    );
  });

  // Calculate statistics
  const totalCount = pendingQueue.length;
  const pendingCount = pendingQueue.filter((i: WardenClearanceSubmission) => i.clearanceStatus === 'PENDING').length;
  const approvedCount = pendingQueue.filter((i: WardenClearanceSubmission) => i.clearanceStatus === 'APPROVED').length;
  const rejectedCount = pendingQueue.filter((i: WardenClearanceSubmission) => i.clearanceStatus === 'REJECTED').length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 pb-20">
        {/* Header Title */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-xl font-bold text-[#7A0000]">CLEARANCE REVIEW QUEUE</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Review uploaded Medical Certificates, Passport Photos, and Code of Conduct forms.
          </Text>
        </View>

        {/* Message Banner Alerts */}
        {errorMessage ? (
          <View className="bg-red-50 border border-red-300 p-4 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-red-800 font-semibold text-xs flex-1">{errorMessage}</Text>
            <TouchableOpacity onPress={clearMessages} className="ml-2">
              <Text className="text-red-600 font-bold text-xs">Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {successMessage ? (
          <View className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-emerald-800 font-semibold text-xs flex-1">{successMessage}</Text>
            <TouchableOpacity onPress={clearMessages} className="ml-2">
              <Text className="text-emerald-600 font-bold text-xs">Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Summary Metric Cards Grid */}
        <View className="flex-row space-x-2 mb-4">
          <View className="flex-1 bg-white p-3 rounded-xl border border-slate-200 items-center">
            <Text className="text-xs font-semibold text-slate-500">Pending</Text>
            <Text className="text-xl font-extrabold text-amber-600">{pendingCount}</Text>
          </View>
          <View className="flex-1 bg-white p-3 rounded-xl border border-slate-200 items-center">
            <Text className="text-xs font-semibold text-slate-500">Approved</Text>
            <Text className="text-xl font-extrabold text-emerald-600">{approvedCount}</Text>
          </View>
          <View className="flex-1 bg-white p-3 rounded-xl border border-slate-200 items-center">
            <Text className="text-xs font-semibold text-slate-500">Rejected</Text>
            <Text className="text-xl font-extrabold text-red-600">{rejectedCount}</Text>
          </View>
        </View>

        {/* Search Bar Input */}
        <View className="mb-4">
          <TextInput
            className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
            placeholder="Search student by Name, Matric No, or Dept..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Status Filter Tab Pills */}
        <View className="flex-row space-x-2 mb-4">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => handleTabChange(tab)}
                className={`flex-1 py-2 rounded-xl items-center border ${
                  isActive
                    ? 'bg-[#7A0000] border-[#7A0000]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Loading Indicator */}
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-500 text-xs mt-3">Loading clearance queue records...</Text>
          </View>
        ) : filteredQueue.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center my-4">
            <Text className="text-slate-700 font-bold text-base mb-1">No Clearance Submissions</Text>
            <Text className="text-slate-400 text-xs text-center">
              There are no student clearance packages matching the selected '{activeTab}' filter.
            </Text>
          </View>
        ) : (
          /* Submission Cards List */
          <View className="space-y-4">
            {filteredQueue.map((item: WardenClearanceSubmission) => {
              const docCount = item.documents ? item.documents.length : 0;
              return (
                <View
                  key={item.userId}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
                >
                  {/* Top Student Header */}
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-bold text-slate-900">{item.fullName}</Text>
                      <Text className="text-xs text-slate-500 font-medium">
                        Matric: {item.matricNo} | Level {item.level} ({item.department})
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      className={`px-3 py-1 rounded-full ${
                        item.clearanceStatus === 'APPROVED'
                          ? 'bg-emerald-100 border border-emerald-300'
                          : item.clearanceStatus === 'REJECTED'
                          ? 'bg-red-100 border border-red-300'
                          : 'bg-amber-100 border border-amber-300'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          item.clearanceStatus === 'APPROVED'
                            ? 'text-emerald-800'
                            : item.clearanceStatus === 'REJECTED'
                            ? 'text-red-800'
                            : 'text-amber-800'
                        }`}
                      >
                        {item.clearanceStatus}
                      </Text>
                    </View>
                  </View>

                  {/* Document Breakdown Badges */}
                  <View className="flex-row items-center space-x-2 my-2">
                    <Text className="text-xs text-slate-500 font-semibold">Docs: {docCount}/3</Text>
                    {item.documents?.map((doc: ClearanceDocument) => (
                      <View key={doc.id} className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        <Text className="text-[10px] text-slate-600 font-semibold">
                          {doc.documentType === 'MEDICAL_CERTIFICATE'
                            ? 'Medical'
                            : doc.documentType === 'PASSPORT_PHOTO'
                            ? 'Passport'
                            : 'Code of Conduct'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Rejection Reason if applicable */}
                  {item.rejectionReason ? (
                    <Text className="text-xs text-red-600 mt-1 italic">
                      Rejection Reason: {item.rejectionReason}
                    </Text>
                  ) : null}

                  {/* Certificate Hash if approved */}
                  {item.clearanceCertificateHash ? (
                    <Text className="text-xs text-emerald-700 mt-1 font-mono font-bold">
                      Cert Hash: {item.clearanceCertificateHash}
                    </Text>
                  ) : null}

                  {/* Action Buttons Row */}
                  <View className="flex-row space-x-2 mt-4 pt-3 border-t border-slate-100">
                    <TouchableOpacity
                      onPress={() => handleViewDetails(item)}
                      className="flex-1 bg-slate-100 py-3 rounded-xl items-center border border-slate-300"
                    >
                      <Text className="text-slate-800 text-xs font-bold">View Package</Text>
                    </TouchableOpacity>

                    {item.clearanceStatus === 'PENDING' ? (
                      <>
                        <TouchableOpacity
                          onPress={() => handleOpenRejectModal(item)}
                          className="flex-1 bg-red-600 py-3 rounded-xl items-center"
                        >
                          <Text className="text-white text-xs font-bold">Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleApprove(item)}
                          className="flex-1 bg-emerald-600 py-3 rounded-xl items-center"
                        >
                          <Text className="text-white text-xs font-bold">Approve</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Package Detail Modal */}
      <Modal visible={isDetailModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-5/6">
            <Text className="text-lg font-bold text-[#7A0000] mb-2">
              Clearance Package Details
            </Text>

            {selectedSubmission ? (
              <ScrollView className="mb-4">
                <View className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
                  <Text className="text-sm font-bold text-slate-800">{selectedSubmission.fullName}</Text>
                  <Text className="text-xs text-slate-500">Matric: {selectedSubmission.matricNo}</Text>
                  <Text className="text-xs text-slate-500">
                    Faculty: {selectedSubmission.faculty} | Dept: {selectedSubmission.department}
                  </Text>
                  <Text className="text-xs text-slate-500">Campus: {selectedSubmission.campus}</Text>
                </View>

                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Uploaded Documents ({selectedSubmission.documents?.length || 0})
                </Text>

                {selectedSubmission.documents?.map((doc: ClearanceDocument) => (
                  <View key={doc.id} className="bg-white p-3 rounded-xl border border-slate-200 mb-2">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-slate-800">{doc.fileName}</Text>
                      <Text className="text-[10px] text-slate-500 font-semibold">{doc.documentType}</Text>
                    </View>
                    <Text className="text-[10px] text-slate-400 mt-1">URL: {doc.fileUrl}</Text>
                    {doc.notes ? (
                      <Text className="text-xs text-slate-600 mt-1 italic">Student Note: {doc.notes}</Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View className="flex-row space-x-2 pt-2 border-t border-slate-200">
              <TouchableOpacity
                onPress={() => setIsDetailModalVisible(false)}
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
              >
                <Text className="text-slate-800 font-bold text-xs">Close</Text>
              </TouchableOpacity>

              {selectedSubmission?.clearanceStatus === 'PENDING' ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleOpenRejectModal(selectedSubmission)}
                    className="flex-1 bg-red-600 py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs">Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleApprove(selectedSubmission)}
                    className="flex-1 bg-emerald-600 py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs">Approve Package</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Input Modal */}
      <Modal visible={isRejectModalVisible} animationType="fade" transparent={true}>
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-white rounded-2xl p-6 shadow-xl">
            <Text className="text-lg font-bold text-red-800 mb-2">Decline Clearance Submission</Text>
            <Text className="text-xs text-slate-500 mb-4">
              Please provide specific reason feedback for student {selectedSubmission?.fullName}.
            </Text>

            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-xs mb-4"
              placeholder="e.g. Passport photo lacks red background / Jaja clinic stamp unverified."
              value={rejectionReasonInput}
              onChangeText={setRejectionReasonInput}
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#94A3B8"
            />

            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => setIsRejectModalVisible(false)}
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
              >
                <Text className="text-slate-800 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmReject}
                className="flex-1 bg-red-600 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-xs">Confirm Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
