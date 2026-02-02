import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Trophy, ArrowUp, ArrowDown } from 'lucide-react-native';
import OwnerBottomNav from '../../../components/OwnerBottomNav';
import { orderService } from '../../../services/orderService';

export default function RankingScreen() {
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

  const renderItem = ({ item, index }: { item: typeof rankingData[0], index: number }) => {
    return (
      <View className="flex-row items-center justify-between py-4 border-b border-gray-50 bg-white px-4 rounded-xl mb-3 shadow-sm">
        <View className="flex-row items-center space-x-4 flex-1">
          <View className="items-center justify-center w-8">
            {index < 3 ? (
              <Trophy size={24} color={index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#b45309'} />
            ) : (
              <Text className="text-gray-400 font-bold text-lg">#{index + 1}</Text>
            )}
          </View>

          <View className={`w-12 h-12 rounded-full bg-indigo-50 items-center justify-center`}>
            <Text className="text-xl">☕</Text>
          </View>

          <View>
            <Text className="font-bold text-gray-900 text-base">{item.product_name}</Text>
            <Text className="text-gray-400 text-xs">{item.category || 'Uncategorized'}</Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-indigo-600 font-bold text-xl">{item.quantity_sold}</Text>
          <Text className="text-[10px] text-gray-400">Terjual</Text>
        </View>
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
          <Text className="text-xl font-bold text-gray-900">Ranking Menu</Text>
          <View className="w-8" />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={rankingData}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-center text-gray-400 mt-10">Belum ada data penjualan bulan ini.</Text>
          }
        />
      )}
      <OwnerBottomNav />
    </View>
  );
}
