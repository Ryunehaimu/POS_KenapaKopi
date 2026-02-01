import React, { useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, FileText, UserCheck, LogOut, ChevronRight } from 'lucide-react-native';
import { authService } from '../../../services/authService';

// Import Assets (Assuming they are in assets folder)
// Note: In Expo/React Native, require is used for static assets.
// We will use require for these local images.

const MENU_ITEMS = [
  { name: "Stock Opname", icon: require("../../../../assets/Stock Opname.png") },
  { name: "Menu", icon: require("../../../../assets/Menu.png") },
  { name: "Kategori Menu", icon: require("../../../../assets/KategoriMenu.png") },
  { name: "Pengeluaran", icon: require("../../../../assets/Pengeluaran.png") },
  { name: "Pegawai", icon: require("../../../../assets/Pegawai.png") },
  { name: "Report", icon: require("../../../../assets/Report.png") },
];

export default function OwnerDashboard() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, [])
  );

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
    <View className="flex-1 bg-gray-50">
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
      >
      {/* 1. HEADER (Gradient Background) */}
      <LinearGradient
        colors={['#4c1d95', '#7c3aed']} // Dark purple to lighter purple
        className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg"
      >
        <Text className="text-white text-center text-xl font-bold mb-8">Owner Menu</Text>
        
        <Text className="text-white text-base font-medium mb-2">Summary</Text>
      </LinearGradient>

      {/* 2. SUMMARY CARDS (Overlapping Header) */}
      <View className="px-6 -mt-16">
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
             <Text className="text-blue-600 text-2xl font-bold">282</Text>
             <Text className="text-gray-400 text-xs">Transaksi Hari Ini</Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
             <Text className="text-indigo-600 text-2xl font-bold">Rp. 120.000</Text>
             <Text className="text-gray-400 text-xs">Pendapatan Hari ini</Text>
          </View>
        </View>

        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-white p-4 rounded-xl shadow-sm flex-row items-center gap-1">
             <Text className="text-indigo-600 text-2xl font-bold">18</Text>
             <Text className="text-gray-300 text-xl font-medium">/20</Text>
             <Text className="text-gray-400 text-xs ml-auto text-right w-16">Pegawai Masuk</Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
             <Text className="text-indigo-600 text-2xl font-bold">5</Text>
             <Text className="text-gray-400 text-xs">Pegawai Terlambat</Text>
          </View>
        </View>

        {/* 3. MENU GRID */}
        <Text className="text-gray-400 text-lg font-medium mb-4">Menu</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => {
                if (item.name === "Kategori Menu") {
                  router.push('/owner/categories');
                } else {
                  // Handle other items or show "Coming Soon"
                  console.log("Pressed:", item.name);
                }
              }}
              className="w-[30%] bg-white p-3 rounded-xl shadow-sm items-center justify-center space-y-2 aspect-square"
            >
               <Image source={item.icon} className="w-10 h-10 object-contain" />
               <Text className="text-[10px] font-medium text-center text-gray-800">{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. RANKING MENU (Simplified) */}
        <View className="bg-white rounded-3xl p-6 shadow-sm mt-8 mb-24">
             <View className="flex-row justify-between items-center mb-6">
                <Text className="text-lg font-bold text-gray-900">Ranking Menu</Text>
                <TouchableOpacity onPress={() => router.push('/owner/ranking')}>
                  <Text className="text-indigo-600 text-xs text-blue-500">Show all {'>'}</Text>
                </TouchableOpacity>
              </View>

               <View className="space-y-4">
                {[
                  { name: "Americano", cat: "Coffee", count: 15, color: "bg-gray-200" },
                  { name: "Butterscoth", cat: "Koppsu", count: 11, color: "bg-gray-200" },
                  { name: "Mocha", cat: "Koppsu", count: 9, color: "bg-gray-200" },
                  { name: "Matcha Latte", cat: "Non Coffe", count: 8, color: "bg-gray-200" },
                ].map((item, idx) => (
                  <View key={idx} className="flex-row items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <View className="flex-row items-center space-x-3">
                      <View className={`w-10 h-10 rounded-full ${item.color}`}></View>
                      <View>
                        <Text className="font-bold text-gray-900 text-sm">{item.name}</Text>
                        <Text className="text-gray-400 text-xs">{item.cat}</Text>
                      </View>
                    </View>
                    <Text className="text-red-500 font-bold text-lg">{item.count}</Text>
                  </View>
                ))}
              </View>
        </View>
      </View>
      </ScrollView>

      {/* 5. BOTTOM NAVIGATION */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex-row justify-around py-4 pb-6">
        <TouchableOpacity className="items-center">
           <Home color="#4f46e5" size={24} />
           <Text className="text-[10px] text-indigo-600 font-bold mt-1">Beranda</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
           <FileText color="#9ca3af" size={24} />
           <Text className="text-[10px] text-gray-400 font-medium mt-1">Log Bahan</Text>
        </TouchableOpacity>
         <TouchableOpacity className="items-center">
           <UserCheck color="#9ca3af" size={24} />
           <Text className="text-[10px] text-gray-400 font-medium mt-1">Absensi</Text>
        </TouchableOpacity>
         <TouchableOpacity className="items-center" onPress={handleLogout}>
           <LogOut color="#9ca3af" size={24} />
           <Text className="text-[10px] text-gray-400 font-medium mt-1">Keluar</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
