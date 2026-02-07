import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, Trash2, Plus, Minus, X } from 'lucide-react-native';
import { orderService, Order, OrderItem } from '../../../../services/orderService';
import { productService, Product } from '../../../../services/productService';
import { formatRupiah, parseRupiah } from '../../../../utils/currency';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function EditTransactionScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    // Editable fields
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
    const [status, setStatus] = useState<'pending' | 'completed' | 'cancelled'>('completed');
    const [discount, setDiscount] = useState(''); // Added discount state
    const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('nominal');
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    // Add product modal
    const [showAddProduct, setShowAddProduct] = useState(false);

    // Track original status for comparison
    const [originalStatus, setOriginalStatus] = useState<'pending' | 'completed' | 'cancelled'>('completed');

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [orderData, productsData] = await Promise.all([
                orderService.getOrderDetails(id!),
                productService.getProducts()
            ]);

            setOrder(orderData);
            setProducts(productsData);

            // Populate form fields
            setCustomerName(orderData.customer_name);
            setPaymentMethod(orderData.payment_method);
            setStatus(orderData.status);
            setDiscountType(orderData.discount_type || 'nominal');
            if (orderData.discount_type === 'percent') {
                setDiscount(orderData.discount_rate ? orderData.discount_rate.toString() : '');
            } else {
                setDiscount(orderData.discount ? formatRupiah(orderData.discount, 'Rp ') : '');
            }
            setOriginalStatus(orderData.status); // Track original status

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

    const calculateTotal = () => {
        const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        let discountVal = 0;

        if (discountType === 'percent') {
            const rate = parseFloat(discount || '0');
            discountVal = (Math.min(rate, 100) / 100) * subtotal;
        } else {
            discountVal = parseRupiah(discount);
        }

        const safeSubtotal = isNaN(subtotal) ? 0 : subtotal;
        const result = safeSubtotal - (isNaN(discountVal) ? 0 : discountVal);
        return isNaN(result) ? 0 : Math.max(0, result);
    };

    const updateItemQuantity = (index: number, delta: number) => {
        const newItems = [...orderItems];
        const newQty = newItems[index].quantity + delta;

        if (newQty <= 0) {
            // Remove item
            newItems.splice(index, 1);
        } else {
            newItems[index].quantity = newQty;
            newItems[index].subtotal = newQty * newItems[index].price;
        }

        setOrderItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems);
    };

    const addProduct = (product: Product) => {
        const existingIndex = orderItems.findIndex(item => item.product_id === product.id);

        if (existingIndex >= 0) {
            updateItemQuantity(existingIndex, 1);
        } else {
            const newItem: OrderItem = {
                product_id: product.id,
                quantity: 1,
                price: product.price,
                subtotal: product.price,
                product_name: product.name
            };
            setOrderItems([...orderItems, newItem]);
        }

        setShowAddProduct(false);
    };

    const handleSave = async () => {
        if (!customerName.trim()) {
            Alert.alert('Error', 'Nama pelanggan tidak boleh kosong');
            return;
        }

        if (orderItems.length === 0) {
            Alert.alert('Error', 'Pesanan harus memiliki minimal 1 item');
            return;
        }

        try {
            setSaving(true);

            // Check if status changed to cancelled (was completed before)
            const statusChangedToCancelled = status === 'cancelled' && originalStatus === 'completed';

            await orderService.updateOrder(
                id!,
                {
                    customer_name: customerName,
                    payment_method: paymentMethod,
                    status: status,
                    total_amount: calculateTotal(), // Add total_amount
                    discount: calculateTotal() < orderItems.reduce((sum, item) => sum + item.subtotal, 0)
                        ? (orderItems.reduce((sum, item) => sum + item.subtotal, 0) - calculateTotal())
                        : 0, // Store calculated nominal discount
                    discount_type: discountType,
                    discount_rate: discountType === 'percent' ? parseFloat(discount || '0') : 0
                },
                orderItems
            );

            // If order was cancelled, restore the stock
            if (statusChangedToCancelled) {
                try {
                    await orderService.restoreOrderStock(id!);
                } catch (stockError) {
                    // Log but don't fail the whole operation
                }
            }

            Alert.alert('Sukses', statusChangedToCancelled
                ? 'Transaksi dibatalkan dan stok berhasil dikembalikan'
                : 'Transaksi berhasil diperbarui', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Gagal menyimpan perubahan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Konfirmasi Hapus',
            'Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await orderService.deleteOrder(id!);
                            Alert.alert('Sukses', 'Transaksi berhasil dihapus', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Gagal menghapus transaksi');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-6 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-gray-900">Edit Transaksi</Text>
                        <Text className="text-gray-500 text-sm">#{order?.order_number}</Text>
                    </View>
                </View>

                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={saving}
                        className="bg-red-100 px-4 py-2 rounded-lg flex-row items-center"
                    >
                        <Trash2 size={18} color="#dc2626" />
                        <Text className="text-red-600 font-bold ml-2">Hapus</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 px-6 py-2 rounded-lg flex-row items-center"
                    >
                        {saving ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Save size={18} color="white" />
                                <Text className="text-white font-bold ml-2">Simpan</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
                <View className="flex-row gap-6">
                    {/* Left Column - Order Info */}
                    <View className="flex-1">
                        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                            <Text className="text-lg font-bold text-gray-900 mb-4">Informasi Pesanan</Text>

                            {/* Customer Name */}
                            <View className="mb-4">
                                <Text className="text-gray-500 text-sm mb-2">Nama Pelanggan</Text>
                                <TextInput
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                    placeholder="Masukkan nama pelanggan"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                />
                            </View>

                            {/* Payment Method */}
                            <View className="mb-4">
                                <Text className="text-gray-500 text-sm mb-2">Metode Pembayaran</Text>
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => setPaymentMethod('cash')}
                                        className={`flex-1 py-3 rounded-xl border-2 items-center ${paymentMethod === 'cash'
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 bg-gray-50'
                                            }`}
                                    >
                                        <Text className={`font-bold ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-500'}`}>
                                            CASH
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setPaymentMethod('qris')}
                                        className={`flex-1 py-3 rounded-xl border-2 items-center ${paymentMethod === 'qris'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-gray-50'
                                            }`}
                                    >
                                        <Text className={`font-bold ${paymentMethod === 'qris' ? 'text-blue-600' : 'text-gray-500'}`}>
                                            QRIS
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="mb-4">
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-gray-500 text-sm">Diskon</Text>
                                    <View className="flex-row bg-gray-100 rounded-lg p-1">
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (discountType !== 'nominal') {
                                                    setDiscountType('nominal');
                                                    setDiscount('');
                                                }
                                            }}
                                            className="px-3 py-1 rounded-md"
                                            style={discountType === 'nominal' ? { backgroundColor: 'white', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 } : {}}
                                        >
                                            <Text className="text-xs font-bold" style={{ color: discountType === 'nominal' ? '#4f46e5' : '#6b7280' }}>Rp</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (discountType !== 'percent') {
                                                    setDiscountType('percent');
                                                    setDiscount('');
                                                }
                                            }}
                                            className="px-3 py-1 rounded-md"
                                            style={discountType === 'percent' ? { backgroundColor: 'white', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 } : {}}
                                        >
                                            <Text className="text-xs font-bold" style={{ color: discountType === 'percent' ? '#4f46e5' : '#6b7280' }}>%</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TextInput
                                    value={discount}
                                    onChangeText={(text) => {
                                        try {
                                            if (discountType === 'percent') {
                                                const clean = text.replace(/[^0-9.]/g, '');
                                                setDiscount(clean);
                                            } else {
                                                const numeric = text.replace(/[^0-9]/g, '');
                                                setDiscount(formatRupiah(numeric, 'Rp '));
                                            }
                                        } catch (e) {
                                            console.error("Discount input error", e);
                                            setDiscount('');
                                        }
                                    }}
                                    placeholder={discountType === 'percent' ? "0%" : "Rp 0"}
                                    keyboardType="numeric"
                                    className="border border-indigo-200 rounded-lg p-2 text-right font-medium text-gray-700 bg-indigo-50"
                                />
                            </View>

                            {/* Status */}
                            <View>
                                <Text className="text-gray-500 text-sm mb-2">Status</Text>
                                <View className="flex-row gap-2">
                                    {(['pending', 'completed', 'cancelled'] as const).map((s) => (
                                        <TouchableOpacity
                                            key={s}
                                            onPress={() => setStatus(s)}
                                            className={`flex-1 py-3 rounded-xl border-2 items-center ${status === s
                                                ? s === 'completed' ? 'border-green-500 bg-green-50'
                                                    : s === 'pending' ? 'border-yellow-500 bg-yellow-50'
                                                        : 'border-red-500 bg-red-50'
                                                : 'border-gray-200 bg-gray-50'
                                                }`}
                                        >
                                            <Text className={`font-bold text-xs ${status === s
                                                ? s === 'completed' ? 'text-green-600'
                                                    : s === 'pending' ? 'text-yellow-600'
                                                        : 'text-red-600'
                                                : 'text-gray-500'
                                                }`}>
                                                {s.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Total */}
                        {/* Total */}
                        <View className="bg-indigo-600 rounded-2xl p-6">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-indigo-200 text-sm">Harga Normal</Text>
                                <Text className="text-indigo-100 font-bold">
                                    Rp {orderItems.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString()}
                                </Text>
                            </View>

                            <View className="flex-row justify-between mb-4 pb-4 border-b border-indigo-500">
                                <Text className="text-indigo-200 text-sm">Potongan Diskon</Text>
                                <Text className="text-red-300 font-bold">
                                    - Rp {(orderItems.reduce((sum, item) => sum + item.subtotal, 0) - calculateTotal()).toLocaleString()}
                                </Text>
                            </View>

                            <Text className="text-indigo-200 text-sm mb-1">Total Akhir</Text>
                            <Text className="text-white text-3xl font-bold">
                                Rp {calculateTotal().toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Right Column - Order Items */}
                    <View className="flex-1">
                        <View className="bg-white rounded-2xl p-6 shadow-sm">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-lg font-bold text-gray-900">Item Pesanan</Text>
                                <TouchableOpacity
                                    onPress={() => setShowAddProduct(true)}
                                    className="bg-indigo-100 px-4 py-2 rounded-lg flex-row items-center"
                                >
                                    <Plus size={16} color="#4f46e5" />
                                    <Text className="text-indigo-600 font-bold ml-1">Tambah</Text>
                                </TouchableOpacity>
                            </View>

                            {orderItems.length === 0 ? (
                                <View className="py-10 items-center">
                                    <Text className="text-gray-400">Belum ada item</Text>
                                </View>
                            ) : (
                                orderItems.map((item, index) => (
                                    <View key={index} className="flex-row items-center py-3 border-b border-gray-100">
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-bold">{item.product_name}</Text>
                                            <Text className="text-gray-500 text-sm">
                                                @ Rp {item.price.toLocaleString()}
                                            </Text>
                                        </View>

                                        <View className="flex-row items-center gap-2 mr-4">
                                            <TouchableOpacity
                                                onPress={() => updateItemQuantity(index, -1)}
                                                className="w-8 h-8 bg-gray-100 rounded-lg items-center justify-center"
                                            >
                                                <Minus size={16} color="#374151" />
                                            </TouchableOpacity>
                                            <Text className="w-8 text-center font-bold text-gray-900">
                                                {item.quantity}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => updateItemQuantity(index, 1)}
                                                className="w-8 h-8 bg-indigo-100 rounded-lg items-center justify-center"
                                            >
                                                <Plus size={16} color="#4f46e5" />
                                            </TouchableOpacity>
                                        </View>

                                        <Text className="text-gray-900 font-bold w-24 text-right mr-3">
                                            Rp {item.subtotal.toLocaleString()}
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() => removeItem(index)}
                                            className="w-8 h-8 bg-red-100 rounded-lg items-center justify-center"
                                        >
                                            <X size={16} color="#dc2626" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Add Product Modal */}
            {showAddProduct && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                    <View className="bg-white rounded-2xl w-[500px] max-h-[80%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                            <Text className="text-lg font-bold text-gray-900">Tambah Produk</Text>
                            <TouchableOpacity onPress={() => setShowAddProduct(false)}>
                                <X size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="p-4">
                            {products.map((product) => (
                                <TouchableOpacity
                                    key={product.id}
                                    onPress={() => addProduct(product)}
                                    className="flex-row items-center justify-between py-3 border-b border-gray-100"
                                >
                                    <View>
                                        <Text className="text-gray-900 font-bold">{product.name}</Text>
                                        <Text className="text-gray-500 text-sm">
                                            {product.categories?.name || 'Uncategorized'}
                                        </Text>
                                    </View>
                                    <Text className="text-indigo-600 font-bold">
                                        Rp {product.price.toLocaleString()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );
}
