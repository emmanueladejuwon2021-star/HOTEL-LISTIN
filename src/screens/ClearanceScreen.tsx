import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useClearanceStore } from '../store/useClearanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { DocumentType } from '../types/clearance';

/**
 * Screen S-07 / Digital Clearance UI Component for UNILAG Hostel Students.
 * Allows students to upload required clearance documents (Medical Certificate, Passport Photo, Code of Conduct Form),
 * attach student notes, view document file metadata (size, format, timestamp), delete uploaded files if corrections are needed,
 * track completion progress (0/3, 1/3, 2/3, 3/3), and submit package for Warden approval.
 *
 * Styled using NativeWind v4 (Tailwind CSS) with clear, jargon-free English comments for non-technical team members.
 */
export const ClearanceScreen: React.FC = () => {
  const { user } = useAuthStore();
  const {
    clearancePackage,
    isLoading,
    isUploading,
    errorMessage,
    successMessage,
    certificateVerification,
    reviewHistory,
    fetchClearancePackage,
    uploadDocument,
    deleteDocument,
    submitClearancePackage,
    verifyCertificate,
    fetchReviewHistory,
    clearMessages
  } = useClearanceStore();

  const [verifyHashInput, setVerifyHashInput] = useState('');

  const [medicalUrl, setMedicalUrl] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  const [passportUrl, setPassportUrl] = useState('');
  const [passportNotes, setPassportNotes] = useState('');

  const [codeOfConductUrl, setCodeOfConductUrl] = useState('');
  const [conductNotes, setConductNotes] = useState('');

  const userId = user?.id || 'usr_student_01';

  useEffect(() => {
    fetchClearancePackage(userId);
    fetchReviewHistory(userId);
  }, [userId]);

  const handleVerifyCertificate = async () => {
    if (!verifyHashInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid clearance certificate hash code (e.g. CERT-A1B2C3D4E5F6).');
      return;
    }
    await verifyCertificate(verifyHashInput.trim());
  };

  const handleUpload = async (docType: DocumentType, url: string, defaultName: string, notes?: string) => {
    if (!url.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid document file URL or path.');
      return;
    }

    const doc = await uploadDocument(userId, docType, url.trim(), defaultName, notes?.trim());
    if (doc) {
      if (docType === 'MEDICAL_CERTIFICATE') setMedicalNotes('');
      if (docType === 'PASSPORT_PHOTO') setPassportNotes('');
      if (docType === 'CODE_OF_CONDUCT') setConductNotes('');
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    Alert.alert(
      'Remove Clearance Document',
      `Are you sure you want to remove '${docName}' from your clearance package?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Document',
          style: 'destructive',
          onPress: async () => {
            await deleteDocument(userId, docId);
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    const success = await submitClearancePackage(userId);
    if (success) {
      Alert.alert(
        'Submission Successful',
        'Your digital clearance documents have been submitted to the Hall Warden for review.'
      );
    }
  };

  const getDoc = (type: DocumentType) => {
    return clearancePackage?.documents.find(d => d.documentType === type);
  };

  // Calculate completion percentage and count (0 to 3 documents)
  const uploadedCount = ['MEDICAL_CERTIFICATE', 'PASSPORT_PHOTO', 'CODE_OF_CONDUCT'].filter(type =>
    getDoc(type as DocumentType)
  ).length;
  const progressPercent = Math.round((uploadedCount / 3) * 100);

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
      {/* Header Card */}
      <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
        <Text className="text-2xl font-bold text-[#7A0000] mb-1">
          Digital Hostel Clearance
        </Text>
        <Text className="text-slate-600 text-sm mb-3">
          Upload required screening documents (Medical Certificate, Passport Photo, Code of Conduct) to finalize accommodation approval.
        </Text>
        {renderStatusBadge()}

        {/* Clearance Progress Bar */}
        <View className="mt-2 mb-2">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xs font-bold text-slate-700">Clearance Checklist Progress</Text>
            <Text className="text-xs font-bold text-[#7A0000]">{progressPercent}% ({uploadedCount}/3 Docs)</Text>
          </View>
          <View className="bg-slate-200 h-2.5 rounded-full overflow-hidden w-full">
            <View
              className="bg-[#7A0000] h-2.5 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>

        {clearancePackage?.rejectionReason && (
          <View className="bg-red-50 p-3 rounded-xl border border-red-200 mt-3">
            <Text className="text-red-800 font-semibold text-xs">Rejection Reason:</Text>
            <Text className="text-red-700 text-xs mt-1">{clearancePackage.rejectionReason}</Text>
          </View>
        )}

        {clearancePackage?.clearanceCertificateHash && (
          <View className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 mt-3">
            <Text className="text-emerald-800 font-semibold text-xs">Clearance Certificate Reference Hash:</Text>
            <Text className="text-emerald-700 font-mono text-xs mt-1">{clearancePackage.clearanceCertificateHash}</Text>
          </View>
        )}
      </View>

      {/* Error and Success Banner Messages */}
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

      {/* Document Card 1: Medical Certificate */}
      {(() => {
        const doc = getDoc('MEDICAL_CERTIFICATE');
        return (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-bold text-slate-800">1. Medical Certificate</Text>

              {doc ? (
                <Text className="text-emerald-600 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
                  Uploaded
                </Text>
              ) : (
                <Text className="text-amber-600 font-bold text-xs bg-amber-100 px-3 py-1 rounded-full">
                  Required
                </Text>
              )}
            </View>
            <Text className="text-slate-500 text-xs mb-3">Issued by UNILAG Medical Center (Jaja Clinic). PDF or Image format.</Text>

            {doc ? (
              <View className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                <Text className="text-slate-800 font-bold text-sm">{doc.fileName}</Text>
                <Text className="text-slate-500 text-xs mt-1">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()} • Format: {doc.mimeType || 'PDF/Doc'} • Size: {Math.round((doc.fileSizeBytes || 256000) / 1024)} KB
                </Text>
                {doc.notes ? <Text className="text-slate-600 text-xs italic mt-1">Note: "{doc.notes}"</Text> : null}

                <TouchableOpacity
                  className="bg-red-50 border border-red-200 rounded-lg py-2 mt-3 items-center active:opacity-80"
                  onPress={() => handleDelete(doc.id, doc.fileName)}
                  disabled={isUploading}
                >
                  <Text className="text-red-700 font-bold text-xs">Delete Document</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-2"
                  placeholder="Enter Medical Certificate file URL (e.g. https://.../med.pdf)"
                  placeholderTextColor="#94A3B8"
                  value={medicalUrl}
                  onChangeText={setMedicalUrl}
                />
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-800 text-xs mb-3"
                  placeholder="Optional note/remark for Warden (e.g. Clinic reference #1024)"
                  placeholderTextColor="#94A3B8"
                  value={medicalNotes}
                  onChangeText={setMedicalNotes}
                />
                <TouchableOpacity
                  className="bg-slate-800 rounded-xl py-3 items-center active:opacity-80"
                  onPress={() => handleUpload('MEDICAL_CERTIFICATE', medicalUrl, 'Medical_Certificate.pdf', medicalNotes)}
                  disabled={isUploading}
                >
                  <Text className="text-white font-bold text-sm">Upload Medical Certificate</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })()}

      {/* Document Card 2: Passport Photograph */}
      {(() => {
        const doc = getDoc('PASSPORT_PHOTO');
        return (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-bold text-slate-800">2. Passport Photograph</Text>

              {doc ? (
                <Text className="text-emerald-600 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
                  Uploaded
                </Text>
              ) : (
                <Text className="text-amber-600 font-bold text-xs bg-amber-100 px-3 py-1 rounded-full">
                  Required
                </Text>
              )}
            </View>
            <Text className="text-slate-500 text-xs mb-3">Red background passport image (.jpg or .png format).</Text>

            {doc ? (
              <View className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                <Text className="text-slate-800 font-bold text-sm">{doc.fileName}</Text>
                <Text className="text-slate-500 text-xs mt-1">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()} • Format: {doc.mimeType || 'Image/JPG'} • Size: {Math.round((doc.fileSizeBytes || 256000) / 1024)} KB
                </Text>
                {doc.notes ? <Text className="text-slate-600 text-xs italic mt-1">Note: "{doc.notes}"</Text> : null}

                <TouchableOpacity
                  className="bg-red-50 border border-red-200 rounded-lg py-2 mt-3 items-center active:opacity-80"
                  onPress={() => handleDelete(doc.id, doc.fileName)}
                  disabled={isUploading}
                >
                  <Text className="text-red-700 font-bold text-xs">Delete Document</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-2"
                  placeholder="Enter Passport Photo URL (e.g. https://.../photo.jpg)"
                  placeholderTextColor="#94A3B8"
                  value={passportUrl}
                  onChangeText={setPassportUrl}
                />
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-800 text-xs mb-3"
                  placeholder="Optional photo remark (e.g. Red background verified)"
                  placeholderTextColor="#94A3B8"
                  value={passportNotes}
                  onChangeText={setPassportNotes}
                />
                <TouchableOpacity
                  className="bg-slate-800 rounded-xl py-3 items-center active:opacity-80"
                  onPress={() => handleUpload('PASSPORT_PHOTO', passportUrl, 'Passport_Photo.jpg', passportNotes)}
                  disabled={isUploading}
                >
                  <Text className="text-white font-bold text-sm">Upload Passport Photo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })()}

      {/* Document Card 3: Code of Conduct Form */}
      {(() => {
        const doc = getDoc('CODE_OF_CONDUCT');
        return (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-bold text-slate-800">3. Code of Conduct Form</Text>

              {doc ? (
                <Text className="text-emerald-600 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
                  Uploaded
                </Text>
              ) : (
                <Text className="text-amber-600 font-bold text-xs bg-amber-100 px-3 py-1 rounded-full">
                  Required
                </Text>
              )}
            </View>
            <Text className="text-slate-500 text-xs mb-3">Signed UNILAG Hostel Code of Conduct form (.pdf or image).</Text>

            {doc ? (
              <View className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                <Text className="text-slate-800 font-bold text-sm">{doc.fileName}</Text>
                <Text className="text-slate-500 text-xs mt-1">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()} • Format: {doc.mimeType || 'PDF/Doc'} • Size: {Math.round((doc.fileSizeBytes || 256000) / 1024)} KB
                </Text>
                {doc.notes ? <Text className="text-slate-600 text-xs italic mt-1">Note: "{doc.notes}"</Text> : null}

                <TouchableOpacity
                  className="bg-red-50 border border-red-200 rounded-lg py-2 mt-3 items-center active:opacity-80"
                  onPress={() => handleDelete(doc.id, doc.fileName)}
                  disabled={isUploading}
                >
                  <Text className="text-red-700 font-bold text-xs">Delete Document</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-2"
                  placeholder="Enter Code of Conduct Form URL (e.g. https://.../conduct.pdf)"
                  placeholderTextColor="#94A3B8"
                  value={codeOfConductUrl}
                  onChangeText={setCodeOfConductUrl}
                />
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-800 text-xs mb-3"
                  placeholder="Optional remark (e.g. Signed by student & parent)"
                  placeholderTextColor="#94A3B8"
                  value={conductNotes}
                  onChangeText={setConductNotes}
                />
                <TouchableOpacity
                  className="bg-slate-800 rounded-xl py-3 items-center active:opacity-80"
                  onPress={() => handleUpload('CODE_OF_CONDUCT', codeOfConductUrl, 'Code_of_Conduct.pdf', conductNotes)}
                  disabled={isUploading}
                >
                  <Text className="text-white font-bold text-sm">Upload Code of Conduct Form</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })()}

      {/* Final Submit Clearance Package Button */}
      <TouchableOpacity
        className="bg-[#7A0000] rounded-xl py-4 items-center shadow-lg mb-8 active:opacity-90"
        onPress={handleSubmit}
        disabled={isLoading || isUploading || uploadedCount < 3}
        style={{ opacity: uploadedCount < 3 ? 0.6 : 1 }}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-bold text-lg">
            {uploadedCount < 3 ? `Upload All 3 Docs to Submit (${uploadedCount}/3)` : 'Submit Clearance Package'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Certificate Verification Lookup Tool Card */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <Text className="text-lg font-bold text-slate-800 mb-1">
          Certificate Verification Lookup
        </Text>
        <Text className="text-slate-500 text-xs mb-3">
          Verify the official validity of any UNILAG hostel clearance certificate hash code.
        </Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm mb-3"
          placeholder="Enter Certificate Hash (e.g. CERT-A1B2C3D4E5F6)"
          placeholderTextColor="#94A3B8"
          value={verifyHashInput}
          onChangeText={setVerifyHashInput}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          className="bg-slate-900 rounded-xl py-3 items-center active:opacity-80"
          onPress={handleVerifyCertificate}
          disabled={isLoading}
        >
          <Text className="text-white font-bold text-sm">Verify Clearance Certificate</Text>
        </TouchableOpacity>

        {certificateVerification && (
          <View className={`p-4 rounded-xl mt-3 border ${certificateVerification.isValid ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
            <Text className={`font-bold text-sm ${certificateVerification.isValid ? 'text-emerald-800' : 'text-red-800'}`}>
              {certificateVerification.isValid ? 'Official Certificate Validated' : 'Certificate Invalid'}
            </Text>
            <Text className={`text-xs mt-1 ${certificateVerification.isValid ? 'text-emerald-700' : 'text-red-700'}`}>
              {certificateVerification.message}
            </Text>
          </View>
        )}
      </View>

      {/* Audit History Log Section */}
      {reviewHistory.length > 0 && (
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-12">
          <Text className="text-lg font-bold text-slate-800 mb-2">Clearance Audit History</Text>
          {reviewHistory.map((item) => (
            <View key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2">
              <View className="flex-row justify-between items-center mb-1">
                <Text className={`font-bold text-xs px-2 py-0.5 rounded-full ${item.actionStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {item.actionStatus}
                </Text>
                <Text className="text-slate-400 text-[10px]">{new Date(item.timestamp).toLocaleString()}</Text>
              </View>
              {item.notes ? <Text className="text-slate-600 text-xs mt-1">{item.notes}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};
