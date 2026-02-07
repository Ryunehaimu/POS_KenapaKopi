import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { orderService, Order, OrderItem } from '../../../../services/orderService';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function TransactionDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    useEffect(() => {
        // Owner might not need landscape lock, but keeping it consistent if needed. 
        // Or maybe portrait is fine. Let's stick to default behavior or strict portrait for owner? 
        // Actually, let's unlock it to allow both.
        ScreenOrientation.unlockAsync();
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const orderData = await orderService.getOrderDetails(id!);
            setOrder(orderData);

            // Map order items
            const items: OrderItem[] = orderData.order_items?.map((item: any) => ({
                id: item.id,
                order_id: item.order_id,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                product_name: item.products?.name || 'Unknown'
            })) || [];

            setOrderItems(items);
        } catch (error) {
            Alert.alert('Error', 'Gagal memuat data transaksi');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const calculateSubtotal = () => {
        return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    if (!order) return null;

    const subtotal = calculateSubtotal();
    const discount = order.discount || 0;
    const finalTotal = subtotal - discount;

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-6 py-4 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-bold text-gray-900">Detail Transaksi</Text>
                    <Text className="text-gray-500 text-sm">#{order.order_number}</Text>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
                <View className="flex-col gap-6">
                    {/* Information Card */}
                    <View className="bg-white rounded-2xl p-6 shadow-sm">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Informasi</Text>

                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                            <Text className="text-gray-500">Tanggal</Text>
                            <Text className="text-gray-900 font-medium">
                                {new Date(order.created_at || '').toLocaleString('id-ID')}
                            </Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                            <Text className="text-gray-500">Pelanggan</Text>
                            <Text className="text-gray-900 font-medium">{order.customer_name}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                            <Text className="text-gray-500">Metode Pembayaran</Text>
                            <Text className="text-gray-900 font-medium uppercase">{order.payment_method}</Text>
                        </View>
                        <View className="flex-row justify-between py-2">
                            <Text className="text-gray-500">Status</Text>
                            <View className={`px-3 py-1 rounded-full ${order.status === 'completed' ? 'bg-green-100' :
                                    order.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                                }`}>
                                <Text className={`text-xs font-bold ${order.status === 'completed' ? 'text-green-700' :
                                        order.status === 'pending' ? 'text-yellow-700' : 'text-red-700'
                                    } uppercase`}>
                                    {order.status}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Items Card */}
                    <View className="bg-white rounded-2xl p-6 shadow-sm">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Item Pesanan</Text>

                        {orderItems.map((item, index) => (
                            <View key={index} className="flex-row items-center py-3 border-b border-gray-100 last:border-0">
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold">{item.product_name}</Text>
                                    <Text className="text-gray-500 text-sm">
                                        {item.quantity} x Rp {item.price.toLocaleString()}
                                    </Text>
                                </View>
                                <Text className="text-gray-900 font-bold">
                                    Rp {item.subtotal.toLocaleString()}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Total Card */}
                    <View className="bg-indigo-600 rounded-2xl p-6 shadow-sm">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-indigo-200">Harga Normal</Text>
                            <Text className="text-indigo-100 font-bold">
                                Rp {subtotal.toLocaleString()}
                            </Text>
                        </View>

                        <View className="flex-row justify-between mb-4 pb-4 border-b border-indigo-500">
                            <Text className="text-indigo-200">Potongan Diskon</Text>
                            <Text className="text-red-300 font-bold">
                                - Rp {discount.toLocaleString()}
                            </Text>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <Text className="text-indigo-200 font-bold text-lg">Total Akhir</Text>
                            <Text className="text-white text-3xl font-bold">
                                Rp {finalTotal.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Note if any */}
                    {order.note && (
                        <View className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                            <Text className="text-yellow-800 font-bold mb-1">Catatan:</Text>
                            <Text className="text-yellow-700">{order.note}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
