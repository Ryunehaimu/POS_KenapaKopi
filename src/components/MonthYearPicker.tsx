import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface MonthYearPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate: Date;
}

export const MonthYearPicker = ({ visible, onClose, onSelect, selectedDate }: MonthYearPickerProps) => {
  const [year, setYear] = useState(selectedDate.getFullYear());

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handleSelectMonth = (monthIndex: number) => {
    const newDate = new Date(year, monthIndex, 1);
    onSelect(newDate);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center">
        <View className="bg-white m-4 rounded-2xl w-[320px] p-4 shadow-xl">
          
          {/* Header: Year Selector */}
          <View className="flex-row items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <TouchableOpacity onPress={() => setYear(year - 1)} className="p-2 bg-gray-50 rounded-lg">
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
            
            <Text className="text-xl font-bold text-gray-900">{year}</Text>
            
            <TouchableOpacity onPress={() => setYear(year + 1)} className="p-2 bg-gray-50 rounded-lg">
              <ChevronRight size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Months Grid */}
          <View className="flex-row flex-wrap justify-between">
            {months.map((month, index) => {
                const isSelected = selectedDate.getFullYear() === year && selectedDate.getMonth() === index;
                return (
                    <TouchableOpacity 
                        key={index}
                        onPress={() => handleSelectMonth(index)}
                        className={`w-[30%] py-3 mb-3 rounded-xl items-center justify-center ${isSelected ? 'bg-indigo-600 shadow-md shadow-indigo-200' : 'bg-gray-50'}`}
                    >
                        <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                            {month.substring(0, 3)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
          </View>

          <TouchableOpacity onPress={onClose} className="mt-4 py-3 items-center border-t border-gray-100">
             <Text className="text-gray-500 font-medium">Batal</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};
