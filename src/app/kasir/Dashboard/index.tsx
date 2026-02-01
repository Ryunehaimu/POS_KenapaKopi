import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { authService } from '../../../services/authService';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Settings, 
  LogOut, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Edit2
} from 'lucide-react-native';

export default function KasirDashboard() {
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, [])
  );

  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Keluar", 
          style: "destructive",
          onPress: async () => {
            await authService.signOut();
            router.replace('/auth');
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 flex-row bg-gray-50">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <View className="w-20 md:w-24 bg-white border-r border-gray-200 flex-col items-center py-8 justify-between">
        <View className="items-center space-y-8">
          {/* Menu Button */}
          <TouchableOpacity className="p-2 rounded-xl hover:bg-gray-100">
             <View className="w-6 h-0.5 bg-gray-800 mb-1"></View>
             <View className="w-6 h-0.5 bg-gray-800 mb-1"></View>
             <View className="w-6 h-0.5 bg-gray-800"></View>
          </TouchableOpacity>

          {/* Active Tab: Dashboard */}
          <TouchableOpacity className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-300">
            <LayoutDashboard color="white" size={24} />
          </TouchableOpacity>
          
          <TouchableOpacity className="p-3 opacity-50 hover:opacity-100">
            <Package color="#4B5563" size={24} />
          </TouchableOpacity>

          <TouchableOpacity className="p-3 opacity-50 hover:opacity-100">
            <ShoppingBag color="#4B5563" size={24} />
          </TouchableOpacity>

          <TouchableOpacity className="p-3 opacity-50 hover:opacity-100">
            <Settings color="#4B5563" size={24} />
          </TouchableOpacity>
          
          <TouchableOpacity className="p-3 opacity-50 hover:opacity-100">
            <Calendar color="#4B5563" size={24} />
          </TouchableOpacity>
        </View>

        <View className="items-center space-y-6">
           <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center">
              <Text className="text-white font-bold">K</Text>
           </View>
           <Text className="text-xs font-medium text-gray-500">Kasir</Text>
           <TouchableOpacity onPress={handleLogout}>
             <LogOut color="#EF4444" size={20} />
           </TouchableOpacity>
        </View>
      </View>

      {/* 2. MAIN CONTENT AREA */}
      <View className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 32 }}>
          
          <Text className="text-4xl font-bold text-gray-900 mb-8">Dashboard</Text>

          {/* 3. METRICS CARDS */}
          <View className="flex-row gap-6 mb-8">
            {/* Card 1: Pendapatan */}
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

            {/* Card 2: Menu Terjual */}
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

            {/* Card 3: Total Transaksi */}
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
                <TouchableOpacity>
                  <Text className="text-indigo-600 font-medium">Show all {'>'}</Text>
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
               <View className="absolute top-4 right-4 bg-indigo-500 p-2 rounded-lg">
                 <Edit2 color="white" size={16} />
               </View>

               <View className="mt-8 space-y-8">
                 <View>
                   <Text className="font-bold text-gray-900 mb-2">Arabika Beans</Text>
                   <View className="h-3 bg-white rounded-full w-full overflow-hidden">
                     <View className="h-full bg-yellow-500 w-[40%] rounded-full"></View>
                   </View>
                 </View>

                 <View>
                   <Text className="font-bold text-gray-900 mb-2">Robusta Beans</Text>
                   <View className="h-3 bg-white rounded-full w-full overflow-hidden">
                     <View className="h-full bg-pink-500 w-[30%] rounded-full"></View>
                   </View>
                 </View>

                 <View>
                   <Text className="font-bold text-gray-900 mb-2">Caramel Syrup</Text>
                   <View className="h-3 bg-white rounded-full w-full overflow-hidden">
                     <View className="h-full bg-blue-500 w-[60%] rounded-full"></View>
                   </View>
                 </View>
               </View>
            </View>

          </View>

        </ScrollView>
      </View>
    </View>
  );
}
