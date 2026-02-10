import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, FileText, UserCheck, LogOut, ChevronRight } from 'lucide-react-native';
import { inventoryService, Ingredient } from '../../../services/inventoryService';
import { shiftService, Shift } from '../../../services/shiftService';
import * as Print from 'expo-print';
import { TrendingUp, Printer, ChevronDown } from 'lucide-react-native';
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
  { name: "Approve Overtime", icon: require("../../../../assets/Overtime.png") }, // Placeholder icon? or reuse one? Let's use FileText icon or similar from lucide if dynamic, but here it uses images. I will assume an icon exists or reuse one. Let's reuse Pegawai for now or just add it.
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
    gojek_revenue: number;
    grab_revenue: number;
    shopee_revenue: number;
    transfer_revenue: number;
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
    gojek_revenue: 0,
    grab_revenue: 0,
    shopee_revenue: 0,
    transfer_revenue: 0,
    menu_sales: []
  });

  // Monthly Revenue State
  const [monthlyStats, setMonthlyStats] = useState<{
    total_revenue: number;
    cash_revenue: number;
    qris_revenue: number;
    gojek_revenue: number;
    grab_revenue: number;
    shopee_revenue: number;
    transfer_revenue: number;
    menu_sales: {
      product_name: string;
      quantity_sold: number;
      total_revenue: number;
    }[];
  }>({
    total_revenue: 0,
    cash_revenue: 0,
    qris_revenue: 0,
    gojek_revenue: 0,
    grab_revenue: 0,
    shopee_revenue: 0,
    transfer_revenue: 0,
    menu_sales: []
  });

  // Shift State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>('today');
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);

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
      // 1. Fetch Shifts
      const shiftsData = await shiftService.getShifts();
      setShifts(shiftsData);

      // 2. Daily Stats with Shift Logic
      let statsData;
      if (selectedShift === 'today') {
        statsData = await orderService.getDailyReport(now);
      } else {
        const selectedShiftData = shiftsData.find(s => s.id === selectedShift);
        if (selectedShiftData) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const [startHour, startMinute] = selectedShiftData.start_time.split(':').map(Number);
          const [endHour, endMinute] = selectedShiftData.end_time.split(':').map(Number);

          const startTime = new Date(today);
          startTime.setHours(startHour, startMinute, 0, 0);

          const endTime = new Date(today);
          endTime.setHours(endHour, endMinute, 0, 0);

          statsData = await orderService.getShiftReport(startTime, endTime);
        } else {
          statsData = await orderService.getDailyReport(now);
        }
      }
      setDailyStats(statsData);

      // 2. Monthly Revenue
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // orderService.getSalesReport handles date formatting internally now
      const monthlyData = await orderService.getSalesReport(startOfMonth, now);
      setMonthlyStats({
        total_revenue: monthlyData.total_revenue,
        cash_revenue: monthlyData.cash_revenue,
        qris_revenue: monthlyData.qris_revenue,
        gojek_revenue: monthlyData.gojek_revenue,
        grab_revenue: monthlyData.grab_revenue,
        shopee_revenue: monthlyData.shopee_revenue,
        transfer_revenue: monthlyData.transfer_revenue,
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
    }, [selectedShift]) // Reload when shift changes
  );

  const printShiftReport = async () => {
    const selectedShiftData = shifts.find(s => s.id === selectedShift);
    const shiftLabel = selectedShift === 'today'
      ? 'Hari Ini (Semua)'
      : selectedShiftData
        ? `${selectedShiftData.name} (${selectedShiftData.start_time.slice(0, 5)} - ${selectedShiftData.end_time.slice(0, 5)})`
        : 'Shift';

    const reportContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { text-align: center; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .total { font-weight: bold; font-size: 24px; }
          </style>
        </head>
        <body>
          <h1>Laporan Penjualan (Owner)</h1>
          <h3>${shiftLabel} - ${new Date().toLocaleDateString('id-ID')}</h3>
          <hr/>
          <div class="row"><span>Tunai:</span><span>Rp ${(dailyStats.cash_revenue || 0).toLocaleString()}</span></div>
          <div class="row"><span>QRIS:</span><span>Rp ${(dailyStats.qris_revenue || 0).toLocaleString()}</span></div>
          <div class="row"><span>Gojek:</span><span>Rp ${(dailyStats.gojek_revenue || 0).toLocaleString()}</span></div>
          <div class="row"><span>Grab:</span><span>Rp ${(dailyStats.grab_revenue || 0).toLocaleString()}</span></div>
          <div class="row"><span>Shopee:</span><span>Rp ${(dailyStats.shopee_revenue || 0).toLocaleString()}</span></div>
          <div class="row"><span>Transfer:</span><span>Rp ${(dailyStats.transfer_revenue || 0).toLocaleString()}</span></div>
          <hr/>
          <div class="row total"><span>TOTAL:</span><span>Rp ${(dailyStats.total_revenue || 0).toLocaleString()}</span></div>
          <div class="row"><span>Transaksi:</span><span>${dailyStats.total_transactions}</span></div>
        </body>
      </html>
    `;
    await Print.printAsync({ html: reportContent });
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
        >{userRole === 'owner' ? (
          <Text className="text-white text-center text-xl font-bold mb-8">Owner Menu</Text>
        ) : (
          <Text className="text-white text-center text-xl font-bold mb-8">Captain Menu</Text>
        )}

          <Text className="text-white text-base font-medium mb-2">Summary</Text>
        </LinearGradient>

        {/* 2. SUMMARY CARDS (Overlapping Header) */}
        <View className="px-6 -mt-16">

          {/* Detailed Revenue Card (Like Cashier) - HIDDEN FOR CAPTAIN */}
          {userRole === 'owner' ? (
            <View className="bg-white rounded-xl shadow-sm p-4 mb-4 z-50">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-gray-500 text-sm font-medium">Pendapatan Transaksi</Text>
              </View>

              {shiftDropdownOpen && (
                <View className="absolute right-4 top-12 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[150px]">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedShift('today');
                      setShiftDropdownOpen(false);
                    }}
                    className={`px-4 py-3 border-b border-gray-100 ${selectedShift === 'today' ? 'bg-indigo-50' : ''}`}
                  >
                    <Text className={`text-sm ${selectedShift === 'today' ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                      Hari Ini (Semua)
                    </Text>
                  </TouchableOpacity>
                  {shifts.map((shift) => (
                    <TouchableOpacity
                      key={shift.id}
                      onPress={() => {
                        setSelectedShift(shift.id);
                        setShiftDropdownOpen(false);
                      }}
                      className={`px-4 py-3 border-b border-gray-100 ${selectedShift === shift.id ? 'bg-indigo-50' : ''}`}
                    >
                      <Text className={`text-sm ${selectedShift === shift.id ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                        {shift.name}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View className="flex-row justify-between items-end mb-4">
                <Text className="text-3xl font-bold text-gray-900">Rp {(dailyStats.total_revenue || 0).toLocaleString('id-ID')}</Text>
                <View className="flex-row items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                  <TrendingUp color="green" size={12} />
                  <Text className="text-xs font-bold text-green-700">Total</Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-2">
                <View className="bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  <Text className="text-[10px] text-gray-500">Tunai</Text>
                  <Text className="text-xs font-bold text-gray-800">Rp {(dailyStats.cash_revenue || 0).toLocaleString('id-ID')}</Text>
                </View>
                <View className="bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  <Text className="text-[10px] text-gray-500">QRIS</Text>
                  <Text className="text-xs font-bold text-gray-800">Rp {(dailyStats.qris_revenue || 0).toLocaleString('id-ID')}</Text>
                </View>
                <View className="bg-green-50 px-2 py-1 rounded border border-green-100">
                  <Text className="text-[10px] text-green-600">Gojek</Text>
                  <Text className="text-xs font-bold text-green-700">Rp {(dailyStats.gojek_revenue || 0).toLocaleString('id-ID')}</Text>
                </View>
                <View className="bg-green-50 px-2 py-1 rounded border border-green-100">
                  <Text className="text-[10px] text-green-600">Grab</Text>
                  <Text className="text-xs font-bold text-green-700">Rp {(dailyStats.grab_revenue || 0).toLocaleString('id-ID')}</Text>
                </View>
                <View className="bg-orange-50 px-2 py-1 rounded border border-orange-100">
                  <Text className="text-[10px] text-orange-600">Shopee</Text>
                  <Text className="text-xs font-bold text-orange-700">Rp {(dailyStats.shopee_revenue || 0).toLocaleString('id-ID')}</Text>
                </View>
                <View className="bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                  <Text className="text-[10px] text-indigo-600">Transfer</Text>
                  <Text className="text-xs font-bold text-indigo-700">Rp {(dailyStats.transfer_revenue || 0).toLocaleString('id-ID')}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="bg-white/10 rounded-xl p-4 mb-4 border-2 border-dashed border-white/30 justify-center items-center">
              <Text className="text-white font-bold opacity-80">Pendapatan Hidden</Text>
            </View>
          )}

          <View className="flex-row gap-4 mb-8">
            {/* Card 1: Transaksi Hari Ini */}
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
              <Text className="text-blue-600 text-2xl font-bold">{dailyStats.total_transactions}</Text>
              <Text className="text-gray-400 text-xs">Transaksi Hari Ini</Text>
            </View>

            {/* Card 3: Pegawai Masuk - Moved here to balance row */}
            <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
              <Text className="text-indigo-600 text-2xl font-bold">
                {attendanceCount}
                <Text className="text-gray-300 text-sm font-medium"> /{totalEmployees}</Text>
              </Text>
              <Text className="text-gray-400 text-xs mt-1">Pegawai Masuk</Text>
            </View>
          </View>

          <View className="flex-row gap-4 mb-8">
            {/* Card 4: Pendapatan Bulan Ini (HIDDEN FOR CAPTAIN) */}
            {userRole === 'owner' ? (
              <View className="bg-white rounded-xl shadow-sm p-4 w-full">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-gray-500 text-sm font-medium">Pendapatan Bulan Ini</Text>
                </View>

                <View className="flex-row justify-between items-end mb-4">
                  <Text className="text-3xl font-bold text-gray-900">Rp {(monthlyStats.total_revenue || 0).toLocaleString('id-ID')}</Text>
                  <View className="flex-row items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                    <TrendingUp color="green" size={12} />
                    <Text className="text-xs font-bold text-green-700">Total</Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <View className="bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <Text className="text-[10px] text-gray-500">Tunai</Text>
                    <Text className="text-xs font-bold text-gray-800">Rp {(monthlyStats.cash_revenue || 0).toLocaleString('id-ID')}</Text>
                  </View>
                  <View className="bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <Text className="text-[10px] text-gray-500">QRIS</Text>
                    <Text className="text-xs font-bold text-gray-800">Rp {(monthlyStats.qris_revenue || 0).toLocaleString('id-ID')}</Text>
                  </View>
                  <View className="bg-green-50 px-2 py-1 rounded border border-green-100">
                    <Text className="text-[10px] text-green-600">Gojek</Text>
                    <Text className="text-xs font-bold text-green-700">Rp {(monthlyStats.gojek_revenue || 0).toLocaleString('id-ID')}</Text>
                  </View>
                  <View className="bg-green-50 px-2 py-1 rounded border border-green-100">
                    <Text className="text-[10px] text-green-600">Grab</Text>
                    <Text className="text-xs font-bold text-green-700">Rp {(monthlyStats.grab_revenue || 0).toLocaleString('id-ID')}</Text>
                  </View>
                  <View className="bg-orange-50 px-2 py-1 rounded border border-orange-100">
                    <Text className="text-[10px] text-orange-600">Shopee</Text>
                    <Text className="text-xs font-bold text-orange-700">Rp {(monthlyStats.shopee_revenue || 0).toLocaleString('id-ID')}</Text>
                  </View>
                  <View className="bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                    <Text className="text-[10px] text-indigo-600">Transfer</Text>
                    <Text className="text-xs font-bold text-indigo-700">Rp {(monthlyStats.transfer_revenue || 0).toLocaleString('id-ID')}</Text>
                  </View>
                </View>
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
                return item.name === 'Pegawai' || item.name === 'Approve Overtime';
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
                  } else if (item.name === "Approve Overtime") {
                    router.push('/owner/OvertimeApproval');
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
