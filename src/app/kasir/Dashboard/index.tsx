import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { 
  TrendingUp, 
  TrendingDown, 
  Edit2,
  X,
  Check
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KasirSidebar from '../../../components/KasirSidebar';
import { inventoryService, Ingredient } from '../../../services/inventoryService';

const WIDGET_STORAGE_KEY = 'DASHBOARD_WIDGET_IDS_KASIR';

export default function KasirDashboard() {
  const router = useRouter();
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const ingData = await inventoryService.getIngredients();
      setIngredients(ingData);
      
      const stored = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      if (stored) {
        setSelectedWidgetIds(JSON.parse(stored));
      } else {
        const defaults = ingData.slice(0, 3).map(i => i.id);
        setSelectedWidgetIds(defaults);
        await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(defaults));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      loadData();
    }, [])
  );

  const openModal = () => {
    setTempSelectedIds([...selectedWidgetIds]);
    setModalVisible(true);
  };

  const toggleSelection = (id: string) => {
    if (tempSelectedIds.includes(id)) {
      setTempSelectedIds(tempSelectedIds.filter((tid: string) => tid !== id));
    } else {
      if (tempSelectedIds.length >= 3) {
        Alert.alert("Batas Maksimal", "Pilih maksimal 3 bahan untuk widget.");
        return;
      }
      setTempSelectedIds([...tempSelectedIds, id]);
    }
  };

  const saveWidgetSelection = async () => {
    setSelectedWidgetIds(tempSelectedIds);
    setModalVisible(false);
    await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(tempSelectedIds));
  };

  const getPercentage = (item: Ingredient) => {
    // Perbaikan: Jika item.current_stock adalah string, parseFloat dulu.
    const current = typeof item.current_stock === 'number' ? item.current_stock : parseFloat(item.current_stock);
    // Kita anggap 100 sebagai "penuh" untuk progress bar.
    const max = 100; 
    return Math.min((current / max) * 100, 100);
  };

  const getBarColor = (index: number) => {
    const colors = ['bg-yellow-500', 'bg-pink-500', 'bg-blue-500'];
    return colors[index % colors.length];
  };

  return (
    <View className="flex-1 flex-row bg-gray-50">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <KasirSidebar activeMenu="dashboard" />

      {/* 2. MAIN CONTENT AREA */}
      <View className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 32 }}>
          
          <Text className="text-4xl font-bold text-gray-900 mb-8">Dashboard</Text>

          {/* 3. METRICS CARDS */}
          {/* ... (Metrics cards remains same) */}
          <View className="flex-row gap-6 mb-8">
            <View className="flex-1 bg-sky-50 rounded-3xl p-6">
              <Text className="text-gray-500 text-sm font-medium mb-4">Pendapatan Transaksi Hari Ini</Text>
              <View className="flex-row justify-between items-end">
                <Text className="text-4xl font-bold text-gray-900">7,265</Text>
                <View className="flex-row items-center space-x-1">
                  <Text className="text-xs font-bold text-gray-900">+11.02%</Text>
                  <TrendingUp color="black" size={14} />
                </View>
              </View>
            </View>

            <View className="flex-1 bg-gray-100 rounded-3xl p-6">
              <Text className="text-gray-500 text-sm font-medium mb-4">Total menu terjual hari ini</Text>
              <View className="flex-row justify-between items-end">
                <Text className="text-4xl font-bold text-gray-900">3,671</Text>
                <View className="flex-row items-center space-x-1">
                  <Text className="text-xs font-bold text-gray-500">-0.03%</Text>
                  <TrendingDown color="gray" size={14} />
                </View>
              </View>
            </View>

            <View className="flex-1 bg-sky-50 rounded-3xl p-6">
              <Text className="text-gray-500 text-sm font-medium mb-4">Total transaksi hari ini</Text>
              <View className="flex-row justify-between items-end">
                <Text className="text-4xl font-bold text-gray-900">156</Text>
                <View className="flex-row items-center space-x-1">
                  <Text className="text-xs font-bold text-gray-900">+15.03%</Text>
                  <TrendingUp color="black" size={14} />
                </View>
              </View>
            </View>
          </View>

          {/* 4. BOTTOM SECTION: RANKING & STOCK */}
          <View className="flex-row gap-6">
            
            {/* Ranking Menu */}
            <View className="flex-[2] bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-900">Ranking Menu</Text>
                <TouchableOpacity onPress={() => router.push('/kasir/ranking')}>
                  <Text className="text-indigo-600 text-xs text-blue-500">Show all {'>'}</Text>
                </TouchableOpacity>
              </View>

              <View className="space-y-6">
                {[
                  { name: "Americano", cat: "Coffee", count: 15, color: "bg-gray-200" },
                  { name: "Butterscotch", cat: "Koppsus", count: 11, color: "bg-gray-200" },
                  { name: "Mocha", cat: "Koppsus", count: 9, color: "bg-gray-200" },
                  { name: "Matcha Latte", cat: "Non Coffee", count: 8, color: "bg-gray-200" },
                ].map((item, idx) => (
                  <View key={idx} className="flex-row items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <View className="flex-row items-center space-x-4">
                      <View className={`w-12 h-12 rounded-full ${item.color}`}></View>
                      <View>
                        <Text className="font-bold text-gray-900 text-lg">{item.name}</Text>
                        <Text className="text-gray-400 text-sm">{item.cat}</Text>
                      </View>
                    </View>
                    <Text className="text-red-500 font-bold text-xl">{item.count}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Stock / Ingredient Widget */}
            <View className="flex-1 bg-blue-50 rounded-3xl p-6 relative overflow-hidden">
               <TouchableOpacity 
                 onPress={openModal}
                 className="absolute top-4 right-4 bg-indigo-500 p-2 rounded-lg z-10"
               >
                 <Edit2 color="white" size={16} />
               </TouchableOpacity>

               <View className="mt-8 space-y-8">
                  {selectedWidgetIds.map((id: string, index: number) => {
                    const item = ingredients.find((i: Ingredient) => i.id === id);
                    if (!item) return null;
                    const percentage = getPercentage(item);
                    return (
                      <View key={id}>
                        <Text className="font-bold text-gray-900 mb-2">{item.name}</Text>
                        <View className="h-3 bg-white rounded-full w-full overflow-hidden">
                          <View 
                            className={`h-full ${getBarColor(index)} rounded-full`}
                            style={{ width: `${percentage}%` }}
                          />
                        </View>
                      </View>
                    );
                  })}
                  {selectedWidgetIds.length === 0 && (
                    <View className="items-center py-10">
                      <Text className="text-gray-400 italic">No ingredients selected</Text>
                    </View>
                  )}
               </View>
            </View>

          </View>

        </ScrollView>
      </View>

      {/* Selection Modal */}
      <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
       >
          <View className="flex-1 bg-white p-6">
             <View className="flex-row justify-between items-center mb-2 mt-4">
                  <Text className="text-xl font-bold text-gray-900">Pilih Monitor Stok</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
                     <X size={24} color="#374151" />
                  </TouchableOpacity>
             </View>
             <Text className="text-gray-400 text-sm mb-6">Pilih maksimal 3 bahan untuk dipantau di dashboard.</Text>
             
             <FlatList
                data={ingredients}
                keyExtractor={(item: Ingredient) => item.id}
                className="mb-20"
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item }: { item: Ingredient }) => {
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
                    onPress={saveWidgetSelection}
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

