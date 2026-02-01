import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, FlatList, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  X, 
  Check 
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KasirSidebar from '../../../components/KasirSidebar';
import { inventoryService, Ingredient, StockLog } from '../../../services/inventoryService';

const PINNED_STORAGE_KEY_KASIR = 'STOCK_OPNAME_PINNED_IDS_KASIR';

export default function KasirStockOpnameScreen() {
  const router = useRouter();
  
  // Data State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic array of pinned IDs
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  
  // Selection Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ingData, logData] = await Promise.all([
        inventoryService.getIngredients(),
        inventoryService.getLogs()
      ]);
      setIngredients(ingData);
      setLogs(logData);
      
      // Load pinned IDs
      await loadPinnedIds(ingData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPinnedIds = async (allIngredients: Ingredient[]) => {
      try {
          const stored = await AsyncStorage.getItem(PINNED_STORAGE_KEY_KASIR);
          if (stored) {
              setPinnedIds(JSON.parse(stored));
          } else {
              // Default to first 4
              const defaults = allIngredients.slice(0, 4).map(i => i.id);
              setPinnedIds(defaults);
              await AsyncStorage.setItem(PINNED_STORAGE_KEY_KASIR, JSON.stringify(defaults));
          }
      } catch (e) {
          console.error("Failed to load pinned ids", e);
      }
  };

  const openSelectionModal = () => {
      setTempSelectedIds([...pinnedIds]);
      setModalVisible(true);
  };

  const toggleSelection = (id: string) => {
      if (tempSelectedIds.includes(id)) {
          setTempSelectedIds(tempSelectedIds.filter(tid => tid !== id));
      } else {
          if (tempSelectedIds.length >= 4) {
              Alert.alert("Batas Maksimal", "Anda hanya bisa memilih maksimal 4 bahan untuk ringkasan.");
              return;
          }
          setTempSelectedIds([...tempSelectedIds, id]);
      }
  };

  const saveSelection = async () => {
      setPinnedIds(tempSelectedIds);
      setModalVisible(false);
      try {
          await AsyncStorage.setItem(PINNED_STORAGE_KEY_KASIR, JSON.stringify(tempSelectedIds));
      } catch (e) {
          console.error("Failed to save pinned ids", e);
      }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getPinnedIngredient = (id: string) => {
      return ingredients.find(i => i.id === id);
  };

  const renderSummaryCard = (id: string, index: number) => {
    const item = getPinnedIngredient(id);
    if (!item) return null;
    
    return (
        <View key={index} className="flex-1 min-w-[22%] bg-blue-50 p-6 rounded-3xl h-32 justify-center mr-4 last:mr-0">
           <Text className="text-gray-500 text-sm font-medium mb-1">{item.name}</Text>
           <View className="flex-row items-baseline">
              <Text className="text-3xl font-bold text-gray-900 mr-2">{item.current_stock}</Text>
              <Text className="text-gray-500 font-bold">{item.unit}</Text>
           </View>
        </View>
    );
  };

  const renderIngredientRow = ({ item }: { item: Ingredient }) => (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
       <View className="flex-row items-center flex-1">
          {/* Checkbox Placeholder */}
          <View className="w-5 h-5 rounded border border-gray-300 mr-4" />
          <Text className="font-bold text-gray-800 text-base">{item.name}</Text>
       </View>
       
       <View className="flex-1">
          <Text className="text-gray-500 capitalize">{item.type === 'main' ? 'Bahan Utama' : 'Bahan Support'}</Text>
       </View>

       <View className="flex-1">
          <Text className="text-gray-900 font-medium">{item.current_stock}</Text>
       </View>

       <View className="flex-1">
          <Text className="text-gray-500">Jan 4, 2024</Text>
       </View>

       <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push(`/kasir/StockOpname/add-stock/${item.id}`)} className="bg-indigo-50 p-2 rounded-lg">
             <Plus size={16} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/kasir/StockOpname/edit/${item.id}`)} className="p-2">
             <MoreVertical size={18} color="#9ca3af" />
          </TouchableOpacity>
       </View>
    </View>
  );

  return (
    <View className="flex-1 flex-row bg-gray-50">
       {/* 1. SIDEBAR NAVIGATION */}
       <KasirSidebar activeMenu="stock" />

       {/* 2. MAIN CONTENT AREA */}
       <View className="flex-1">
          <ScrollView contentContainerStyle={{ padding: 32 }}>
             
             {/* Header Title */}
             <View className="flex-row justify-between items-center mb-8">
                 <Text className="text-4xl font-bold text-gray-900">Stock Opname</Text>
                 <TouchableOpacity onPress={openSelectionModal} className="bg-gray-100 p-2 rounded-lg">
                     <Edit size={16} color="#4b5563" />
                 </TouchableOpacity>
             </View>

             {/* Summary Cards */}
             <View className="flex-row mb-8">
                {pinnedIds.map((id, index) => renderSummaryCard(id, index))}
                {pinnedIds.length < 4 && (
                    <TouchableOpacity onPress={openSelectionModal} className="flex-1 min-w-[22%] bg-gray-50 border-2 border-dashed border-gray-200 p-6 rounded-3xl h-32 justify-center items-center mr-4 last:mr-0">
                        <Text className="text-gray-400 font-medium">Add Summary</Text>
                    </TouchableOpacity>
                )}
             </View>

             {/* Table Section */}
             <View className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[500px]">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-gray-900">Stok Bahan</Text>
                    <TouchableOpacity 
                        onPress={() => router.push('/kasir/StockOpname/add')}
                        className="bg-indigo-600 px-5 py-3 rounded-xl flex-row items-center shadow-lg shadow-indigo-200"
                    >
                        <Plus size={20} color="white" className="mr-2" />
                        <Text className="text-white font-bold">Tambah</Text>
                    </TouchableOpacity>
                </View>

                {/* Table Header */}
                <View className="flex-row items-center py-4 border-b border-gray-200 mb-2">
                   <View className="flex-row items-center flex-1">
                      <View className="w-5 h-5 rounded border border-gray-300 mr-4" />
                      <Text className="text-gray-500 font-medium text-sm">Bahan</Text>
                   </View>
                   <View className="flex-1">
                      <Text className="text-gray-500 font-medium text-sm">Tipe Bahan</Text>
                   </View>
                   <View className="flex-1">
                      <Text className="text-gray-500 font-medium text-sm">Stok(kg/ltr/buah)</Text>
                   </View>
                   <View className="flex-1">
                      <Text className="text-gray-500 font-medium text-sm">Last updated</Text>
                   </View>
                   <View className="w-20">
                      <Text className="text-gray-500 font-medium text-sm"></Text>
                   </View>
                </View>

                {/* Table Content */}
                {loading ? (
                   <View className="py-20 items-center">
                      <ActivityIndicator size="large" color="#4f46e5" />
                   </View>
                ) : (
                   <View>
                      {ingredients.map(item => (
                         <View key={item.id}>{renderIngredientRow({ item })}</View>
                      ))}
                      {ingredients.length === 0 && (
                          <View className="py-20 items-center">
                              <Text className="text-gray-400">Belum ada data stok.</Text>
                          </View>
                      )}
                   </View>
                )}
             </View>
          </ScrollView>
       </View>

       {/* Selection Modal (Multi-select) */}
       <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
       >
          <View className="flex-1 bg-white p-6">
             <View className="flex-row justify-between items-center mb-2 mt-4">
                 <Text className="text-xl font-bold text-gray-900">Pilih Tampilan Summary</Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
                    <X size={24} color="#374151" />
                 </TouchableOpacity>
             </View>
             <Text className="text-gray-400 text-sm mb-6">Pilih maksimal 4 bahan untuk ditampilkan di halaman utama.</Text>
             
             <FlatList
                data={ingredients}
                keyExtractor={item => item.id}
                className="mb-20"
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item }) => {
                    const isSelected = tempSelectedIds.includes(item.id);
                    return (
                        <TouchableOpacity 
                           onPress={() => toggleSelection(item.id)}
                           className={`py-4 border-b border-gray-100 flex-row justify-between items-center px-2 ${isSelected ? 'bg-indigo-50 rounded-lg border-b-0 mb-1' : ''}`}
                        >
                           <View>
                               <Text className={`text-base font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>{item.name}</Text>
                               <Text className="text-sm text-gray-500">{item.current_stock} {item.unit}</Text>
                           </View>
                           {isSelected && <Check size={20} color="#4f46e5" />}
                        </TouchableOpacity>
                    );
                }}
             />

             <View className="absolute bottom-6 left-6 right-6">
                 <TouchableOpacity 
                    onPress={saveSelection}
                    className="bg-indigo-600 p-4 rounded-xl items-center shadow-md"
                 >
                     <Text className="text-white font-bold text-base">Simpan Pilihan ({tempSelectedIds.length})</Text>
                 </TouchableOpacity>
             </View>
          </View>
       </Modal>
    </View>
  );
}
