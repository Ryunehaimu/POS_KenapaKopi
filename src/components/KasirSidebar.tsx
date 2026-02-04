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
  UserCheck,
  Printer
} from 'lucide-react-native';
import { authService } from '../services/authService';

interface KasirSidebarProps {
  activeMenu: 'dashboard' | 'categories' | 'stock' | 'menu' | 'transactions' | 'cashier' | 'attendance' | 'printerSettings';
}

export default function KasirSidebar({ activeMenu }: KasirSidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = React.useState(false);

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
    { key: 'dashboard', icon: LayoutDashboard, path: '/kasir/Dashboard', label: 'Dashboard' },
    { key: 'cashier', icon: ShoppingCart, path: '/kasir/Cashier', label: 'Kasir / POS' },
    { key: 'transactions', icon: History, path: '/kasir/Transactions', label: 'Laporan Transaksi' },
    { key: 'menu', icon: Coffee, path: '/kasir/menu', label: 'Manajemen Menu' },
    { key: 'stock', icon: Package, path: '/kasir/StockOpname', label: 'Stok Opname' },
    { key: 'categories', icon: Tags, path: '/kasir/categories', label: 'Kategori' },
    { key: 'attendance', icon: UserCheck, path: '/kasir/Attendance', label: 'Absensi' },
    { key: 'printerSettings', icon: Printer, path: '/kasir/PrinterSettings', label: 'Pengaturan Printer' },
  ];

  return (
    <View className={`bg-white border-r border-gray-200 flex-col py-11 justify-between ${isExpanded ? 'w-64 px-4' : 'w-20 items-center'}`}>
      <View className="space-y-6">
        {/* Toggle Button */}
        <TouchableOpacity 
            onPress={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-xl hover:bg-gray-100 mb-2 ${isExpanded ? 'self-end' : 'self-center'}`}
        >
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
               className={`flex-row items-center rounded-xl ${
                   isExpanded 
                    ? 'px-4 my-1 py-3 space-x-3 w-full' 
                    : 'p-3 my-1 justify-center aspect-square'
               } ${isActive ? 'bg-indigo-600 shadow-md shadow-indigo-200' : 'hover:bg-gray-50'}`}
             >
               <item.icon color={isActive ? 'white' : '#4B5563'} size={24} />
               {isExpanded && (
                   <Text className={`font-bold ml-3 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                       {item.label}
                   </Text>
               )}
             </TouchableOpacity>
           );
        })}
      </View>

      <View className={`space-y-6 ${isExpanded ? 'px-4' : 'items-center'}`}>
         {isExpanded ? (
             <View className="flex-row items-center space-x-3 my-5">
                 <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center">
                    <Text className="text-white font-bold">K</Text>
                 </View>
                 <View>
                     <Text className="font-bold text-gray-900">Kasir</Text>
                     <Text className="text-xs text-gray-500">Active</Text>
                 </View>
             </View>
         ) : (
             <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center my-5">
                <Text className="text-white font-bold">K</Text>
             </View>
         )}

         {isExpanded ? (
             <TouchableOpacity onPress={handleLogout} className="flex-row items-center space-x-3 p-2 rounded-lg hover:bg-red-50">
                <LogOut color="#EF4444" size={20} />
                <Text className="text-red-500 font-bold ml-3">Keluar</Text>
             </TouchableOpacity>
         ) : (
             <TouchableOpacity onPress={handleLogout}>
               <LogOut color="#EF4444" size={20} />
             </TouchableOpacity>
         )}
      </View>
    </View>
  );
}
