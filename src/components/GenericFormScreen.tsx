import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { router } from 'expo-router'; // Use static router object
import { ChevronLeft, Save, ChevronDown } from 'lucide-react-native';

export interface FormField {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  type?: 'text' | 'select' | 'number';
  options?: { label: string; value: string }[];
}

interface GenericFormScreenProps {
  title: string;
  fields: FormField[];
  onSubmit: () => void;
  loading: boolean;
  submitLabel?: string;
  children?: React.ReactNode; 
}

export default function GenericFormScreen({ 
  title, 
  fields, 
  onSubmit, 
  loading,
  submitLabel = "Simpan",
  children
}: GenericFormScreenProps) {
  // Removed useRouter() hook - using static router object instead

  const renderField = (field: FormField, index: number) => {
      if (field.type === 'select' && field.options) {
          return (
            <View key={index} className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">{field.label}</Text>
                <View className="flex-row flex-wrap gap-2">
                    {field.options.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => field.onChangeText(option.value)}
                            className={`px-4 py-2 rounded-full border ${field.value === option.value ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}
                        >
                            <Text className={`${field.value === option.value ? 'text-white' : 'text-gray-700'} font-medium`}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
          );
      }

      // Default Text Input
      return (
        <View key={index} className="mb-6">
           <Text className="text-sm font-medium text-gray-700 mb-2">{field.label}</Text>
           <TextInput
               value={field.value}
               onChangeText={field.onChangeText}
               placeholder={field.placeholder}
               className={`bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 text-base ${field.multiline ? 'h-24' : ''}`}
               autoFocus={field.autoFocus}
               multiline={field.multiline}
               textAlignVertical={field.multiline ? 'top' : 'center'}
               keyboardType={field.keyboardType}
           />
        </View>
      );
  };

  return (
    <View className="flex-1 bg-gray-50">
       <View className="bg-white pt-12 pb-4 px-6 shadow-sm z-10">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
               <ChevronLeft size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">{title}</Text>
            <View className="w-8" />
          </View>
       </View>

      <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
       >
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
            <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               {fields.map((field, index) => renderField(field, index))}

               {children}

               <TouchableOpacity
                  onPress={onSubmit}
                  disabled={loading}
                  className={`bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center ${loading ? 'opacity-70' : ''}`}
               >
                  {loading ? (
                     <ActivityIndicator color="white" />
                  ) : (
                     <>
                       <Save size={20} color="white" className="mr-2" />
                       <Text className="text-white font-bold text-base">{submitLabel}</Text>
                     </>
                  )}
               </TouchableOpacity>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
