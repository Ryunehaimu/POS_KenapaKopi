import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ShoppingCart, User, Ticket } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';
import { ProductCard } from '../../../components/cashier/ProductCard';
import { CategoryFilter } from '../../../components/cashier/CategoryFilter';
import { CartItem, CartItemType } from '../../../components/cashier/CartItem';
import { PaymentModal } from '../../../components/cashier/PaymentModal';
import { productService, Product } from '../../../services/productService';
import { categoryService, Category } from '../../../services/categoryService';
import { orderService } from '../../../services/orderService';
import * as Print from 'expo-print';
import { generateReceiptHtml } from '../../../utils/receiptGenerator';

export default function CashierScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Cart State
    const [cart, setCart] = useState<CartItemType[]>([]);
    const [customerName, setCustomerName] = useState('');

    // Payment Modal State
    const [processing, setProcessing] = useState(false);
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [prods, cats] = await Promise.all([
                    productService.getProducts(),
                    categoryService.getCategories('', 1, 1000)
                ]);
                setProducts(prods);
                setCategories(cats.data);
            } catch (error) {
                console.error(error);
                Alert.alert("Error", "Gagal memuat data produk");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    // Cart Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = 0; // Can be configured later
    const total = subtotal + tax; // Initial total before discount in modal

    // Handlers
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const handleOpenPayment = () => {
        if (cart.length === 0) {
            Alert.alert("Error", "Keranjang kosong");
            return;
        }
        if (!customerName.trim()) {
            Alert.alert("Validasi", "Masukkan nama pelanggan");
            return;
        }
        setPaymentModalVisible(true);
    };

    const handleConfirmPayment = async (
        finalAmount: number,
        paymentMethod: 'cash' | 'qris',
        discount: number,
        cashReceived?: number,
        change?: number
    ) => {
        try {
            setProcessing(true);
            const orderItems = cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
                // Note: Item subtotal is pre-discount. Discount is applied to Order.
            }));

            const orderData = await orderService.createOrder({
                customer_name: customerName,
                total_amount: finalAmount,
                status: 'completed',
                payment_method: paymentMethod,
            }, orderItems);

            // Trigger Stock Deduction (Async, don't block UI success)
            if (orderData?.id) {
                orderService.processStockDeduction(orderData.id);
            }

            setPaymentModalVisible(false);

            // Auto-Print Receipt
            try {
                const html = generateReceiptHtml(
                    { ...orderData, payment_method: paymentMethod },
                    cart,
                    customerName,
                    change || 0,
                    cashReceived || 0
                );
                await Print.printAsync({
                    html,
                });
            } catch (printError) {
                console.error("Print Error:", printError);
                Alert.alert("Info", "Gagal mencetak struk otomatis");
            }

            Alert.alert("Sukses", `Transaksi Berhasil!\nKembalian: Rp ${(change || 0).toLocaleString()}`, [
                {
                    text: "OK",
                    onPress: () => {
                        setCart([]);
                        setCustomerName('');
                    }
                }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Transaksi gagal diproses");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 flex-row">
                <KasirSidebar activeMenu="cashier" />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 flex-row">
            <KasirSidebar activeMenu="cashier" />

            {/* Main Content Area */}
            <View className="flex-1 flex-row">

                {/* LEFT PANEL: Menu & Products */}
                <View className="flex-1 p-6 pr-3">
                    <View className="flex-row items-center justify-between mb-6">
                        <View>
                            <Text className="text-2xl font-bold text-gray-900">Order</Text>
                            <Text className="text-gray-500 text-sm">Pilih menu untuk pesanan baru</Text>
                        </View>

                        <View className="flex-row bg-white border border-gray-200 rounded-xl px-4 py-2 items-center w-64 shadow-sm">
                            <Search size={20} color="#9CA3AF" />
                            <TextInput
                                placeholder="Search menu..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                className="flex-1 ml-2 text-gray-800"
                            />
                        </View>
                    </View>

                    <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                    />

                    <FlatList
                        data={filteredProducts}
                        keyExtractor={item => item.id}
                        numColumns={3} // Responsive grid logic might be needed for smaller screens
                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                        renderItem={({ item }) => (
                            <ProductCard product={item} onAddToCart={addToCart} />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                </View>

                {/* RIGHT PANEL: Cart & Checkout */}
                <View className="w-[380px] bg-white border-l border-gray-100 p-6 shadow-sm flex-col h-full">
                    <Text className="text-xl font-bold text-gray-900 mb-6">Order Details</Text>

                    {/* Customer Info */}
                    <View className="mb-6">
                        <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Customer Name</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                            <User size={18} color="#6B7280" />
                            <TextInput
                                placeholder="Nama Pelanggan / Meja"
                                value={customerName}
                                onChangeText={setCustomerName}
                                className="flex-1 ml-3 text-gray-900 font-medium"
                            />
                        </View>
                    </View>

                    {/* Cart Items */}
                    <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Current Order</Text>
                    <View className="flex-1 bg-gray-50 rounded-2xl p-2 mb-4">
                        {cart.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <ShoppingCart size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-2 font-medium">Keranjang Kosong</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={cart}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <CartItem
                                        item={item}
                                        onUpdateQuantity={updateQuantity}
                                        onRemove={removeFromCart}
                                    />
                                )}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>

                    {/* Summary & Checkout */}
                    <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-500 font-medium">Subtotal</Text>
                            <Text className="text-gray-900 font-bold">Rp {subtotal.toLocaleString()}</Text>
                        </View>
                        <View className="flex-row justify-between mb-4 pb-4 border-b border-gray-200 border-dashed">
                            <Text className="text-gray-500 font-medium">Diskon</Text>
                            <Text className="text-gray-900 font-bold">-</Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-gray-800 text-lg font-bold">Total</Text>
                            <Text className="text-indigo-600 text-xl font-bold">Rp {total.toLocaleString()}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleOpenPayment}
                            disabled={processing || cart.length === 0}
                            className={`bg-indigo-600 py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-indigo-200 ${processing || cart.length === 0 ? 'opacity-50' : ''}`}
                        >
                            {processing ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ticket color="white" size={20} className="mr-2" />
                                    <Text className="text-white font-bold text-lg">Process Payment</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

            </View>

            {/* Payment Modal */}
            <PaymentModal
                visible={isPaymentModalVisible}
                onClose={() => setPaymentModalVisible(false)}
                subtotal={total}
                onConfirm={handleConfirmPayment}
                loading={processing}
            />
        </View>
    );
}
