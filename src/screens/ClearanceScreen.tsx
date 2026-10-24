import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useClearanceStore } from '../store/useClearanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { DocumentType } from '../types/clearance';

/**
 * Screen S-07 / Clearance UI component for students to upload required clearance documents
 * (Medical Certificate, Passport Photo, Code of Conduct Form) and submit package for Warden review.
 * Formatted with NativeWind (Tailwind CSS) styling according to PRD specifications.
 */
export const ClearanceScreen: React.FC = () => {
  const { user } = useAuthStore();
  const {
    clearancePackage,
    isLoading,
    isUploading,
    errorMessage,
    successMessage,
    fetchClearancePackage,
    uploadDocument,
    submitClearancePackage,
    clearMessages
  } = useClearanceStore();

  const [medicalUrl, setMedicalUrl] = useState('');
  const [passportUrl, setPassportUrl] = useState('');
  const [codeOfConductUrl, setCodeOfConductUrl] = useState('');

  const userId = user?.id || 'usr_student_01';

  useEffect(() => {
    fetchClearancePackage(userId);
  }, [userId]);

  const handleUpload = async (docType: DocumentType, url: string, defaultName: string) => {
    if (!url.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid document file URL or path.');
      return;
    }

    await uploadDocument(userId, docType, url.trim(), defaultName);
  };

  const handleSubmit = async () => {
    const success = await submitClearancePackage(userId);
    if (success) {
      Alert.alert('Submission Successful', 'Your digital clearance documents have been submitted to the Hall Warden for review.');
    }
  };

  const getDoc = (type: DocumentType) => {
    return clearancePackage?.documents.find(d => d.documentType === type);
  };

  const renderStatusBadge = () => {
    const status = clearancePackage?.overallStatus || 'NOT_STARTED';
    let bg = 'bg-slate-500';
    let text = 'Not Started';

    if (status === 'APPROVED') {
      bg = 'bg-emerald-600';
      text = 'Clearance Approved';
    } else if (status === 'PENDING') {
      bg = 'bg-amber-500';
      text = 'Pending Warden Review';
    } else if (status === 'REJECTED') {
      bg = 'bg-red-600';
      text = 'Clearance Rejected';
    }

    return (
      <View className={`${bg} px-4 py-2 rounded-full self-start mb-4`}>
        <Text className="text-white font-bold text-sm">{text}</Text>
      </View>
    );
  };

  return (
    <ScrollView className="bg-slate-50 flex-1 px-4 py-6">
      {/* Header Title */}
      <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
        <Text className="text-2xl font-bold text-[#7A0000] mb-1">
          Digital Hostel Clearance
        </Text>
        <Text className="text-slate-600 text-sm mb-3">
          Upload required screening documents (Medical Certificate, Passport Photo, Code of Conduct) to finalize accommodation approval.
        </Text>
        {renderStatusBadge()}

        {clearancePackage?.rejectionReason && (
          <View className="bg-red-50 p-3 rounded-xl border border-red-200 mt-2">
            <Text className="text-red-800 font-semibold text-xs">Rejection Reason:</Text>
            <Text className="text-red-700 text-xs mt-1">{clearancePackage.rejectionReason}</Text>
          </View>
        )}

        {clearancePackage?.clearanceCertificateHash && (
          <View className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 mt-2">
            <Text className="text-emerald-800 font-semibold text-xs">Clearance Certificate Reference Hash:</Text>
            <Text className="text-emerald-700 font-mono text-xs mt-1">{clearancePackage.clearanceCertificateHash}</Text>
          </View>
        )}
      </View>

      {/* Error and Success Banners */}
      {errorMessage && (
        <View className="bg-red-100 border border-red-300 p-4 rounded-xl mb-4">
          <Text className="text-red-800 text-sm font-semibold">{errorMessage}</Text>
        </View>
      )}

      {successMessage && (
        <View className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl mb-4">
          <Text className="text-emerald-800 text-sm font-semibold">{successMessage}</Text>
        </View>
      )}

      {/* Document Upload Card 1: Medical Certificate */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-slate-800">1. Medical Certificate</Text>

          {getDoc('MEDICAL_CERTIFICATE') ? (
            <Text className="text-emerald-600 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
              Uploaded
            </Text>
          ) : (
            <Text className="text-amber-600 font-bold text-xs bg-amber-100 px-3 py-1 rounded-full">
              Required
            </Text>
          )}
        </View>
        <Text className="text-slate-500 text-xs mb-3">Issued by UNILAG Medical Center (Jaja Clinic)</Text>

        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-3"
          placeholder="Enter Medical Certificate file URL (e.g. https://.../med.pdf)"
          placeholderTextColor="#94A3B8"
          value={medicalUrl}
          onChangeText={setMedicalUrl}
        />

        <TouchableOpacity
          className="bg-slate-800 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => handleUpload('MEDICAL_CERTIFICATE', medicalUrl, 'Medical_Certificate.pdf')}
          disabled={isUploading}
        >
          <Text className="text-white font-bold text-sm">
            {getDoc('MEDICAL_CERTIFICATE') ? 'Replace Medical Certificate' : 'Upload Medical Certificate'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document Upload Card 2: Passport Photo */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-slate-800">2. Passport Photograph</Text>

          {getDoc('PASSPORT_PHOTO') ? (
            <Text className="text-emerald-600 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
              Uploaded
            </Text>
          ) : (
            <Text className="text-amber-600 font-bold text-xs bg-amber-100 px-3 py-1 rounded-full">
              Required
            </Text>
          )}
        </View>
        <Text className="text-slate-500 text-xs mb-3">Red background, 0.5MB max size</Text>

        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-3"
          placeholder="Enter Passport Photo URL (e.g. https://.../photo.jpg)"
          placeholderTextColor="#94A3B8"
          value={passportUrl}
          onChangeText={setPassportUrl}
        />

        <TouchableOpacity
          className="bg-slate-800 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => handleUpload('PASSPORT_PHOTO', passportUrl, 'Passport_Photo.jpg')}
          disabled={isUploading}
        >
          <Text className="text-white font-bold text-sm">
            {getDoc('PASSPORT_PHOTO') ? 'Replace Passport Photo' : 'Upload Passport Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document Upload Card 3: Code of Conduct Form */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-slate-800">3. Code of Conduct Form</Text>

          {getDoc('CODE_OF_CONDUCT') ? (
            <Text className="text-emerald-600 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
              Uploaded
            </Text>
          ) : (
            <Text className="text-amber-600 font-bold text-xs bg-amber-100 px-3 py-1 rounded-full">
              Required
            </Text>
          )}
        </View>
        <Text className="text-slate-500 text-xs mb-3">Signed UNILAG Hostel Code of Conduct form</Text>

        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-3"
          placeholder="Enter Code of Conduct Form URL (e.g. https://.../conduct.pdf)"
          placeholderTextColor="#94A3B8"
          value={codeOfConductUrl}
          onChangeText={setCodeOfConductUrl}
        />

        <TouchableOpacity
          className="bg-slate-800 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => handleUpload('CODE_OF_CONDUCT', codeOfConductUrl, 'Code_of_Conduct.pdf')}
          disabled={isUploading}
        >
          <Text className="text-white font-bold text-sm">
            {getDoc('CODE_OF_CONDUCT') ? 'Replace Form' : 'Upload Code of Conduct Form'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Final Submit Package Action Button */}
      <TouchableOpacity
        className="bg-[#7A0000] rounded-xl py-4 items-center shadow-lg mb-12 active:opacity-90"
        onPress={handleSubmit}
        disabled={isLoading || isUploading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-bold text-lg">Submit Clearance Package</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};
