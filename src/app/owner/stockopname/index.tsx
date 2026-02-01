import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, FlatList, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, ChevronLeft, MoreVertical, Edit, X, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { inventoryService, Ingredient, StockLog } from '../../../services/inventoryService';

const PINNED_STORAGE_KEY = 'STOCK_OPNAME_PINNED_IDS_V2';

export default function StockOpnameScreen() {
  const router = useRouter();
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
          const stored = await AsyncStorage.getItem(PINNED_STORAGE_KEY);
          if (stored) {
              setPinnedIds(JSON.parse(stored));
          } else {
              // Default to first 4
              const defaults = allIngredients.slice(0, 4).map(i => i.id);
              setPinnedIds(defaults);
              await AsyncStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(defaults));
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
          await AsyncStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(tempSelectedIds));
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

  const renderIngredientRow = ({ item }: { item: Ingredient }) => (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
       <View className="flex-1">
          <Text className="font-bold text-gray-800 text-base">{item.name}</Text>
          <Text className="text-xs text-gray-400 capitalize">{item.type}</Text>
       </View>
       <View className="flex-row items-center gap-4">
          <Text className="font-bold text-gray-800 text-base mr-2">{item.current_stock} {item.unit}</Text>
          <TouchableOpacity onPress={() => router.push(`/owner/stockopname/add-stock/${item.id}`)}>
             <View className="bg-indigo-50 p-2 rounded-lg">
                <Plus size={16} color="#4f46e5" />
             </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/owner/stockopname/edit/${item.id}`)}>
             <MoreVertical size={20} color="#9ca3af" />
          </TouchableOpacity>
       </View>
    </View>
  );

  const renderSummaryCard = (id: string, index: number) => {
    const item = getPinnedIngredient(id);
    if (!item) return null;
    
    return (
        <View key={index} className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4 min-h-[90px]">
           <View className="flex-1 justify-between">
              <View>
                  <View className="flex-row items-baseline mb-1 flex-wrap">
                     <Text className="text-indigo-600 text-2xl font-bold mr-1">{item.current_stock}</Text>
                     <Text className="text-gray-400 text-xs">{item.unit}</Text>
                  </View>
                  <Text className="text-gray-500 text-xs font-medium pr-1" numberOfLines={2}>{item.name}</Text>
              </View>
           </View>
        </View>
    );
  };

  const renderLog = ({ item }: { item: StockLog }) => (
      <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
          <View>
              <Text className="font-bold text-gray-800">{item.ingredients?.name}</Text>
              <Text className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
              </Text>
          </View>
          <View className="items-end">
              <Text className="text-green-600 font-bold">+{item.change_amount} {item.ingredients?.unit}</Text>
              <Text className="text-xs text-gray-400">@ Rp {item.price.toLocaleString()}</Text>
          </View>
      </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
       
       <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* 1. Header with Gradient */}
          <LinearGradient
            colors={['#4c1d95', '#7c3aed']} 
            className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg"
          >
             <TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-6 z-20">
                <ChevronLeft size={24} color="white" />
             </TouchableOpacity>
             <Text className="text-white text-center text-xl font-bold mb-4">Stock Opname</Text>
             
             <View className="flex-row items-center mb-1">
                 <Text className="text-white text-base font-medium opacity-90 mr-2">Summary</Text>
                 <TouchableOpacity onPress={openSelectionModal} className="bg-white/20 p-1.5 rounded-full">
                     <Edit size={12} color="white" />
                 </TouchableOpacity>
             </View>
          </LinearGradient>

          <View className="px-6 -mt-20">
              {/* 2. Summary Cards Grid (Dynamic) */}
              <View className="flex-row flex-wrap justify-between mb-8">
                  {pinnedIds.map((id, index) => renderSummaryCard(id, index))}
                  {pinnedIds.length === 0 && (
                      <TouchableOpacity onPress={openSelectionModal} className="w-full bg-white p-6 rounded-xl shadow-sm items-center justify-center">
                          <Text className="text-gray-500 font-medium">Pilih Bahan Ringkasan</Text>
                      </TouchableOpacity>
                  )}
              </View>

              {/* 3. Stok Bahan List Table */}
              <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-gray-900">Stok Bahan</Text>
                    <TouchableOpacity 
                        onPress={() => router.push('/owner/stockopname/add')}
                        className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center"
                    >
                        <Plus size={16} color="white" className="mr-1" />
                        <Text className="text-white font-medium text-xs">Tambah</Text>
                    </TouchableOpacity>
                </View>
                
                {loading ? <ActivityIndicator color="#4f46e5" /> : (
                    <View>
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-xs text-gray-400 font-medium">Bahan</Text>
                            <Text className="text-xs text-gray-400 font-medium mr-12">Stok (kg/ltr/buah)</Text>
                        </View>
                        {ingredients.map(item => (
                            <View key={item.id}>{renderIngredientRow({item})}</View>
                        ))}
                    </View>
                )}
              </View>

              {/* 4. Logs */}
              <View className="bg-white rounded-2xl p-6 shadow-sm">
                  <Text className="text-lg font-bold text-gray-900 mb-4">Log Riwayat Stok</Text>
                  {loading ? <ActivityIndicator color="#4f46e5" /> : (
                      <View>
                          {logs.map(item => (
                              <View key={item.id}>{renderLog({item})}</View>
                          ))}
                          {logs.length === 0 && <Text className="text-gray-400 text-center py-4">Belum ada riwayat</Text>}
                      </View>
                  )}
              </View>
          </View>
       </ScrollView>

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
