import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Trophy, ArrowUp, ArrowDown } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';
import { orderService } from '../../../services/orderService';

export default function KasirRankingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState<{
      product_name: string;
      category: string;
      quantity_sold: number;
      total_revenue: number;
  }[]>([]);

  const loadData = async () => {
    try {
        setLoading(true);
        // Default to This Month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const data = await orderService.getProductRankings(startOfMonth, endOfMonth);
        setRankingData(data);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        loadData();
    }, [])
  );

  const renderRankingItem = ({ item, index }: { item: typeof rankingData[0], index: number }) => {
    return (
      <View key={index} className="flex-row items-center justify-between py-5 border-b border-gray-100 px-4 hover:bg-gray-50">
        <View className="flex-row items-center space-x-6 flex-1">
          <View className="items-center justify-center w-10">
             {index < 3 ? (
                <Trophy size={28} color={index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#b45309'} />
             ) : (
                <Text className="text-gray-400 font-bold text-xl">#{index + 1}</Text>
             )}
          </View>
          
          <View className={`w-14 h-14 rounded-full bg-indigo-50 items-center justify-center shadow-sm`}>
             <Text className="text-2xl">☕</Text>
          </View>
          
          <View>
            <Text className="font-bold text-gray-900 text-lg">{item.product_name}</Text>
            <Text className="text-gray-400 text-sm">{item.category || 'Uncategorized'}</Text>
          </View>
        </View>

        <View className="items-end">
           <Text className="text-indigo-600 font-bold text-2xl">{item.quantity_sold}</Text>
           <Text className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Terjual</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 flex-row bg-gray-50">
       <KasirSidebar activeMenu="dashboard" />

       <View className="flex-1">
          <ScrollView contentContainerStyle={{ padding: 40 }}>
             <View className="flex-row items-center mb-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-white rounded-full shadow-sm">
                   <ChevronLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <View>
                    <Text className="text-4xl font-bold text-gray-900">Ranking Menu</Text>
                    <Text className="text-gray-400 mt-1">Laporan produk terlaris bulan ini.</Text>
                </View>
             </View>

             <View className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 min-h-[500px]">
                <View className="flex-row justify-between items-center mb-8 px-2">
                    <View>
                        <Text className="text-xl font-bold text-gray-900">Performa Produk</Text>
                        <Text className="text-gray-400 text-xs mt-1">Berdasarkan total penjualan bulan ini</Text>
                    </View>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#4f46e5" />
                    </View>
                ) : (
                    <View>
                        {rankingData.length > 0 ? (
                            rankingData.map((item, index) => renderRankingItem({ item, index }))
                        ) : (
                            <Text className="text-center text-gray-400 py-10">
                                Belum ada data penjualan bulan ini.
                            </Text>
                        )}
                    </View>
                )}
             </View>
          </ScrollView>
       </View>
    </View>
  );
}
