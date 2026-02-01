import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Save } from 'lucide-react-native';

export interface FormField {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
}

interface GenericFormScreenProps {
  title: string;
  fields: FormField[];
  onSubmit: () => void;
  loading: boolean;
  submitLabel?: string;
  children?: React.ReactNode; // For extra content if needed
}

export default function GenericFormScreen({ 
  title, 
  fields, 
  onSubmit, 
  loading,
  submitLabel = "Simpan",
  children
}: GenericFormScreenProps) {
  const router = useRouter();

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
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               {fields.map((field, index) => (
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
               ))}

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
