import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy, ArrowUp, ArrowDown } from 'lucide-react-native';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

const RANKING_DATA = [
  { id: '1', name: "Americano", cat: "Coffee", count: 154, color: "bg-amber-100", change: "+12%" },
  { id: '2', name: "Butterscoth", cat: "Koppsu", count: 120, color: "bg-orange-100", change: "+5%" },
  { id: '3', name: "Mocha", cat: "Koppsu", count: 98, color: "bg-brown-100", change: "-2%" },
  { id: '4', name: "Matcha Latte", cat: "Non Coffee", count: 85, color: "bg-green-100", change: "+8%" },
  { id: '5', name: "Caramel Latte", cat: "Coffee", count: 76, color: "bg-amber-100", change: "+4%" },
  { id: '6', name: "Chocolate", cat: "Non Coffee", count: 64, color: "bg-brown-100", change: "-1%" },
  { id: '7', name: "Red Velvet", cat: "Non Coffee", count: 52, color: "bg-red-100", change: "+3%" },
  { id: '8', name: "V60 Manual Brew", cat: "Manual Brew", count: 48, color: "bg-stone-100", change: "+15%" },
  { id: '9', name: "Vietnam Drip", cat: "Manual Brew", count: 41, color: "bg-stone-100", change: "0%" },
  { id: '10', name: "Lemon Tea", cat: "Tea", count: 35, color: "bg-yellow-100", change: "-5%" },
];

export default function RankingScreen() {
  const router = useRouter();

  const renderItem = ({ item, index }: { item: typeof RANKING_DATA[0], index: number }) => {
    const isUp = item.change.includes('+');
    const isDown = item.change.includes('-');

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

          <View className={`w-12 h-12 rounded-full ${item.color} items-center justify-center`}>
            <Text className="text-xl">☕</Text>
          </View>

          <View>
            <Text className="font-bold text-gray-900 text-base">{item.name}</Text>
            <Text className="text-gray-400 text-xs">{item.cat}</Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-indigo-600 font-bold text-xl">{item.count}</Text>
          <View className="flex-row items-center">
            {isUp && <ArrowUp size={12} color="#22c55e" />}
            {isDown && <ArrowDown size={12} color="#ef4444" />}
            <Text className={`text-[10px] ml-1 ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-gray-400'}`}>
              {item.change}
            </Text>
          </View>
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

      <FlatList
        data={RANKING_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
      <OwnerBottomNav />
    </View>
  );
}
