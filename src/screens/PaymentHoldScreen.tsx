import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, Modal } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { usePaymentStore } from '../store/usePaymentStore';
import { PaymentReceipt, RemitaPaymentChannel } from '../types/payment';

/**
 * 72-Hour Payment Hold & Remita Gateway Screen (PRD S-04).
 * Displays a countdown timer ring, provisional room reservation details,
 * Remita reference input field, voluntary hold cancellation, and digital receipts history.
 */
export const PaymentHoldScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    holdDetails,
    paymentResult,
    paymentHistory,
    selectedReceipt,
    rrrDetails,
    feeBreakdown,
    verificationResult,
    syncSummary,
    retryResult,
    checkoutResult,
    digitalClearanceSlip,
    selectedChannel,
    isLoading,
    isProcessing,
    isCancellingHold,
    isGeneratingRRR,
    isVerifyingRef,
    isSyncingPending,
    isProcessingCheckout,
    isFetchingClearanceSlip,
    isUrgentHold,
    error,
    formattedCountdown,
    fetchHoldStatus,
    payHostelFee,
    fetchPaymentHistory,
    releaseCurrentHold,
    generateRRR,
    verifyPaymentReference,
    syncPendingPayments,
    markPaymentFailed,
    processGatewayCheckout,
    fetchDigitalClearanceSlip,
    setSelectedChannel,
    setSelectedReceipt,
    setVerificationResult,
    updateCountdownTimer
  } = usePaymentStore();

  const [remitaRefInput, setRemitaRefInput] = useState('');
  const [verifyRefInput, setVerifyRefInput] = useState('');
  const [cardNumberInput, setCardNumberInput] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [cvvInput, setCvvInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [showClearanceModal, setShowClearanceModal] = useState(false);

  const userId = session?.user.id;

  // Fetch hold status and payment history on screen mount
  useEffect(() => {
    if (userId) {
      fetchHoldStatus(userId).catch(() => {});
      fetchPaymentHistory(userId).catch(() => {});
    }
  }, [userId]);

  // Interval timer for 1-second countdown updates
  useEffect(() => {
    const timer = setInterval(() => {
      updateCountdownTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePayNow = async () => {
    setLocalError(null);
    setNoticeMessage(null);
    if (!userId) {
      setLocalError('User session invalid. Please log in.');
      return;
    }

    if (!remitaRefInput.trim()) {
      setLocalError('Please enter a valid 12-digit Remita RRR or transaction reference.');
      return;
    }

    try {
      const res = await payHostelFee(userId, remitaRefInput.trim());
      setRemitaRefInput('');
      setNoticeMessage(res.message);
      if (userId) {
        fetchPaymentHistory(userId).catch(() => {});
      }
    } catch (e: any) {
      // Error is caught in store state or local error
    }
  };

  const handleReleaseHold = async () => {
    setLocalError(null);
    setNoticeMessage(null);
    if (!userId) {
      setLocalError('User session invalid. Please log in.');
      return;
    }

    try {
      const res = await releaseCurrentHold(userId);
      setNoticeMessage(res.message);
    } catch (e: any) {
      // Error caught in store or local state
    }
  };

  const handleGenerateRRR = async () => {
    setLocalError(null);
    setNoticeMessage(null);
    if (!userId) {
      setLocalError('User session invalid. Please log in.');
      return;
    }

    try {
      const details = await generateRRR(userId);
      setRemitaRefInput(details.rrr);
      setNoticeMessage(`Remita RRR generated successfully: ${details.rrr}`);
    } catch (e: any) {
      // Error handled in store state
    }
  };

  const handleVerifyReference = async () => {
    setLocalError(null);
    if (!verifyRefInput.trim()) {
      setLocalError('Please enter a 12-digit Remita reference to verify.');
      return;
    }

    try {
      await verifyPaymentReference(verifyRefInput.trim());
    } catch (e: any) {
      // Error handled in store state
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-6 items-center pb-12">
        {/* Header Title */}
        <View className="w-full bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900 text-center">Hostel Fee Payment</Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            72-Hour Provisional Reservation Hold & Remita Gateway
          </Text>
        </View>

        {isLoading && !holdDetails && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-3">Loading reservation hold status...</Text>
          </View>
        )}

        {(error || localError) && (
          <View className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <Text className="text-red-800 font-semibold text-base mb-1">Notice</Text>
            <Text className="text-red-700 text-sm">{localError || error}</Text>
          </View>
        )}

        {noticeMessage && (
          <View className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <Text className="text-blue-900 font-semibold text-base mb-1">Update</Text>
            <Text className="text-blue-800 text-sm">{noticeMessage}</Text>
          </View>
        )}

        {/* Successful Confirmation Banner */}
        {paymentResult && paymentResult.success && (
          <View className="w-full bg-emerald-50 border border-emerald-300 p-5 rounded-2xl mb-6 shadow-sm">
            <Text className="text-emerald-900 text-lg font-bold mb-1">PAYMENT CONFIRMED</Text>
            <Text className="text-emerald-800 text-sm mb-3">{paymentResult.message}</Text>
            <View className="bg-white p-4 rounded-xl border border-emerald-200">
              <Text className="text-xs text-slate-500">Transaction Reference</Text>
              <Text className="text-slate-900 font-bold text-sm mb-2">{paymentResult.transactionReference}</Text>
              <Text className="text-xs text-slate-500">Amount Paid</Text>
              <Text className="text-emerald-700 font-extrabold text-lg mb-2">₦{paymentResult.amount.toLocaleString()}</Text>
              <Text className="text-xs text-slate-500">Status</Text>
              <Text className="text-emerald-800 font-bold text-sm">Bedspace Status: CONFIRMED</Text>
            </View>
          </View>
        )}

        {/* Urgent Time Warning Banner (< 12 Hours) */}
        {isUrgentHold && (
          <View className="w-full bg-amber-500 p-4 rounded-2xl mb-6 shadow-md border border-amber-600">
            <Text className="text-white text-base font-extrabold text-center mb-1">
              ⚠️ URGENT HOLD WARNING
            </Text>
            <Text className="text-amber-950 text-xs font-medium text-center">
              You have less than 12 hours remaining on your 72-hour room hold! Pay now to avoid losing your bedspace allocation.
            </Text>
          </View>
        )}

        {/* Main Countdown Timer Ring (PRD S-04 Spec: w-48 h-48 rounded-full border-4 border-[#D4AF37]) */}
        {holdDetails && !holdDetails.isExpired && holdDetails.paymentStatus !== 'SUCCESSFUL' && (
          <>
            <View className={`w-48 h-48 rounded-full border-4 ${isUrgentHold ? 'border-amber-500 bg-amber-50' : 'border-[#D4AF37] bg-white'} justify-center items-center mb-6 shadow-lg`}>
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hold Time Left</Text>
              <Text className={`text-2xl font-black ${isUrgentHold ? 'text-amber-900' : 'text-slate-900'} tracking-wider`}>{formattedCountdown}</Text>
              <Text className="text-[10px] text-amber-700 font-semibold mt-1">72-HR PAYMENT LOCK</Text>
            </View>

            {/* Provisional Room Summary Card (PRD S-04 Spec) */}
            <View className="bg-white w-full p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Provisional Accommodation Details
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600 text-sm font-medium">Hostel Name:</Text>
                <Text className="text-slate-900 font-bold text-sm">{holdDetails.hostelName}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600 text-sm font-medium">Block & Room:</Text>
                <Text className="text-slate-900 font-bold text-sm">
                  Block {holdDetails.blockName} — Room {holdDetails.roomNumber}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600 text-sm font-medium">Bedspace Position:</Text>
                <Text className="text-slate-900 font-bold text-sm">{holdDetails.bedLabel}</Text>
              </View>
              <View className="flex-row justify-between pt-3 border-t border-slate-100">
                <Text className="text-slate-600 text-sm font-medium">Hostel Fee Amount:</Text>
                <Text className="text-[#7A0000] font-extrabold text-lg">₦{holdDetails.amount.toLocaleString()}</Text>
              </View>
            </View>

            {/* Itemized Fee Breakdown Card */}
            {feeBreakdown && (
              <View className="bg-white w-full p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Itemized Fee Breakdown
                </Text>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-slate-600 text-xs">Hostel Accommodation Fee:</Text>
                  <Text className="text-slate-800 font-bold text-xs">₦{feeBreakdown.baseHostelFee.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-slate-600 text-xs">Remita Gateway Service Charge:</Text>
                  <Text className="text-slate-800 font-bold text-xs">₦{feeBreakdown.remitaServiceFee.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-slate-600 text-xs">ICT System Processing Fee:</Text>
                  <Text className="text-slate-800 font-bold text-xs">₦{feeBreakdown.ictProcessingFee.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between pt-2 border-t border-slate-100">
                  <Text className="text-slate-900 font-bold text-sm">Total Amount Payable:</Text>
                  <Text className="text-emerald-700 font-black text-base">₦{feeBreakdown.totalAmount.toLocaleString()}</Text>
                </View>
              </View>
            )}

            {/* Remita RRR Generator Button & Card */}
            <View className="bg-white w-full p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
              <Text className="text-sm font-bold text-slate-800 mb-1">Remita RRR Generator</Text>
              <Text className="text-xs text-slate-500 mb-3">
                Generate a 12-digit Remita Retrieval Reference (RRR) code to pay at any bank or online portal.
              </Text>

              {rrrDetails ? (
                <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 items-center">
                  <Text className="text-xs text-amber-800 font-semibold mb-1">Your Remita RRR Code:</Text>
                  <Text className="text-xl font-black text-slate-900 tracking-widest">{rrrDetails.rrr}</Text>
                  <Text className="text-[10px] text-slate-500 mt-1">
                    Total Payable: ₦{rrrDetails.amountPayable.toLocaleString()}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  className="bg-[#7A0000] w-full py-3 rounded-xl items-center justify-center mb-4 active:opacity-90"
                  disabled={isGeneratingRRR}
                  onPress={handleGenerateRRR}
                >
                  {isGeneratingRRR ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-sm">Generate Remita RRR Code</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Remita Payment Entry */}
              <Text className="text-xs font-bold text-slate-700 mb-2">
                Enter 12-Digit Remita RRR to Confirm Payment
              </Text>
              <TextInput
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base mb-4"
                placeholder="e.g. 123456789012"
                placeholderTextColor="#94A3B8"
                value={remitaRefInput}
                onChangeText={setRemitaRefInput}
                autoCapitalize="characters"
              />

              {/* Pay Now Button (PRD S-04 Spec: bg-emerald-600) */}
              <TouchableOpacity
                className="bg-emerald-600 w-full py-4 rounded-xl items-center justify-center shadow-md active:opacity-90 mb-3"
                disabled={isProcessing || isCancellingHold}
                onPress={handlePayNow}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-lg">Pay Hostel Fee (Confirm Reservation)</Text>
                )}
              </TouchableOpacity>

              {/* Release / Cancel Hold Button */}
              <TouchableOpacity
                className="bg-rose-50 border border-rose-200 w-full py-3 rounded-xl items-center justify-center active:opacity-80"
                disabled={isProcessing || isCancellingHold}
                onPress={handleReleaseHold}
              >
                {isCancellingHold ? (
                  <ActivityIndicator color="#991B1B" />
                ) : (
                  <Text className="text-rose-800 font-semibold text-sm">Release Bedspace Hold (Cancel Reservation)</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Gateway Checkout & Channel Selection Card */}
        {holdDetails && !holdDetails.isExpired && holdDetails.paymentStatus !== 'SUCCESSFUL' && (
          <View className="bg-white w-full p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
            <Text className="text-base font-bold text-slate-900 mb-1">Direct Remita Gateway Checkout</Text>
            <Text className="text-xs text-slate-500 mb-4">
              Select your preferred payment channel to complete your hostel fee payment.
            </Text>

            {/* Payment Channel Selector Pills */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(['CARD', 'BANK_TRANSFER', 'USSD', 'REMITA_WALLET'] as RemitaPaymentChannel[]).map((ch) => (
                <TouchableOpacity
                  key={ch}
                  className={`px-3 py-2 rounded-xl border ${
                    selectedChannel === ch ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-50 border-slate-300'
                  }`}
                  onPress={() => setSelectedChannel(ch)}
                >
                  <Text className={`text-xs font-bold ${selectedChannel === ch ? 'text-white' : 'text-slate-700'}`}>
                    {ch === 'CARD' ? '💳 Debit Card' : ch === 'BANK_TRANSFER' ? '🏦 Bank Transfer' : ch === 'USSD' ? '📱 USSD Code' : '👛 Remita Wallet'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Card Inputs */}
            {selectedChannel === 'CARD' && (
              <View className="mb-4 space-y-2">
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
                  placeholder="Card Number (16 Digits)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={cardNumberInput}
                  onChangeText={setCardNumberInput}
                />
                <View className="flex-row space-x-2">
                  <TextInput
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
                    placeholder="MM/YY"
                    placeholderTextColor="#94A3B8"
                    value={expiryInput}
                    onChangeText={setExpiryInput}
                  />
                  <TextInput
                    className="w-28 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
                    placeholder="CVV"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    keyboardType="numeric"
                    value={cvvInput}
                    onChangeText={setCvvInput}
                  />
                </View>
              </View>
            )}

            {/* Direct Gateway Submit Button */}
            <TouchableOpacity
              className="bg-slate-900 w-full py-4 rounded-xl items-center justify-center shadow-md active:opacity-90"
              disabled={isProcessingCheckout}
              onPress={async () => {
                setLocalError(null);
                setNoticeMessage(null);
                if (!userId) return;

                try {
                  const res = await processGatewayCheckout({
                    userId,
                    paymentId: holdDetails.paymentId,
                    channel: selectedChannel,
                    cardDetails: selectedChannel === 'CARD' ? {
                      cardNumber: cardNumberInput || '5399123456789012',
                      expiryMonth: expiryInput.split('/')[0] || '12',
                      expiryYear: expiryInput.split('/')[1] || '28',
                      cvv: cvvInput || '123'
                    } : undefined
                  });
                  setNoticeMessage(res.message);
                  if (userId) {
                    fetchPaymentHistory(userId).catch(() => {});
                  }
                } catch (e: any) {}
              }}
            >
              {isProcessingCheckout ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Pay ₦{(feeBreakdown?.totalAmount || 25800).toLocaleString()} via {selectedChannel}
                </Text>
              )}
            </TouchableOpacity>

            {/* Display Virtual Account or USSD Details if initiated */}
            {checkoutResult && (
              <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Text className="text-xs font-bold text-amber-900 mb-1">Gateway Payment Instructions:</Text>
                <Text className="text-xs text-amber-800 mb-2">{checkoutResult.message}</Text>
                {checkoutResult.ussdCode && (
                  <Text className="text-sm font-black text-slate-900">USSD Code: {checkoutResult.ussdCode}</Text>
                )}
                {checkoutResult.virtualAccountNumber && (
                  <Text className="text-sm font-black text-slate-900">
                    Account: {checkoutResult.virtualAccountNumber} ({checkoutResult.bankName})
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Confirmed Accommodation Card & Digital Clearance Slip Trigger */}
        {holdDetails && holdDetails.paymentStatus === 'SUCCESSFUL' && (
          <View className="bg-emerald-50 border border-emerald-300 w-full p-6 rounded-2xl mb-6 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-emerald-900 font-extrabold text-lg">RESERVATION CONFIRMED</Text>
              <View className="bg-emerald-200 px-3 py-1 rounded-full">
                <Text className="text-emerald-900 font-bold text-xs">OFFICIAL RESIDENT</Text>
              </View>
            </View>
            <Text className="text-slate-600 text-sm mb-4">
              Your hostel fee payment has been successfully processed. Your bedspace position is fully locked and secured.
            </Text>

            <View className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2 mb-4">
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500 font-medium">Hostel Name:</Text>
                <Text className="text-xs font-bold text-slate-800">{holdDetails.hostelName}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500 font-medium">Block & Room:</Text>
                <Text className="text-xs font-bold text-slate-800">
                  Block {holdDetails.blockName} — Room {holdDetails.roomNumber}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500 font-medium">Bedspace Position:</Text>
                <Text className="text-xs font-bold text-slate-800">{holdDetails.bedLabel}</Text>
              </View>
              <View className="flex-row justify-between pt-2 border-t border-slate-100">
                <Text className="text-xs text-slate-500 font-medium">Amount Paid:</Text>
                <Text className="text-sm font-extrabold text-emerald-700">₦{holdDetails.amount.toLocaleString()}</Text>
              </View>
            </View>

            {/* View Digital Accommodation Clearance Slip Button */}
            <TouchableOpacity
              className="bg-emerald-700 w-full py-3 rounded-xl items-center justify-center active:opacity-90"
              disabled={isFetchingClearanceSlip}
              onPress={async () => {
                if (!userId) return;
                try {
                  await fetchDigitalClearanceSlip(userId);
                  setShowClearanceModal(true);
                } catch (e: any) {}
              }}
            >
              {isFetchingClearanceSlip ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-sm">🎓 View Digital Accommodation Clearance Slip</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Expired Hold Banner */}
        {holdDetails && holdDetails.isExpired && (
          <View className="bg-amber-50 border border-amber-300 p-6 rounded-2xl w-full items-center mb-6">
            <Text className="text-amber-900 font-bold text-lg mb-2">RESERVATION HOLD EXPIRED</Text>
            <Text className="text-amber-800 text-sm text-center mb-4">
              Your 72-hour bedspace hold time has elapsed. The bedspace position has been automatically recycled back to the available pool.
            </Text>
          </View>
        )}

        {/* Empty State when no active hold exists */}
        {!isLoading && !holdDetails && (
          <View className="bg-white p-8 rounded-2xl w-full items-center border border-slate-200 mb-6">
            <Text className="text-slate-800 font-bold text-lg mb-2">No Active Bedspace Hold</Text>
            <Text className="text-slate-500 text-sm text-center">
              You do not currently have a provisional bedspace hold. Please go to the Balloting screen to select and lock an available bedspace.
            </Text>
          </View>
        )}

        {/* Remita Transaction Reference Status Lookup Tool */}
        <View className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-base font-bold text-slate-900 mb-1">Remita Reference Status Lookup</Text>
          <Text className="text-xs text-slate-500 mb-3">
            Check the status of any Remita RRR or payment reference code.
          </Text>

          <View className="flex-row space-x-2 mb-3">
            <TextInput
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-800 text-sm"
              placeholder="Enter 12-digit RRR"
              placeholderTextColor="#94A3B8"
              value={verifyRefInput}
              onChangeText={setVerifyRefInput}
            />
            <TouchableOpacity
              className="bg-slate-900 px-4 py-2 rounded-xl justify-center items-center"
              disabled={isVerifyingRef}
              onPress={handleVerifyReference}
            >
              {isVerifyingRef ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-bold text-xs">Verify</Text>
              )}
            </TouchableOpacity>
          </View>

          {verificationResult && (
            <View className={`p-4 rounded-xl border ${
              verificationResult.status === 'SUCCESSFUL'
                ? 'bg-emerald-50 border-emerald-200'
                : verificationResult.status === 'PENDING'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <Text className="text-xs font-bold text-slate-800 mb-1">
                Reference: {verificationResult.transactionReference}
              </Text>
              <Text className="text-xs text-slate-600 mb-2">{verificationResult.message}</Text>
              {verificationResult.payerName && (
                <Text className="text-[11px] text-slate-500">Payer: {verificationResult.payerName}</Text>
              )}
              {verificationResult.roomDetails && (
                <Text className="text-[11px] text-slate-500">Room: {verificationResult.roomDetails}</Text>
              )}
              <TouchableOpacity
                className="mt-2 text-xs text-blue-600 font-semibold"
                onPress={() => setVerificationResult(null)}
              >
                <Text className="text-xs text-slate-500 underline text-right">Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sync Pending Payments Action */}
          <TouchableOpacity
            className="mt-4 bg-slate-100 border border-slate-300 py-3 rounded-xl items-center justify-center active:opacity-80"
            disabled={isSyncingPending}
            onPress={async () => {
              try {
                await syncPendingPayments();
                if (userId) {
                  fetchHoldStatus(userId).catch(() => {});
                  fetchPaymentHistory(userId).catch(() => {});
                }
              } catch (e: any) {}
            }}
          >
            {isSyncingPending ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <Text className="text-slate-800 font-semibold text-xs">Sync Pending Payment Statuses</Text>
            )}
          </TouchableOpacity>

          {syncSummary && (
            <View className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <Text className="text-[11px] font-bold text-slate-700">Sync Reconciled:</Text>
              <Text className="text-[10px] text-slate-600">
                Pending Checked: {syncSummary.totalPending} • Confirmed: {syncSummary.confirmedCount} • Expired/Failed: {syncSummary.failedCount}
              </Text>
            </View>
          )}
        </View>

        {/* Payment History & Digital Clearance Receipts */}
        {paymentHistory.length > 0 && (
          <View className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-2">
            <Text className="text-lg font-bold text-slate-900 mb-3">Payment History & Digital Receipts</Text>
            {paymentHistory.map((receipt) => (
              <TouchableOpacity
                key={receipt.paymentId}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3 flex-row justify-between items-center"
                onPress={() => setSelectedReceipt(receipt)}
              >
                <View className="flex-1 pr-2">
                  <Text className="text-xs text-slate-400 font-bold uppercase">{receipt.hostelName}</Text>
                  <Text className="text-sm font-bold text-slate-800">
                    Room {receipt.roomNumber} ({receipt.bedLabel})
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">
                    Ref: {receipt.transactionReference} • ₦{receipt.amount.toLocaleString()}
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${
                  receipt.paymentStatus === 'SUCCESSFUL'
                    ? 'bg-emerald-100'
                    : receipt.paymentStatus === 'PENDING'
                    ? 'bg-amber-100'
                    : 'bg-rose-100'
                }`}>
                  <Text className={`text-xs font-bold ${
                    receipt.paymentStatus === 'SUCCESSFUL'
                      ? 'text-emerald-800'
                      : receipt.paymentStatus === 'PENDING'
                      ? 'text-amber-800'
                      : 'text-rose-800'
                  }`}>
                    {receipt.paymentStatus}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Digital Receipt Modal / Detail Card */}
        <Modal
          visible={!!selectedReceipt}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedReceipt(null)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-6">
            <View className="bg-white w-full p-6 rounded-3xl border border-slate-200 shadow-2xl">
              <View className="items-center mb-4 pb-4 border-b border-slate-100">
                <Text className="text-xl font-bold text-slate-900">Official Clearance Receipt</Text>
                <Text className="text-xs text-slate-500 mt-1">UNILAG Hostel Accommodation Fee</Text>
              </View>

              {selectedReceipt && (
                <View className="space-y-3 mb-6">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Student Name:</Text>
                    <Text className="text-xs font-bold text-slate-800">{selectedReceipt.studentFullName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Matric / UTME No:</Text>
                    <Text className="text-xs font-bold text-slate-800">{selectedReceipt.studentMatricNo}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Hostel Name:</Text>
                    <Text className="text-xs font-bold text-slate-800">{selectedReceipt.hostelName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Block & Room:</Text>
                    <Text className="text-xs font-bold text-slate-800">
                      Block {selectedReceipt.blockName} — Room {selectedReceipt.roomNumber}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Bedspace Position:</Text>
                    <Text className="text-xs font-bold text-slate-800">{selectedReceipt.bedLabel}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Transaction Reference:</Text>
                    <Text className="text-xs font-bold text-slate-800">{selectedReceipt.transactionReference}</Text>
                  </View>
                  <View className="flex-row justify-between pt-2 border-t border-slate-100">
                    <Text className="text-sm text-slate-600 font-semibold">Amount Paid:</Text>
                    <Text className="text-lg font-extrabold text-emerald-700">₦{selectedReceipt.amount.toLocaleString()}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                className="bg-[#7A0000] w-full py-3 rounded-xl items-center"
                onPress={() => setSelectedReceipt(null)}
              >
                <Text className="text-white font-bold text-base">Close Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Digital Accommodation Clearance Slip Modal */}
        <Modal
          visible={showClearanceModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowClearanceModal(false)}
        >
          <View className="flex-1 bg-black/70 justify-center items-center p-6">
            <View className="bg-white w-full p-6 rounded-3xl border border-amber-300 shadow-2xl">
              <View className="items-center mb-4 pb-4 border-b border-slate-200">
                <Text className="text-2xl font-black text-[#7A0000]">UNIVERSITY OF LAGOS</Text>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  OFFICIAL ACCOMMODATION CLEARANCE SLIP
                </Text>
              </View>

              {digitalClearanceSlip && (
                <View className="space-y-3 mb-6">
                  <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl items-center mb-2">
                    <Text className="text-xs font-bold text-emerald-900">RESIDENCY STATUS: ACTIVE RESIDENT</Text>
                    <Text className="text-[10px] text-emerald-700">Slip ID: {digitalClearanceSlip.clearanceSlipId}</Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Resident Name:</Text>
                    <Text className="text-xs font-bold text-slate-800">{digitalClearanceSlip.studentName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Matric Number:</Text>
                    <Text className="text-xs font-bold text-slate-800">{digitalClearanceSlip.studentMatricNo}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Hostel Name:</Text>
                    <Text className="text-xs font-bold text-slate-800">{digitalClearanceSlip.hostelName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Room Allocation:</Text>
                    <Text className="text-xs font-bold text-slate-800">
                      Block {digitalClearanceSlip.blockName} Room {digitalClearanceSlip.roomNumber} ({digitalClearanceSlip.bedLabel})
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Payment Reference:</Text>
                    <Text className="text-xs font-bold text-slate-800">{digitalClearanceSlip.transactionReference}</Text>
                  </View>

                  {/* Cryptographic QR Security Payload Preview */}
                  <View className="bg-slate-100 p-3 rounded-xl border border-slate-300 items-center mt-2">
                    <Text className="text-[10px] font-bold text-slate-600 mb-1">Encrypted Gate Verification QR Payload:</Text>
                    <Text className="text-[9px] text-slate-500 text-center" numberOfLines={2}>
                      {digitalClearanceSlip.clearanceQrPayload}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                className="bg-slate-900 w-full py-3 rounded-xl items-center"
                onPress={() => setShowClearanceModal(false)}
              >
                <Text className="text-white font-bold text-base">Close Clearance Slip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};
