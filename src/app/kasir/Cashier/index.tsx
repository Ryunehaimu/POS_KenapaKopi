import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
import { Asset } from 'expo-asset';
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import { generateReceiptHtml } from '../../../utils/receiptGenerator';
import { printerService } from '../../../services/printerService';

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
    const [note, setNote] = useState('');
    const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined);

    useEffect(() => {
        const loadLogo = async () => {
            try {
                const asset = Asset.fromModule(require('../../../../assets/splash-custom.png'));
                await asset.downloadAsync();
                if (asset.localUri) {
                    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
                        encoding: 'base64',
                    });
                    setLogoBase64(base64);
                    console.log("Logo loaded successfully, length:", base64.length);
                } else {
                    console.warn("Asset localUri is null");
                }
            } catch (error) {
                console.warn("Failed to load receipt logo:", error);
            }
        };
        loadLogo();
    }, []);

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

    const updateNote = (id: string, note: string) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, note };
            }
            return item;
        }));
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
                subtotal: item.price * item.quantity,
                note: item.note // Pass item note
                // Note: Item subtotal is pre-discount. Discount is applied to Order.
            }));

            const orderData = await orderService.createOrder({
                customer_name: customerName,
                total_amount: finalAmount,
                status: 'completed',
                payment_method: paymentMethod,
                note: note // Pass the note
            }, orderItems);

            // Trigger Stock Deduction (Async, don't block UI success)
            if (orderData?.id) {
                orderService.processStockDeduction(orderData.id);
            }

            setPaymentModalVisible(false);

            // Auto-Print Receipt
            try {
                // Try Bluetooth thermal printer first
                if (printerService.isConnected()) {
                    await printerService.printReceipt(
                        { ...orderData, payment_method: paymentMethod, note },
                        cart,
                        customerName,
                        change || 0,
                        cashReceived || 0,
                        logoBase64
                    );
                } else {
                    // Fallback: Try to auto-connect to saved printer
                    const autoConnected = await printerService.autoConnect();
                    if (autoConnected) {
                        await printerService.printReceipt(
                            { ...orderData, payment_method: paymentMethod, note },
                            cart,
                            customerName,
                            change || 0,
                            cashReceived || 0,
                            logoBase64
                        );
                    } else {
                        // Ultimate fallback: use expo-print dialog
                        const html = generateReceiptHtml(
                            { ...orderData, payment_method: paymentMethod, note },
                            cart,
                            customerName,
                            change || 0,
                            cashReceived || 0,
                            logoBase64
                        );
                        await Print.printAsync({ html });
                    }
                }
            } catch (printError) {
                console.error("Print Error:", printError);
                // Fallback to expo-print on error
                try {
                    const html = generateReceiptHtml(
                        { ...orderData, payment_method: paymentMethod, note },
                        cart,
                        customerName,
                        change || 0,
                        cashReceived || 0,
                        logoBase64
                    );
                    await Print.printAsync({ html });
                } catch (fallbackError) {
                    Alert.alert("Info", "Gagal mencetak struk");
                }
            }

            Alert.alert("Sukses", `Transaksi Berhasil!\nKembalian: Rp ${(change || 0).toLocaleString()}`, [
                {
                    text: "OK",
                    onPress: () => {
                        setCart([]);
                        setCustomerName('');
                        setNote('');
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
                <View className="w-[380px] bg-white border-l border-gray-100 shadow-sm flex-col h-full">
                    <KeyboardAwareScrollView
                        enableOnAndroid={true}
                        extraScrollHeight={100}
                        contentContainerStyle={{ padding: 24, flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
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

                        {/* Global Note Input */}
                        <View className="mb-6">
                            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Catatan Umum</Text>
                            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                <TextInput
                                    placeholder="Tambah catatan transaksi..."
                                    value={note}
                                    onChangeText={setNote}
                                    className="flex-1 text-gray-900 font-medium"
                                />
                            </View>
                        </View>

                        {/* Cart Items */}
                        <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Current Order</Text>
                        <View className="bg-gray-50 rounded-2xl p-2 mb-4 min-h-[200px]">
                            {cart.length === 0 ? (
                                <View className="h-48 items-center justify-center">
                                    <ShoppingCart size={48} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-2 font-medium">Keranjang Kosong</Text>
                                </View>
                            ) : (
                                <View>
                                    {cart.map(item => (
                                        <CartItem
                                            key={item.id}
                                            item={item}
                                            onUpdateQuantity={updateQuantity}
                                            onRemove={removeFromCart}
                                            onUpdateNote={updateNote}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Summary & Checkout */}
                        <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-auto">
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
                    </KeyboardAwareScrollView>
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
        </View >
    );
}
