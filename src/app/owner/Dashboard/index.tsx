import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, FileText, UserCheck, LogOut, ChevronRight } from 'lucide-react-native';
import { authService } from '../../../services/authService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';
import { orderService } from '../../../services/orderService';
import { attendanceService } from '../../../services/attendanceService';

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
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'captain'>('owner');

  // Daily Stats State
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

  // Monthly Revenue State
  const [monthlyStats, setMonthlyStats] = useState<{
    total_revenue: number;
    cash_revenue: number;
    qris_revenue: number;
    menu_sales: {
      product_name: string;
      quantity_sold: number;
      total_revenue: number;
    }[];
  }>({
    total_revenue: 0,
    cash_revenue: 0,
    qris_revenue: 0,
    menu_sales: []
  });

  // Attendance State
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0); // Optional: to show /Total

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 0. Check User Role
      const { session } = await authService.getSession();
      const email = session?.user?.email || "";
      const isCaptain = email.toLowerCase().startsWith("captain");
      setUserRole(isCaptain ? 'captain' : 'owner');

      const now = new Date();

      // 1. Daily One-Time Data
      const statsData = await orderService.getDailyReport(now);
      setDailyStats(statsData);

      // 2. Monthly Revenue
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // orderService.getSalesReport handles date formatting internally now
      const monthlyData = await orderService.getSalesReport(startOfMonth, now);
      setMonthlyStats({
        total_revenue: monthlyData.total_revenue,
        cash_revenue: monthlyData.cash_revenue,
        qris_revenue: monthlyData.qris_revenue,
        menu_sales: monthlyData.menu_sales
      });

      // 3. Attendance Data
      const presentCount = await attendanceService.getDailyAttendanceCount();
      const allEmployees = await attendanceService.getEmployees();

      setAttendanceCount(presentCount);
      setTotalEmployees(allEmployees.length);

    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      loadData();
    }, [])
  );



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
            {/* Card 1: Transaksi Hari Ini */}
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
              <Text className="text-blue-600 text-2xl font-bold">{dailyStats.total_transactions}</Text>
              <Text className="text-gray-400 text-xs">Transaksi Hari Ini</Text>
            </View>

            {/* Card 2: Pendapatan Hari Ini (HIDDEN FOR CAPTAIN) */}
            {userRole === 'owner' ? (
              <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                <Text className="text-indigo-600 text-xl font-bold">
                  Rp. {dailyStats.total_revenue.toLocaleString('id-ID')}
                </Text>
                <View className="mt-2 space-y-1">
                  <Text className="text-[10px] text-gray-500">
                    Tunai: Rp {dailyStats.cash_revenue.toLocaleString('id-ID')}
                  </Text>
                  <Text className="text-[10px] text-gray-500">
                    QRIS : Rp {dailyStats.qris_revenue.toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs mt-2 font-medium">Pendapatan Hari ini</Text>
              </View>
            ) : (
               <View className="flex-1 p-4 rounded-xl justify-center items-center border-2 border-dashed border-gray-300/50">
                  <Text className="text-gray-100 font-bold text-xs text-center opacity-80">Pendapatan Hidden</Text>
               </View>
            )}
          </View>

          <View className="flex-row gap-4 mb-8">
            {/* Card 3: Pegawai Masuk */}
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm flex-row items-center gap-1">
              <Text className="text-indigo-600 text-2xl font-bold">{attendanceCount}</Text>
              <Text className="text-gray-300 text-xl font-medium">/{totalEmployees}</Text>
              <Text className="text-gray-400 text-xs ml-auto text-right w-16">Pegawai Masuk</Text>
            </View>

            {/* Card 4: Pendapatan Bulan Ini (HIDDEN FOR CAPTAIN) */}
            {userRole === 'owner' ? (
              <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                <Text className="text-indigo-600 text-xl font-bold" numberOfLines={1}>
                  Rp. {monthlyStats.total_revenue.toLocaleString('id-ID')}
                </Text>
                <View className="mt-2 space-y-1">
                  <Text className="text-[10px] text-gray-500">
                    Tunai: Rp {monthlyStats.cash_revenue.toLocaleString('id-ID')}
                  </Text>
                  <Text className="text-[10px] text-gray-500">
                    QRIS : Rp {monthlyStats.qris_revenue.toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs mt-2 font-medium">Pendapatan Bulan Ini</Text>
              </View>
            ) : (
                <View className="flex-1 p-4 rounded-xl justify-center items-center border-2 border-dashed border-gray-300">
                   <Text className="text-gray-400 text-xs text-center font-medium">Pendapatan Hidden</Text>
                </View>
            )}
          </View>

          {/* 3. MENU GRID */}
          <Text className="text-gray-400 text-lg font-medium mb-4">Menu</Text>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {MENU_ITEMS.filter(item => {
                if (userRole === 'captain') {
                    return item.name === 'Pegawai';
                }
                return true;
            }).map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  if (item.name === "Kategori Menu") {
                    router.push('/owner/categories');
                  } else if (item.name === "Stock Opname") {
                    router.push('/owner/stockopname');
                  } else if (item.name === "Menu") {
                    router.push('/owner/menu');
                  } else if (item.name === "Pegawai") {
                    router.push('/owner/pegawai');
                  } else if (item.name === "Pengeluaran") {
                    router.push('/owner/expenses');
                  } else if (item.name === "Report") {
                    router.push('/owner/reports');
                  } else {
                    // Handle other items or show "Coming Soon"
                  }
                }}
                className="w-[30%] my-auto mx-auto bg-white rounded-xl shadow-sm items-center justify-center space-y-2 aspect-square"
              >
                <Image source={item.icon} className="w-20 h-20 object-contain" />
                <Text className="text-[10px] font-medium text-center text-gray-800">{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. RANKING MENU (Real Data) - HIDDEN FOR CAPTAIN */}
          {userRole === 'owner' && (
            <View className="bg-white rounded-3xl p-6 shadow-sm mt-5">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-lg font-bold text-gray-900">Ranking Menu (Bulan Ini)</Text>
                <TouchableOpacity onPress={() => router.push('/owner/ranking')}>
                  <Text className="text-indigo-600 text-blue-500">Show all</Text>
                </TouchableOpacity>
              </View>

              <View className="space-y-4">
                {monthlyStats.menu_sales.slice(0, 4).map((item, idx) => (
                  <View key={idx} className="flex-row items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <View className="flex-row items-center space-x-3 my-2">
                      <View className={`w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3`}>
                        <Text className="font-bold text-indigo-600">{idx + 1}</Text>
                      </View>
                      <View>
                        <Text className="font-bold text-gray-900 text-sm">{item.product_name}</Text>
                        <Text className="text-gray-400 text-xs">Rp {item.total_revenue.toLocaleString('id-ID')}</Text>
                      </View>
                    </View>
                    <Text className="text-red-500 font-bold text-lg">{item.quantity_sold}</Text>
                  </View>
                ))}
                {monthlyStats.menu_sales.length === 0 && (
                  <Text className="text-gray-400 text-center py-4 text-xs">Belum ada transaksi bulan ini.</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 5. BOTTOM NAVIGATION */}
      <OwnerBottomNav activeMenu="home" />

    </View>
  );
}
