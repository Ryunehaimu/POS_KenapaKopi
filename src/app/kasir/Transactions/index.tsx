import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, CreditCard, Banknote, FileText, Coffee } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';
import { orderService, Order } from '../../../services/orderService';
import { inventoryService } from '../../../services/inventoryService';
import * as ScreenOrientation from 'expo-screen-orientation';

import { MonthYearPicker } from '../../../components/MonthYearPicker';

export default function TransactionsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'transactions' | 'menu_sales' | 'ingredient_usage' | 'ingredient_expense'>('transactions');
    const [selectedDate, setSelectedDate] = useState(new Date()); // Defaults to today
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // ... (Stats state remains same)
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

    // Special state for "Split Pembayaran Hari Ini" card (Always Today)
    const [todayPaymentStats, setTodayPaymentStats] = useState({
        cash_revenue: 0,
        qris_revenue: 0
    });

    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [ingredientUsage, setIngredientUsage] = useState<{
        ingredient_name: string;
        unit: string;
        total_used: number;
    }[]>([]);

    const [ingredientExpense, setIngredientExpense] = useState<{
        ingredient_name: string;
        unit: string;
        purchase_count: number;
        total_qty_purchased: number;
        total_expenditure: number;
    }[]>([]);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Determine filter mode
    const isFilteredByMonth = !isToday(selectedDate);

    const loadData = async () => {
        try {
            setLoading(true);

            // Calculate Date Range for Usage
            let usageStart: Date;
            let usageEnd: Date;

            if (isFilteredByMonth) {
                // Monthly Range
                usageStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                usageEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            } else {
                // Daily Range (Today) - Full Day
                usageStart = new Date(selectedDate);
                usageStart.setHours(0, 0, 0, 0);

                usageEnd = new Date(selectedDate);
                usageEnd.setHours(23, 59, 59, 999);
            }

            const [stats, orders, usage, expense, todayStats] = await Promise.all([
                // Fix: Usage generic Sales Report for both Daily and Monthly
                orderService.getSalesReport(usageStart, usageEnd),
                orderService.getRecentOrders(usageStart, usageEnd, currentPage, 10),
                inventoryService.getIngredientUsage(usageStart, usageEnd),
                inventoryService.getIngredientExpenseReport(usageStart, usageEnd),
                orderService.getDailyReport(new Date()) // Always fetch today for the widget
            ]);
            setDailyStats(stats);
            setRecentOrders(orders.data);
            setTotalItems(orders.count || 0);
            setIngredientUsage(usage);
            setIngredientExpense(expense);
            setTodayPaymentStats({
                cash_revenue: todayStats.cash_revenue,
                qris_revenue: todayStats.qris_revenue
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            loadData();
        }, [selectedDate, currentPage]) // Reload when date or page changes
    );

    const formatDate = (date: Date) => {
        // If viewing Usage (Monthly), show Month Year
        if (activeTab === 'ingredient_usage') {
            return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        }
        // Default Daily
        return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };



    return (
        <View className="flex-1 flex-row bg-gray-50">
            <KasirSidebar activeMenu="transactions" />

            <View className="flex-1">
                <ScrollView contentContainerStyle={{ padding: 32 }}>

                    {/* Header & Date Filter */}
                    <View className="flex-row justify-between items-center mb-8">
                        <View>
                            <Text className="text-4xl font-bold text-gray-900">
                                {activeTab === 'ingredient_usage' ? 'Laporan Penggunaan Bahan' : 'Laporan Transaksi'}
                            </Text>
                            <Text className="text-gray-500 mt-1">{formatDate(selectedDate)}</Text>
                        </View>

                        {/* Date Filter Controls */}
                        <View className="flex-row bg-white rounded-xl p-1 border border-gray-200">
                            <TouchableOpacity
                                onPress={() => { setSelectedDate(new Date()); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg ${isToday(selectedDate) ? 'bg-indigo-600' : 'bg-transparent'}`}
                            >
                                <Text className={`font-bold ${isToday(selectedDate) ? 'text-white' : 'text-gray-500'}`}>Hari Ini</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setPickerVisible(true)}
                                className="px-4 py-2 rounded-lg"
                            >
                                <View className="flex-row items-center">
                                    <Calendar size={16} color="gray" className="mr-2" />
                                    <Text className="text-gray-500">Pilih Bulan</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Summary Cards */}
                    <View className="flex-row gap-6 mb-8">
                        <View className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
                            <View className="bg-indigo-100 p-4 rounded-full mr-4">
                                <FileText size={24} color="#4f46e5" />
                            </View>
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">Total Transaksi</Text>
                                <Text className="text-2xl font-bold text-gray-900">{dailyStats.total_transactions}</Text>
                            </View>
                        </View>

                        <View className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
                            <View className="bg-blue-100 p-4 rounded-full mr-4">
                                <CreditCard size={24} color="#2563eb" />
                            </View>
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">Split Pembayaran Hari Ini</Text>
                                <Text className="text-xs text-gray-500">Tunai: Rp {todayPaymentStats.cash_revenue.toLocaleString()}</Text>
                                <Text className="text-xs text-gray-500">QRIS: Rp {todayPaymentStats.qris_revenue.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View className="flex-row mb-6 border-b border-gray-200">
                        <TouchableOpacity
                            onPress={() => setActiveTab('transactions')}
                            className={`mr-8 pb-4 ${activeTab === 'transactions' ? 'border-b-2 border-indigo-600' : ''}`}
                        >
                            <Text className={`text-lg font-bold ${activeTab === 'transactions' ? 'text-indigo-600' : 'text-gray-400'}`}>Riwayat Transaksi</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('menu_sales')}
                            className={`mr-8 pb-4 ${activeTab === 'menu_sales' ? 'border-b-2 border-indigo-600' : ''}`}
                        >
                            <Text className={`text-lg font-bold ${activeTab === 'menu_sales' ? 'text-indigo-600' : 'text-gray-400'}`}>Laporan Menu</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('ingredient_usage')}
                            className={`mr-8 pb-4 ${activeTab === 'ingredient_usage' ? 'border-b-2 border-indigo-600' : ''}`}
                        >
                            <Text className={`text-lg font-bold ${activeTab === 'ingredient_usage' ? 'text-indigo-600' : 'text-gray-400'}`}>Penggunaan Bahan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('ingredient_expense')}
                            className={`mr-8 pb-4 ${activeTab === 'ingredient_expense' ? 'border-b-2 border-indigo-600' : ''}`}
                        >
                            <Text className={`text-lg font-bold ${activeTab === 'ingredient_expense' ? 'text-indigo-600' : 'text-gray-400'}`}>Pengeluaran</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View className="bg-white rounded-3xl p-6 min-h-[400px]">
                        {loading ? (
                            <View className="py-20 items-center">
                                <ActivityIndicator size="large" color="#4f46e5" />
                            </View>
                        ) : (
                            <>
                                <>
                                    {activeTab === 'transactions' && (
                                        <View>
                                            <View className="flex-row py-4 border-b border-gray-100 mb-2">
                                                <Text className="flex-1 text-gray-500 font-bold">Waktu</Text>
                                                <Text className="flex-[2] text-gray-500 font-bold">Pelanggan</Text>
                                                <Text className="flex-1 text-gray-500 font-bold">Metode</Text>
                                                <Text className="flex-1 text-gray-500 font-bold text-right">Total</Text>
                                                <Text className="flex-1 text-gray-500 font-bold text-center">Status</Text>
                                            </View>
                                            {recentOrders.map((order, idx) => (
                                                <View key={idx} className="flex-row py-4 border-b border-gray-50 hover:bg-gray-50 items-center">
                                                    <Text className="flex-1 text-gray-900">
                                                        {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </Text>
                                                    <Text className="flex-[2] text-gray-800 font-medium">{order.customer_name}</Text>
                                                    <View className="flex-1">
                                                        <View className={`px-2 py-1 rounded text-xs font-bold ${order.payment_method === 'qris' ? 'bg-blue-100' : 'bg-green-100'} self-start`}>
                                                            <Text className={`${order.payment_method === 'qris' ? 'text-blue-700' : 'text-green-700'}`}>
                                                                {order.payment_method?.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text className="flex-1 text-gray-900 font-bold text-right">Rp {order.total_amount.toLocaleString()}</Text>
                                                    <View className="flex-1 items-center">
                                                        <View className="bg-green-100 px-2 py-1 rounded-full">
                                                            <Text className="text-green-800 text-xs font-bold capitalize">
                                                                {order.status}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}


                                            {/* Pagination Controls */}
                                            <View className="flex-row justify-between items-center mt-6 border-t border-gray-100 pt-4">
                                                <Text className="text-gray-500">
                                                    Menampilkan {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, totalItems)} dari {totalItems} transksi
                                                </Text>
                                                <View className="flex-row space-x-2 gap-2">
                                                    <TouchableOpacity
                                                        onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                        disabled={currentPage === 1}
                                                        className={`px-4 py-2 rounded-lg border ${currentPage === 1 ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white'}`}
                                                    >
                                                        <Text className={`${currentPage === 1 ? 'text-gray-300' : 'text-gray-700'}`}>Previous</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => setCurrentPage(currentPage + 1)}
                                                        disabled={currentPage * 10 >= totalItems}
                                                        className={`px-4 py-2 rounded-lg border ${currentPage * 10 >= totalItems ? 'border-gray-200 bg-gray-50' : 'border-indigo-600 bg-indigo-600'}`}
                                                    >
                                                        <Text className={`${currentPage * 10 >= totalItems ? 'text-gray-300' : 'text-white'}`}>Next</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {activeTab === 'menu_sales' && (
                                        <View>
                                            <View className="flex-row py-4 border-b border-gray-100 mb-2 bg-gray-50 px-4 rounded-t-xl">
                                                <Text className="flex-[2] text-gray-500 font-bold">Menu Item</Text>
                                                <Text className="flex-1 text-gray-500 font-bold text-center">Terjual (Qty)</Text>
                                                <Text className="flex-1 text-gray-500 font-bold text-right">Total Pendapatan</Text>
                                            </View>
                                            {dailyStats.menu_sales.map((item, idx) => (
                                                <View key={idx} className="flex-row py-4 border-b border-gray-50 px-4 hover:bg-gray-50">
                                                    <View className="flex-[2] flex-row items-center">
                                                        <View className="bg-orange-100 p-2 rounded-lg mr-3">
                                                            <Coffee size={16} color="#c2410c" />
                                                        </View>
                                                        <Text className="text-gray-900 font-bold">{item.product_name}</Text>
                                                    </View>
                                                    <Text className="flex-1 text-gray-900 font-bold text-center text-lg">{item.quantity_sold}</Text>
                                                    <Text className="flex-1 text-indigo-600 font-bold text-right">Rp {item.total_revenue.toLocaleString()}</Text>
                                                </View>
                                            ))}
                                            {dailyStats.menu_sales.length === 0 && (
                                                <Text className="text-center text-gray-400 py-10">Belum ada penjualan menu untuk tanggal ini.</Text>
                                            )}
                                        </View>
                                    )}

                                    {activeTab === 'ingredient_usage' && (
                                        <View>
                                            <View className="flex-row py-4 border-b border-gray-100 mb-2 bg-gray-50 px-4 rounded-t-xl">
                                                <Text className="flex-[2] text-gray-500 font-bold">Nama Bahan</Text>
                                                <Text className="flex-1 text-gray-500 font-bold text-center">Unit</Text>
                                                <Text className="flex-1 text-gray-500 font-bold text-right">
                                                    Total Terpakai ({isFilteredByMonth ? 'Bulan Ini' : 'Hari Ini'})
                                                </Text>
                                            </View>
                                            {ingredientUsage.map((item, idx) => (
                                                <View key={idx} className="flex-row py-4 border-b border-gray-50 px-4 hover:bg-gray-50">
                                                    <Text className="flex-[2] text-gray-900 font-bold">{item.ingredient_name}</Text>
                                                    <Text className="flex-1 text-gray-500 font-medium text-center">{item.unit}</Text>
                                                    <Text className="flex-1 text-red-600 font-bold text-right">{item.total_used}</Text>
                                                </View>
                                            ))}
                                            {ingredientUsage.length === 0 && (
                                                <Text className="text-center text-gray-400 py-10">Belum ada data penggunaan bahan untuk periode ini.</Text>
                                            )}
                                        </View>
                                    )}

                                    {activeTab === 'ingredient_expense' && (
                                        <View>
                                            <View className="flex-row py-4 border-b border-gray-100 mb-2 bg-gray-50 px-4 rounded-t-xl">
                                                <Text className="flex-[2] text-gray-500 font-bold">Nama Bahan</Text>
                                                <Text className="flex-[1] text-gray-500 font-bold text-center">Jumlah Beli</Text>
                                                <Text className="flex-1 text-gray-500 font-bold text-right">
                                                    Total Pengeluaran ({isFilteredByMonth ? 'Bulan Ini' : 'Hari Ini'})
                                                </Text>
                                            </View>
                                            {ingredientExpense.map((item, idx) => (
                                                <View key={idx} className="flex-row py-4 border-b border-gray-50 px-4 hover:bg-gray-50">
                                                    <View className="flex-[2]">
                                                        <Text className="text-gray-900 font-bold">{item.ingredient_name}</Text>
                                                        <Text className="text-gray-400 text-xs">{item.purchase_count}x Pembelian</Text>
                                                    </View>
                                                    <Text className="flex-[1] text-gray-500 font-medium text-center">{item.total_qty_purchased} {item.unit}</Text>
                                                    <Text className="flex-1 text-red-600 font-bold text-right">Rp {item.total_expenditure.toLocaleString()}</Text>
                                                </View>
                                            ))}
                                            {ingredientExpense.length === 0 && (
                                                <Text className="text-center text-gray-400 py-10">Belum ada pengeluaran bahan untuk periode ini.</Text>
                                            )}
                                        </View>
                                    )}
                                </>
                            </>
                        )}
                    </View>
                </ScrollView>
            </View >


            {/* Date/Month Picker Modal */}
            <MonthYearPicker
                visible={isPickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(date) => { setSelectedDate(date); setCurrentPage(1); }}
                selectedDate={selectedDate}
            />
        </View>
    );
}
