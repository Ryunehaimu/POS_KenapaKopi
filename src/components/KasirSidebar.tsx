import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  LayoutDashboard, 
  Package, 
  Tags,
  LogOut,
  Coffee,
  History,
  ShoppingCart,
  UserCheck
} from 'lucide-react-native';
import { authService } from '../services/authService';

interface KasirSidebarProps {
  activeMenu: 'dashboard' | 'categories' | 'stock' | 'menu' | 'transactions' | 'cashier' | 'attendance';
}

export default function KasirSidebar({ activeMenu }: KasirSidebarProps) {
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

  const menuItems = [
    { key: 'dashboard', icon: LayoutDashboard, path: '/kasir/Dashboard' },
    { key: 'cashier', icon: ShoppingCart, path: '/kasir/Cashier' },
    { key: 'transactions', icon: History, path: '/kasir/Transactions' },
    { key: 'menu', icon: Coffee, path: '/kasir/menu' },
    { key: 'stock', icon: Package, path: '/kasir/StockOpname' },
    { key: 'categories', icon: Tags, path: '/kasir/categories' },
    { key: 'attendance', icon: UserCheck, path: '/kasir/Attendance' },
  ];

  return (
    <View className="w-20 md:w-24 bg-white border-r border-gray-200 flex-col items-center py-8 justify-between">
      <View className="items-center space-y-8">
        {/* Menu Button Placeholder */}
        <TouchableOpacity className="p-2 rounded-xl hover:bg-gray-100 mb-2">
           <View className="w-6 h-0.5 bg-gray-800 mb-1"></View>
           <View className="w-6 h-0.5 bg-gray-800 mb-1"></View>
           <View className="w-6 h-0.5 bg-gray-800"></View>
        </TouchableOpacity>

        {menuItems.map((item) => {
           const isActive = activeMenu === item.key;
           return (
             <TouchableOpacity 
               key={item.key}
               onPress={() => item.path ? router.push(item.path as any) : null}
               className={`p-3 rounded-xl ${isActive ? 'bg-indigo-600 shadow-lg shadow-indigo-300' : 'opacity-50 hover:opacity-100'}`}
             >
               <item.icon color={isActive ? 'white' : '#4B5563'} size={24} />
             </TouchableOpacity>
           );
        })}
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
  );
}
