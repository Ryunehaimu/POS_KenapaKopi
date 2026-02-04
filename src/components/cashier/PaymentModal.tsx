import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Keyboard } from 'react-native';
import { X, Check, Printer, QrCode, Banknote } from 'lucide-react-native';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  subtotal: number;
  onConfirm: (finalAmount: number, paymentMethod: 'cash' | 'qris', discount: number, cashReceived?: number, change?: number) => Promise<void>;
  loading: boolean;
}

export const PaymentModal = ({ visible, onClose, subtotal, onConfirm, loading }: PaymentModalProps) => {
  const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('nominal');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Calculations
  const rawDiscountValue = parseFloat(discountValue || '0');
  const discountAmount = discountType === 'percent' 
    ? (Math.min(rawDiscountValue, 100) / 100) * subtotal 
    : rawDiscountValue;
    
  const finalTotal = Math.max(0, subtotal - discountAmount);
  
  const cashReceivedNum = parseFloat(cashReceived || '0');
  const change = Math.max(0, cashReceivedNum - finalTotal);
  const isCashSufficient = cashReceivedNum >= finalTotal;

  // QRIS Simulation State
  const [qrisStatus, setQrisStatus] = useState<'idle' | 'checking' | 'paid'>('idle');

  // Reset state on open
  useEffect(() => {
     if (visible) {
         setDiscountValue('');
         setCashReceived('');
         setPaymentMethod('cash');
         setQrisStatus('idle');
     }
  }, [visible]);

  const handlePrint = async () => {
    // Simulation of 2x printing
  };

  const handleProcess = async () => {
      if (paymentMethod === 'cash' && !isCashSufficient) {
          Alert.alert("Error", "Uang tunai kurang!");
          return;
      }

      await handlePrint();

      await onConfirm(
          finalTotal, 
          paymentMethod, 
          discountAmount, 
          paymentMethod === 'cash' ? cashReceivedNum : undefined, 
          paymentMethod === 'cash' ? change : undefined
      );
  };

  const checkQrisStatus = () => {
      setQrisStatus('checking');
      setTimeout(() => {
          setQrisStatus('paid');
          Alert.alert("QRIS", "Pembayaran Diterima!");
      }, 1500);
  };

  // Auto scroll to bottom when cash input is focused
  const handleCashInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 bg-black/50 justify-start items-center pt-4 px-2">
          <View className="bg-white rounded-2xl w-full max-w-lg shadow-xl" style={{ maxHeight: '90%' }}>
            <ScrollView 
              ref={scrollViewRef}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
            
            {/* Header */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">Pembayaran</Text>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <X size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Totals & Discount Row - Compact */}
            <View className="flex-row mb-3 gap-3">
              {/* Subtotal */}
              <View className="flex-1 bg-gray-50 p-3 rounded-xl">
                <Text className="text-gray-500 text-xs mb-1">Subtotal</Text>
                <Text className="text-gray-900 font-bold">Rp {subtotal.toLocaleString()}</Text>
              </View>
              
              {/* Discount */}
              <View className="flex-1">
                <View className="flex-row items-center gap-1">
                  <View className="flex-row bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                    <TouchableOpacity 
                      onPress={() => { setDiscountType('nominal'); setDiscountValue(''); }}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: discountType === 'nominal' ? '#FFFFFF' : 'transparent' }}
                    >
                      <Text className={`text-xs font-bold ${discountType === 'nominal' ? 'text-indigo-600' : 'text-gray-500'}`}>Rp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { setDiscountType('percent'); setDiscountValue(''); }}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: discountType === 'percent' ? '#FFFFFF' : 'transparent' }}
                    >
                      <Text className={`text-xs font-bold ${discountType === 'percent' ? 'text-indigo-600' : 'text-gray-500'}`}>%</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput 
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder="Diskon"
                    keyboardType="numeric"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                  />
                </View>
              </View>
            </View>

            {/* Grand Total - Compact */}
            <View className="bg-indigo-50 p-3 rounded-xl flex-row justify-between items-center mb-3 border border-indigo-100">
              <Text className="text-indigo-900 font-bold">Total Bayar</Text>
              <Text className="text-indigo-700 font-extrabold text-xl">Rp {finalTotal.toLocaleString()}</Text>
            </View>

            {/* Payment Method - Horizontal Compact */}
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity 
                onPress={() => setPaymentMethod('cash')}
                className={`flex-1 p-3 rounded-xl border-2 flex-row items-center justify-center ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}
              >
                <Banknote size={20} color={paymentMethod === 'cash' ? '#4F46E5' : '#9CA3AF'} />
                <Text className={`font-bold ml-2 ${paymentMethod === 'cash' ? 'text-indigo-700' : 'text-gray-500'}`}>Tunai</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setPaymentMethod('qris')}
                className={`flex-1 p-3 rounded-xl border-2 flex-row items-center justify-center ${paymentMethod === 'qris' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}
              >
                <QrCode size={20} color={paymentMethod === 'qris' ? '#4F46E5' : '#9CA3AF'} />
                <Text className={`font-bold ml-2 ${paymentMethod === 'qris' ? 'text-indigo-700' : 'text-gray-500'}`}>QRIS</Text>
              </TouchableOpacity>
            </View>

            {/* Method Specific Content */}
            {paymentMethod === 'cash' ? (
              <View className="mb-3">
                <Text className="text-xs font-bold text-gray-500 mb-1 uppercase">Uang Diterima</Text>
                <TextInput 
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  placeholder="Rp 0"
                  keyboardType="numeric"
                  onFocus={handleCashInputFocus}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg text-gray-900 mb-2"
                />
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 font-medium">Kembalian</Text>
                  <Text className={`font-bold text-lg ${isCashSufficient ? 'text-green-600' : 'text-red-500'}`}>
                    Rp {change.toLocaleString()}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mb-3 items-center">
                <View className="w-32 h-32 bg-gray-200 rounded-xl items-center justify-center mb-2">
                  <QrCode size={48} color="#4B5563" />
                  <Text className="text-gray-400 text-xs mt-1">QRIS</Text>
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity 
              onPress={handleProcess}
              disabled={loading || (paymentMethod === 'cash' && !isCashSufficient)}
              className={`bg-indigo-600 py-3 rounded-xl flex-row justify-center items-center ${loading || (paymentMethod === 'cash' && !isCashSufficient) ? 'opacity-50' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Printer color="white" size={18} />
                  <Text className="text-white font-bold ml-2">
                    {paymentMethod === 'qris' ? 'Konfirmasi & Print' : 'Bayar & Print'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Spacer for keyboard scroll */}
            <View style={{ height: 100 }} />

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};


