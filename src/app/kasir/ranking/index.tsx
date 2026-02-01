import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy, ArrowUp, ArrowDown } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';

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

export default function KasirRankingScreen() {
  const router = useRouter();

  const renderRankingItem = ({ item, index }: { item: typeof RANKING_DATA[0], index: number }) => {
    const isUp = item.change.includes('+');
    const isDown = item.change.includes('-');
    
    return (
      <View key={item.id} className="flex-row items-center justify-between py-5 border-b border-gray-100 px-4 hover:bg-gray-50">
        <View className="flex-row items-center space-x-6 flex-1">
          <View className="items-center justify-center w-10">
             {index < 3 ? (
                <Trophy size={28} color={index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#b45309'} />
             ) : (
                <Text className="text-gray-400 font-bold text-xl">#{index + 1}</Text>
             )}
          </View>
          
          <View className={`w-14 h-14 rounded-full ${item.color} items-center justify-center shadow-sm`}>
             <Text className="text-2xl">☕</Text>
          </View>
          
          <View>
            <Text className="font-bold text-gray-900 text-lg">{item.name}</Text>
            <Text className="text-gray-400 text-sm">{item.cat}</Text>
          </View>
        </View>

        <View className="items-end">
           <Text className="text-indigo-600 font-bold text-2xl">{item.count}</Text>
           <View className="flex-row items-center">
             {isUp && <ArrowUp size={14} color="#22c55e" />}
             {isDown && <ArrowDown size={14} color="#ef4444" />}
             <Text className={`text-xs ml-1 font-medium ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-gray-400'}`}>
               {item.change}
             </Text>
           </View>
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
                    <Text className="text-gray-400 mt-1">Laporan performa penjualan produk terbaik kamu.</Text>
                </View>
             </View>

             <View className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                <View className="flex-row justify-between items-center mb-8 px-2">
                    <View>
                        <Text className="text-xl font-bold text-gray-900">Performa Produk</Text>
                        <Text className="text-gray-400 text-xs mt-1">Berdasarkan jumlah transaksi hari ini</Text>
                    </View>
                </View>

                <View>
                   {RANKING_DATA.map((item, index) => renderRankingItem({ item, index }))}
                </View>
             </View>
          </ScrollView>
       </View>
    </View>
  );
}
