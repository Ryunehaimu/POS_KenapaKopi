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

import { orderService } from '../../../services/orderService';

export default function KasirDashboard() {
  const router = useRouter();
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // New State for Real Data
  const [dailyStats, setDailyStats] = useState<{
      total_revenue: number;
      total_transactions: number;
      cash_revenue: number;
      qris_revenue: number;
      menu_sales: {
          product_name: string;
          quantity_sold: number;
          total_revenue: number;
      }[];
  }>({
      total_revenue: 0,
      total_transactions: 0,
      cash_revenue: 0,
      qris_revenue: 0,
      menu_sales: []
  });

  const [monthlyStats, setMonthlyStats] = useState<{
    menu_sales: {
      product_name: string;
      quantity_sold: number;
      total_revenue: number;
    }[];
  }>({
    menu_sales: []
  });
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [ingData, statsData, monthlyData, lowStockData] = await Promise.all([
        inventoryService.getIngredients(),
        orderService.getDailyReport(now),
        orderService.getSalesReport(startOfMonth, now),
        inventoryService.getLowStockIngredients(5) // Threshold 5
      ]);

      setIngredients(ingData);
      setDailyStats(statsData);
      setMonthlyStats({ menu_sales: monthlyData.menu_sales });
      setLowStockItems(lowStockData);
      
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



  return (
    <View className="flex-1 flex-row bg-gray-50">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <KasirSidebar activeMenu="dashboard" />

      {/* 2. MAIN CONTENT AREA */}
      <View className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 32 }}>
          
          <Text className="text-4xl font-bold text-gray-900 mb-8">Dashboard</Text>

          {/* 3. METRICS CARDS (REAL DATA) */}
          <View className="flex-row gap-6 mb-8">
            <View className="flex-1 bg-sky-50 rounded-3xl p-6">
              <Text className="text-gray-500 text-sm font-medium mb-4">Pendapatan Transaksi Hari Ini</Text>
              <View className="flex-row justify-between items-end">
                <Text className="text-4xl font-bold text-gray-900">Rp {dailyStats.total_revenue.toLocaleString()}</Text>
                <View className="flex-row items-center space-x-1">
                  {/* Trend is hardcoded for now as we don't have yesterday's data yet */}
                  <Text className="text-xs font-bold text-gray-900">Today</Text> 
                  <TrendingUp color="black" size={14} />
                </View>
              </View>
              <View className="flex-row mt-2 gap-2">
                  <Text className="text-xs text-gray-500">Tunai: Rp {dailyStats.cash_revenue.toLocaleString()}</Text>
                  <Text className="text-xs text-gray-500">QRIS: Rp {dailyStats.qris_revenue.toLocaleString()}</Text>
              </View>
            </View>

            <View className="flex-1 bg-gray-100 rounded-3xl p-6">
              <Text className="text-gray-500 text-sm font-medium mb-4">Total Menu Terjual</Text>
              <View className="flex-row justify-between items-end">
                <Text className="text-4xl font-bold text-gray-900">
                    {dailyStats.menu_sales.reduce((acc, curr) => acc + curr.quantity_sold, 0)}
                </Text>
              </View>
            </View>

            <View className="flex-1 bg-sky-50 rounded-3xl p-6">
              <Text className="text-gray-500 text-sm font-medium mb-4">Total Transaksi</Text>
              <View className="flex-row justify-between items-end">
                <Text className="text-4xl font-bold text-gray-900">{dailyStats.total_transactions}</Text>
              </View>
            </View>
          </View>

          {/* LOW STOCK ALERT SECTION */}
          {lowStockItems.length > 0 && (
              <View className="bg-red-50 rounded-3xl p-6 border border-red-100 mb-8">
                  <View className="flex-row items-center mb-4">
                      <View className="bg-red-100 p-2 rounded-full mr-3">
                        <TrendingDown color="#EF4444" size={20} />
                      </View>
                      <Text className="text-xl font-bold text-red-900">Peringatan: Stok Menipis!</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                      {lowStockItems.map(item => (
                          <View key={item.id} className="bg-white px-4 py-2 rounded-lg border border-red-100 flex-row items-center shadow-sm">
                              <Text className="font-bold text-gray-800 mr-2">{item.name}</Text>
                              <Text className="text-red-500 font-bold">{item.current_stock} {item.unit}</Text>
                          </View>
                      ))}
                  </View>
              </View>
          )}

          {/* 4. BOTTOM SECTION: RANKING & STOCK */}
          <View className="flex-row gap-6">
            
            {/* Ranking Menu (REAL DATA) */}
            <View className="flex-[2] bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-900">Menu Terlaris Bulan Ini</Text>
                <TouchableOpacity onPress={() => router.push('/kasir/ranking')}>
                  <Text className="text-indigo-600 text-xs">Show all {'>'}</Text>
                </TouchableOpacity>
              </View>

              <View className="space-y-6">
                {monthlyStats.menu_sales.slice(0, 4).map((item, idx) => (
                  <View key={idx} className="flex-row items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <View className="flex-row items-center space-x-4">
                      <View className={`w-12 h-12 rounded-full bg-indigo-100 items-center justify-center`}>
                          <Text className="font-bold text-indigo-600">{idx + 1}</Text>
                      </View>
                      <View>
                        <Text className="font-bold text-gray-900 text-lg">{item.product_name}</Text>
                        <Text className="text-gray-400 text-sm">Rp {item.total_revenue.toLocaleString()}</Text>
                      </View>
                    </View>
                    <Text className="text-indigo-600 font-bold text-xl">{item.quantity_sold} Sold</Text>
                  </View>
                ))}
                {monthlyStats.menu_sales.length === 0 && (
                    <Text className="text-gray-400 text-center py-4">Belum ada penjualan bulan ini.</Text>
                )}
              </View>
            </View>

            {/* Stock / Ingredient Widget (Monitor Pilihan) */}
            <View className="flex-1 bg-blue-50 rounded-3xl p-6 relative overflow-hidden">
               {/* ... (Keep existing Pinned Monitor logic) ... */}
               <TouchableOpacity 
                 onPress={openModal}
                 className="absolute top-4 right-4 bg-indigo-500 p-2 rounded-lg z-10"
               >
                 <Edit2 color="white" size={16} />
               </TouchableOpacity>
               
               <Text className="font-bold text-indigo-900 mb-4 text-lg">Monitor Pilihan</Text>

               <View className="flex-row gap-4">
                  {selectedWidgetIds.map((id: string) => {
                    const item = ingredients.find((i: Ingredient) => i.id === id);
                    if (!item) return null;
                    
                    const isLow = item.current_stock < 5; // Threshold 5

                    return (
                      <View key={id} className="flex-1 bg-white rounded-2xl p-4 shadow-sm items-center justify-between h-32">
                          <Text className="text-gray-500 font-bold text-sm text-center" numberOfLines={1}>
                              {item.name}
                          </Text>
                          
                          <View className="items-center">
                              <Text className="text-3xl font-bold text-gray-900">{item.current_stock}</Text>
                              <Text className="text-xs text-gray-400 font-medium lowercase">{item.unit}</Text>
                          </View>

                          <View className={`px-3 py-1 rounded-full ${isLow ? 'bg-red-100' : 'bg-green-100'}`}>
                              <Text className={`text-xs font-bold ${isLow ? 'text-red-600' : 'text-green-700'}`}>
                                  {isLow ? 'Menipis' : 'Aman'}
                              </Text>
                          </View>
                      </View>
                    );
                  })}
                  {selectedWidgetIds.length === 0 && (
                    <View className="flex-1 items-center justify-center py-8">
                      <Text className="text-gray-400 italic text-center">Belum ada item dipilih</Text>
                    </View>
                  )}
               </View>
            </View>

          </View>

        </ScrollView>
      </View>

      {/* Selection Modal (Use existing code) */}
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

