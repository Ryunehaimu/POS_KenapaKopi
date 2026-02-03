import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
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

    // Alert.alert("Printing", "Mencetak 2x Struk..."); // Optional: Too interruptive for real flow
  };

  const handleProcess = async () => {
      // 1. Validation
      if (paymentMethod === 'cash' && !isCashSufficient) {
          Alert.alert("Error", "Uang tunai kurang!");
          return;
      }
      if (paymentMethod === 'qris' && qrisStatus !== 'paid') {
          // Allow manual confirmation for QRIS even if not "checked" via system (simulated)
      }

      // 2. Print Simulation
      await handlePrint();

      // 3. Confirm Transaction
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
          
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-900">Pembayaran</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Totals */}
          <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-500">Subtotal</Text>
              <Text className="text-gray-900 font-bold">Rp {subtotal.toLocaleString()}</Text>
          </View>

          {/* Discount Section */}
          <View className="mb-6">
              <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Diskon</Text>
              <View className="flex-row gap-2">
                  <View className="flex-row bg-gray-100 rounded-lg p-1 border border-gray-200">
                      <TouchableOpacity 
                        onPress={() => {
                            setDiscountType('nominal');
                            setDiscountValue('');
                        }}
                        className="px-3 py-2 rounded-md"
                        style={{ 
                            backgroundColor: discountType === 'nominal' ? '#FFFFFF' : 'transparent',
                            shadowOpacity: discountType === 'nominal' ? 0.05 : 0,
                        }}
                      >
                         <Text className={`text-xs font-bold ${discountType === 'nominal' ? 'text-indigo-600' : 'text-gray-500'}`}>Rp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                            setDiscountType('percent');
                            setDiscountValue('');
                        }}
                        className="px-3 py-2 rounded-md"
                        style={{ 
                            backgroundColor: discountType === 'percent' ? '#FFFFFF' : 'transparent',
                            shadowOpacity: discountType === 'percent' ? 0.05 : 0,
                        }}
                      >
                         <Text className={`text-xs font-bold ${discountType === 'percent' ? 'text-indigo-600' : 'text-gray-500'}`}>%</Text>
                      </TouchableOpacity>
                  </View>
                  <TextInput 
                      value={discountValue}
                      onChangeText={setDiscountValue}
                      placeholder={discountType === 'percent' ? "0%" : "Rp 0"}
                      keyboardType="numeric"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 font-medium text-gray-900"
                  />
              </View>
              {discountAmount > 0 && (
                  <View className="flex-row justify-between items-center mt-2">
                       <Text className="text-indigo-600 text-xs">Potongan</Text>
                       <Text className="text-indigo-600 font-bold">- Rp {discountAmount.toLocaleString()}</Text>
                  </View>
              )}
          </View>

          {/* Grand Total */}
          <View className="bg-indigo-50 p-4 rounded-xl flex-row justify-between items-center mb-6 border border-indigo-100">
              <Text className="text-indigo-900 font-bold text-lg">Total Bayar</Text>
              <Text className="text-indigo-700 font-extrabold text-2xl">Rp {finalTotal.toLocaleString()}</Text>
          </View>

          {/* Payment Method Switcher */}
          <View className="flex-row gap-4 mb-6">
              <TouchableOpacity 
                onPress={() => setPaymentMethod('cash')}
                className={`flex-1 p-4 rounded-xl border-2 flex-items-center justify-center items-center ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}
              >
                  <Banknote size={24} color={paymentMethod === 'cash' ? '#4F46E5' : '#9CA3AF'} className="mb-2"/>
                  <Text className={`font-bold ${paymentMethod === 'cash' ? 'text-indigo-700' : 'text-gray-500'}`}>Tunai</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setPaymentMethod('qris')}
                className={`flex-1 p-4 rounded-xl border-2 flex-items-center justify-center items-center ${paymentMethod === 'qris' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}
              >
                  <QrCode size={24} color={paymentMethod === 'qris' ? '#4F46E5' : '#9CA3AF'} className="mb-2"/>
                  <Text className={`font-bold ${paymentMethod === 'qris' ? 'text-indigo-700' : 'text-gray-500'}`}>QRIS</Text>
              </TouchableOpacity>
          </View>

          {/* Method Specific Content */}
          {paymentMethod === 'cash' ? (
              <View className="mb-6">
                  <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Uang Diterima</Text>
                  <TextInput 
                      value={cashReceived}
                      onChangeText={setCashReceived}
                      placeholder="Rp 0"
                      keyboardType="numeric"
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg text-gray-900 mb-2"
                      autoFocus
                  />
                   <View className="flex-row justify-between items-center">
                       <Text className="text-gray-500 font-medium">Kembalian</Text>
                       <Text className={`font-bold text-lg ${isCashSufficient ? 'text-green-600' : 'text-red-500'}`}>
                           Rp {change.toLocaleString()}
                       </Text>
                   </View>
              </View>
          ) : (
             <View className="mb-6 items-center">
                 <View className="w-48 h-48 bg-gray-200 rounded-xl items-center justify-center mb-4">
                     <QrCode size={64} color="#4B5563" />
                     <Text className="text-gray-400 text-xs mt-2">QRIS Code Placeholder</Text>
                 </View>
                 
                 {qrisStatus === 'idle' && (
                     <TouchableOpacity onPress={checkQrisStatus} className="bg-gray-100 px-4 py-2 rounded-full">
                         <Text className="text-gray-700 font-bold text-sm">Cek Status Pembayaran</Text>
                     </TouchableOpacity>
                 )}
                 
                 {qrisStatus === 'checking' && (
                      <ActivityIndicator color="#4F46E5" />
                 )}
                 
                 {qrisStatus === 'paid' && (
                     <View className="flex-row items-center bg-green-100 px-4 py-2 rounded-full">
                         <Check size={16} color="#15803d" className="mr-2" />
                         <Text className="text-green-700 font-bold text-sm">Pembayaran Sukses</Text>
                     </View>
                 )}
             </View>
          )}

          {/* Action Button */}
          <TouchableOpacity 
            onPress={handleProcess}
            disabled={loading || (paymentMethod === 'cash' && !isCashSufficient)}
            className={`bg-indigo-600 py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-indigo-200 ${loading || (paymentMethod === 'cash' && !isCashSufficient) ? 'opacity-50' : ''}`}
          >
             {loading ? (
                 <ActivityIndicator color="white" />
             ) : (
                 <>
                    <Printer color="white" size={20} className="mr-2" />
                    <Text className="text-white font-bold text-lg">
                        {paymentMethod === 'qris' && qrisStatus !== 'paid' ? 'Konfirmasi Manual & Print' : 'Bayar & Print Struk'}
                    </Text>
                 </>
             )}
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};
