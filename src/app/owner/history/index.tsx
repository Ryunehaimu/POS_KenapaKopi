import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Filter, ChevronRight, ChevronLeft as ChevronBack } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { orderService, Order } from '../../../services/orderService';
import KasirSidebar from '../../../components/KasirSidebar'; // Assuming Owner sidebar logic or reuse
import OwnerBottomNav from '../../../components/OwnerBottomNav';

const STATUS_OPTIONS = ['All', 'Completed', 'Pending', 'Cancelled'];
const PAYMENT_OPTIONS = ['All', 'Cash', 'QRIS'];

export default function TransactionHistory() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [page, setPage] = useState(1);

    // Default to Start of Month for StartDate
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
    });

    // Default to End of Today for EndDate
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        date.setHours(23, 59, 59, 999);
        return date;
    });
    const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [paymentFilter, setPaymentFilter] = useState('All');

    const LIMIT = 10;
    const totalPages = Math.ceil(totalCount / LIMIT);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const { data, count } = await orderService.getRecentOrders(
                startDate,
                endDate,
                page,
                LIMIT,
                statusFilter,
                paymentFilter
            );
            setOrders(data);
            setTotalCount(count || 0);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
        }
    }, [page, startDate, endDate, statusFilter, paymentFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        const type = showDatePicker;
        setShowDatePicker(null);
        if (selectedDate && type) {
            if (type === 'start') {
                // Set to beginning of selected day
                const newStart = new Date(selectedDate);
                newStart.setHours(0, 0, 0, 0);
                setStartDate(newStart);
            } else {
                // Set to end of selected day
                const newEnd = new Date(selectedDate);
                newEnd.setHours(23, 59, 59, 999);
                setEndDate(newEnd);
            }
            setPage(1); // Reset to page 1 on filter change
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        let colorClass = 'bg-gray-100 text-gray-800';
        if (status === 'completed') colorClass = 'bg-green-100 text-green-800';
        else if (status === 'pending') colorClass = 'bg-yellow-100 text-yellow-800';
        else if (status === 'cancelled') colorClass = 'bg-red-100 text-red-800';

        return (
            <View className={`px-2 py-1 rounded-full self-start ${colorClass.split(' ')[0]}`}>
                <Text className={`text-[10px] font-bold uppercase ${colorClass.split(' ')[1]}`}>{status}</Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50 pb-20">
            {/* Header */}
            <LinearGradient
                colors={['#4c1d95', '#7c3aed']}
                className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative z-0"
            >
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white/20 rounded-full mr-4">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-white">Riwayat Transaksi</Text>
                </View>
                <Text className="text-white/80 text-sm ml-12 -mt-2">
                    Laporan lengkap transaksi outlet
                </Text>
            </LinearGradient>

            {/* Filters Card */}
            <View className="mx-6 -mt-16 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 z-10">
                <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity
                        onPress={() => setShowDatePicker('start')}
                        className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 p-2.5 rounded-xl"
                    >
                        <Calendar size={18} color="#6B7280" className="mr-2" />
                        <Text className="text-xs font-medium text-gray-700">
                            {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                    <Text className="self-center text-gray-400 font-bold">-</Text>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker('end')}
                        className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 p-2.5 rounded-xl"
                    >
                        <Calendar size={18} color="#6B7280" className="mr-2" />
                        <Text className="text-xs font-medium text-gray-700">
                            {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row gap-2">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {STATUS_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                onPress={() => { setStatusFilter(opt); setPage(1); }}
                                className={`px-4 py-2 rounded-full border mr-2 ${statusFilter === opt ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Text className={`text-xs font-bold ${statusFilter === opt ? 'text-white' : 'text-gray-500'}`}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View className="flex-row gap-2 mt-3">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {PAYMENT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                onPress={() => { setPaymentFilter(opt); setPage(1); }}
                                className={`px-4 py-2 rounded-full border mr-2 ${paymentFilter === opt ? 'bg-emerald-600 border-emerald-600' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Text className={`text-xs font-bold ${paymentFilter === opt ? 'text-white' : 'text-gray-500'}`}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* List */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={item => item.id || Math.random().toString()}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <Text className="text-center text-gray-400 mt-10">Tidak ada transaksi ditemukan.</Text>
                    }
                    renderItem={({ item: order }) => (
                        <TouchableOpacity
                            key={order.id}
                            className="bg-white p-4 rounded-2xl shadow-sm mb-3 border border-gray-100"
                            onPress={() => router.push(`/owner/reports/transaction/${order.id}`)}
                        >
                            <View className="flex-row justify-between mb-3 border-b border-gray-50 pb-2">
                                <Text className="text-xs text-gray-500 font-medium">
                                    {new Date(order.created_at || '').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <StatusBadge status={order.status} />
                            </View>

                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="font-bold text-gray-900 text-lg">{order.customer_name || 'Guest'}</Text>
                                <Text className="font-bold text-indigo-600 text-lg">Rp {order.total_amount.toLocaleString('id-ID')}</Text>
                            </View>

                            <View className="flex-row justify-between items-center mt-2">
                                <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg">
                                    <Text className="text-[10px] text-gray-400 mr-1">ID:</Text>
                                    <Text className="text-xs text-gray-600 font-mono">{order.id?.slice(0, 8)}</Text>
                                </View>
                                <View className={`px-2 py-1 rounded lg ${order.payment_method === 'qris' ? 'bg-blue-50' : 'bg-green-50'}`}>
                                    <Text className={`text-xs font-bold uppercase ${order.payment_method === 'qris' ? 'text-blue-700' : 'text-green-700'}`}>
                                        {order.payment_method}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )
                    }
                />
            )}

            {/* Pagination Controls - Floating or Fixed at bottom */}
            {
                !loading && totalCount > 0 && (
                    <View className="absolute bottom-[90px] left-6 right-6 flex-row justify-between items-center bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                        <TouchableOpacity
                            disabled={page === 1}
                            onPress={() => setPage(p => Math.max(1, p - 1))}
                            className={`p-2 rounded-lg ${page === 1 ? 'bg-gray-100' : 'bg-indigo-50'}`}
                        >
                            <ChevronBack size={20} color={page === 1 ? '#9CA3AF' : '#4F46E5'} />
                        </TouchableOpacity>

                        <Text className="text-gray-600 font-medium">
                            Page {page} of {totalPages}
                        </Text>

                        <TouchableOpacity
                            disabled={page >= totalPages}
                            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                            className={`p-2 rounded-lg ${page >= totalPages ? 'bg-gray-100' : 'bg-indigo-50'}`}
                        >
                            <ChevronRight size={20} color={page >= totalPages ? '#9CA3AF' : '#4F46E5'} />
                        </TouchableOpacity>
                    </View>
                )
            }

            {/* Date Pickers */}
            {
                (showDatePicker) && (
                    <DateTimePicker
                        value={showDatePicker === 'start' ? startDate : endDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                    />
                )
            }

            <OwnerBottomNav activeMenu="history" />
        </View >
    );
}
