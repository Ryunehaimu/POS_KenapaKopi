import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, FlatList, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Calendar, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import OwnerBottomNav from '../../../components/OwnerBottomNav';
import { inventoryService, MergedExpense } from '../../../services/inventoryService';
import { LinearGradient } from 'expo-linear-gradient';

// Helper for Indonesian Month Names
const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function ExpensesScreen() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<MergedExpense[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State: Month & Year (Default Today)
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    // Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Type Filter State
    const [filterType, setFilterType] = useState<'all' | 'ingredient' | 'operational'>('all');

    // Summary State
    const [totalSelectedMonth, setTotalSelectedMonth] = useState(0);
    const [totalPrevMonth, setTotalPrevMonth] = useState(0);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Define Selected Range (Start of Month to End of Month)
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const startSelected = new Date(year, month, 1);
            const endSelected = new Date(year, month + 1, 0, 23, 59, 59);

            // 2. Define Previous Range (Start of Prev Month to End of Prev Month)
            const startPrev = new Date(year, month - 1, 1);
            const endPrev = new Date(year, month, 0, 23, 59, 59);

            // 3. Fetch Data Pair (Pass search query to selected data)
            const [selectedData, prevData] = await Promise.all([
                inventoryService.getAllExpenses(startSelected, endSelected, searchQuery),
                inventoryService.getAllExpenses(startPrev, endPrev) // Prev month comparison doesn't need search filter usually, but if we want strictly comparable, maybe? Let's keep it raw for "Total Expenditure" comparison context.
            ]);

            setExpenses(selectedData);

            // 4. Calculate Totals
            const sumSelected = selectedData.reduce((acc, curr) => acc + curr.total, 0);
            const sumPrev = prevData.reduce((acc, curr) => acc + curr.total, 0);

            setTotalSelectedMonth(sumSelected);
            setTotalPrevMonth(sumPrev);

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data pengeluaran");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [selectedDate]) // Reload when date changes
    );

    // Reload when search changes (debounce could be added but direct is fine for now)
    useEffect(() => {
        loadData();
    }, [searchQuery]);

    const formatCurrency = (amount: number) => {
        return "Rp " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // --- Date Manipulation Helpers ---
    const changeMonth = (increment: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setSelectedDate(newDate);
    };

    const diff = totalSelectedMonth - totalPrevMonth;
    const diffColor = diff > 0 ? "text-red-500" : (diff < 0 ? "text-green-500" : "text-gray-500");
    const diffPrefix = diff > 0 ? "+" : "";

    // Toggle Filter
    const handleFilterChange = (type: 'all' | 'ingredient' | 'operational') => {
        setFilterType(type);
        setCurrentPage(1);
    };

    // Client-side Pagination Logic
    // First, filter by type
    const filteredExpenses = expenses.filter(item => {
        if (filterType === 'all') return true;
        return item.type === filterType;
    });

    const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
    const paginatedExpenses = filteredExpenses.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* List Section */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 150 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <LinearGradient
                    colors={['#4c1d95', '#7c3aed']} // Dark purple to lighter purple
                    className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg"
                >

                    <TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-6 z-20">
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-center text-xl font-bold mb-8">Pengeluaran</Text>

                    <Text className="text-white text-base font-medium mb-2">Summary</Text>
                </LinearGradient>

                <View className="px-6 -mt-16">
                    {/* Summary Cards */}
                    <View className="mb-4">
                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1 bg-white p-4 rounded-xl shadow-md">
                                <Text className="text-gray-500 text-[10px] mb-1">Pengeluaran Bulan Ini</Text>
                                <Text className="text-indigo-900 font-bold text-base">{formatCurrency(totalSelectedMonth)}</Text>
                            </View>
                            <View className="flex-1 bg-white p-4 rounded-xl shadow-md">
                                <Text className="text-gray-500 text-[10px] mb-1">Pengeluaran Bulan Lalu</Text>
                                <Text className="text-gray-600 font-bold text-base">{formatCurrency(totalPrevMonth)}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1 bg-white p-4 rounded-xl shadow-md">
                                <Text className="text-gray-500 text-[10px] mb-1">Selisih Pengeluaran</Text>
                                <Text className={`${diffColor} font-bold text-base`}>{diffPrefix}{formatCurrency(diff)}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push('/owner/expenses/add')}
                                className="flex-1 bg-indigo-500 p-4 rounded-xl shadow-md items-center justify-center flex-row gap-2"
                            >
                                <Plus color="white" size={20} />
                                <Text className="text-white font-bold">Tambah</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                {/* Custom Month Filter */}
                <View className="px-6">
                    <View className="bg-white p-4 rounded-xl shadow-sm mb-6 mt-4">
                        <Text className="text-gray-500 text-xs mb-2">Periode</Text>
                        <View className="flex-row items-center justify-between border border-gray-200 rounded-lg p-2">
                            <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2">
                                <ChevronLeft size={20} color="#4b5563" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowMonthPicker(true)} className="flex-row items-center gap-2">
                                <Calendar size={18} color="#4f46e5" />
                                <Text className="text-gray-900 font-bold text-base">
                                    {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => changeMonth(1)} className="p-2">
                                <ChevronRight size={20} color="#4b5563" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View className="flex-row gap-2 mb-4">
                        <TouchableOpacity
                            onPress={() => handleFilterChange('all')}
                            className={`px-4 py-2 rounded-full border ${filterType === 'all' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-xs font-bold ${filterType === 'all' ? 'text-white' : 'text-gray-500'}`}>Semua</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleFilterChange('ingredient')}
                            className={`px-4 py-2 rounded-full border ${filterType === 'ingredient' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-xs font-bold ${filterType === 'ingredient' ? 'text-white' : 'text-gray-500'}`}>Bahan Baku</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleFilterChange('operational')}
                            className={`px-4 py-2 rounded-full border ${filterType === 'operational' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-xs font-bold ${filterType === 'operational' ? 'text-white' : 'text-gray-500'}`}>Operasional</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View className="bg-white rounded-xl px-4 py-3 flex-row items-center border border-gray-100 mb-4 shadow-sm">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            placeholder="Cari Pengeluaran..."
                            className="flex-1 ml-2 text-gray-800"
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
                        />
                    </View>

                    {/* Table Header */}
                    <View className="bg-white rounded-t-xl shadow-sm border-b border-gray-100 flex-row p-3">
                        <Text className="flex-[2] font-medium text-gray-500 text-xs">Pengeluaran</Text>
                        <Text className="flex-1 font-medium text-gray-500 text-xs text-center">Tgl</Text>
                        <Text className="flex-[1.5] font-medium text-gray-500 text-xs text-right">Total</Text>
                    </View>

                    {/* List Items */}
                    <View className="bg-white rounded-b-xl shadow-sm overflow-hidden mb-6">
                        {filteredExpenses.length === 0 ? (
                            <View className="p-8 items-center">
                                <Text className="text-gray-400 italic text-sm">Belum ada pengeluaran</Text>
                            </View>
                        ) : (
                            paginatedExpenses.map((item) => (
                                <View key={item.id} className="flex-row p-4 border-b border-gray-50 items-center">
                                    <View className="flex-[2]">
                                        <Text className="font-bold text-gray-800 text-sm">{item.name}</Text>
                                        <Text className="text-xs text-gray-400 capitalize">{item.type === 'ingredient' ? 'Bahan Baku' : 'Operasional'}</Text>
                                        {item.notes && <Text className="text-[10px] text-gray-400 italic" numberOfLines={1}>{item.notes}</Text>}
                                    </View>
                                    <Text className="flex-1 text-gray-600 text-xs text-center">{formatDate(item.date)}</Text>
                                    <Text className="flex-[1.5] font-bold text-red-500 text-sm text-right">-{formatCurrency(item.total)}</Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Pagination Controls */}
                    {filteredExpenses.length > 0 && (
                        <View className="flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-10">
                            <TouchableOpacity
                                disabled={currentPage === 1}
                                onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                className={`p-2 rounded-lg border ${currentPage === 1 ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
                            >
                                <ChevronLeft size={20} color={currentPage === 1 ? "#D1D5DB" : "#4f46e5"} />
                            </TouchableOpacity>

                            <Text className="text-gray-600 font-medium">
                                Halaman {currentPage} dari {totalPages || 1}
                            </Text>

                            <TouchableOpacity
                                disabled={currentPage >= totalPages}
                                onPress={() => setCurrentPage(currentPage + 1)}
                                className={`p-2 rounded-lg border ${currentPage >= totalPages ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
                            >
                                <ChevronRight size={20} color={currentPage >= totalPages ? "#D1D5DB" : "#4f46e5"} />
                            </TouchableOpacity>
                        </View>
                    )}

                </View>
            </ScrollView>

            <OwnerBottomNav />
        </View>
    );
}
