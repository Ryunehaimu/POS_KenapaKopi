import React, { useState, useEffect, useMemo, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
// import { useRouter } from 'expo-router'; // Removed unused import
import { Search, ShoppingCart, User, Ticket } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';

// Stable wrapper to prevent KasirSidebar from re-rendering on parent state changes
const StableSidebar = memo(() => <KasirSidebar activeMenu="cashier" />);

import { ProductCard } from '../../../components/cashier/ProductCard';
import { CategoryFilter } from '../../../components/cashier/CategoryFilter';
import { CartItem, CartItemType } from '../../../components/cashier/CartItem';
import { PaymentModal } from '../../../components/cashier/PaymentModal';
import { productService, Product } from '../../../services/productService';
import { categoryService, Category } from '../../../services/categoryService';
import { orderService } from '../../../services/orderService';
import * as Print from 'expo-print';
import { generateReceiptHtml } from '../../../utils/receiptGenerator';
import { printerService } from '../../../services/printerService';

export default function CashierScreen() {
    // const router = useRouter(); // Removed unused hook

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Cart State
    const [cart, setCart] = useState<CartItemType[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [note, setNote] = useState('');
    // Logo is now a constant: RECEIPT_LOGO_BASE64

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

    // Transaction Type State
    type TransactionType = 'outlet' | 'gojek' | 'grab' | 'shopee';
    const [transactionType, setTransactionType] = useState<TransactionType>('outlet');

    // Helper to get price based on type
    const getPrice = (product: Product, type: TransactionType) => {
        switch (type) {
            case 'gojek': return product.price_gojek || product.price;
            case 'grab': return product.price_grab || product.price;
            case 'shopee': return product.price_shopee || product.price;
            default: return product.price;
        }
    };

    // Filter Products & Adjust Price
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
            return matchesSearch && matchesCategory;
        }).map(p => ({
            ...p,
            price: getPrice(p, transactionType) // Override price for display & cart
        }));
    }, [products, searchQuery, selectedCategory, transactionType]);

    // Update Cart when Transaction Type changes
    useEffect(() => {
        setCart(prev => prev.map(item => {
            // Find original product to get all price fields
            const originalProduct = products.find(p => p.id === item.id);
            if (!originalProduct) return item;

            return {
                ...item,
                price: getPrice(originalProduct, transactionType)
            };
        }));
    }, [transactionType, products]);

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

        // For online orders (Gojek/Grab/Shopee), skip modal and process directly
        if (transactionType !== 'outlet') {
            handleOnlineOrderPayment();
            return;
        }

        setPaymentModalVisible(true);
    };

    // Handle payment for online orders (Gojek/Grab/Shopee)
    const handleOnlineOrderPayment = async () => {
        try {
            setProcessing(true);

            const orderItems = cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity,
                note: item.note
            }));

            const orderData = await orderService.createOrder({
                customer_name: `${customerName} (${transactionType.toUpperCase()})`,
                total_amount: total,
                status: 'completed',
                payment_method: transactionType as any, // gojek, grab, shopee
                note: note
            }, orderItems);

            // Trigger Stock Deduction
            if (orderData?.id) {
                orderService.processStockDeduction(orderData.id);
            }

            // Print receipt for online order
            try {
                if (printerService.isConnected()) {
                    await printerService.printReceipt(
                        { ...orderData, payment_method: transactionType, note, discount: 0 },
                        cart,
                        customerName,
                        0,
                        total,
                        `--- ${transactionType.toUpperCase()} ORDER ---`
                    );
                } else {
                    const autoConnected = await printerService.autoConnect();
                    if (autoConnected) {
                        await printerService.printReceipt(
                            { ...orderData, payment_method: transactionType, note, discount: 0 },
                            cart,
                            customerName,
                            0,
                            total,
                            `--- ${transactionType.toUpperCase()} ORDER ---`
                        );
                    } else {
                        // Printer not connected - skip first print
                    }
                }
            } catch (printError) {
                console.log("Print error for online order:", printError);
            }

            Alert.alert(
                "Sukses",
                `Order ${transactionType.toUpperCase()} Berhasil!\nTotal: Rp ${total.toLocaleString()}`,
                [{
                    text: "OK",
                    onPress: async () => {
                        // Print second copy (Archive/Kasir)
                        try {
                            if (printerService.isConnected()) {
                                await printerService.printReceipt(
                                    { ...orderData, payment_method: transactionType, note, discount: 0 },
                                    cart,
                                    customerName,
                                    0,
                                    total,
                                    `--- KASIR/ARSIP (${transactionType.toUpperCase()}) ---`
                                );
                            } else {
                                const autoConnected = await printerService.autoConnect();
                                if (autoConnected) {
                                    await printerService.printReceipt(
                                        { ...orderData, payment_method: transactionType, note, discount: 0 },
                                        cart,
                                        customerName,
                                        0,
                                        total,
                                        `--- KASIR/ARSIP (${transactionType.toUpperCase()}) ---`
                                    );
                                } else {
                                    // Printer not connected - skip second print
                                }
                            }
                        } catch (e) {
                            console.log("Failed to print second copy for online order", e);
                        }

                        setCart([]);
                        setCustomerName('');
                        setNote('');
                        setTransactionType('outlet');
                    }
                }]
            );
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memproses order");
        } finally {
            setProcessing(false);
        }
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
                customer_name: `${customerName} (${transactionType.toUpperCase()})`, // Append type to name for clarity in backend/history
                total_amount: finalAmount,
                status: 'completed',
                payment_method: paymentMethod,
                note: note, // Pass the note
                discount: discount // Pass the discount
            }, orderItems);

            // Trigger Stock Deduction (Async, don't block UI success)
            if (orderData?.id) {
                orderService.processStockDeduction(orderData.id);
            }

            setPaymentModalVisible(false);

            // Auto-Print Receipt (COPY 1 - CUSTOMER)
            try {
                // Try Bluetooth thermal printer first
                if (printerService.isConnected()) {
                    await printerService.printReceipt(
                        { ...orderData, payment_method: paymentMethod, note, discount },
                        cart,
                        customerName,
                        change || 0,
                        cashReceived || 0,
                        ''
                    );
                } else {
                    // Fallback: Try to auto-connect to saved printer
                    const autoConnected = await printerService.autoConnect();
                    if (autoConnected) {
                        await printerService.printReceipt(
                            { ...orderData, payment_method: paymentMethod, note, discount },
                            cart,
                            customerName,
                            change || 0,
                            cashReceived || 0,
                            ''
                        );
                    } else {
                        // Ultimate fallback: use expo-print dialog
                        const html = generateReceiptHtml(
                            { ...orderData, payment_method: paymentMethod, note, discount },
                            cart,
                            customerName,
                            change || 0,
                            cashReceived || 0
                        );
                        await Print.printAsync({ html });
                    }
                }
            } catch (printError) {
                console.error("Print Error:", printError);
                // Fallback to expo-print on error
                try {
                    const html = generateReceiptHtml(
                        { ...orderData, payment_method: paymentMethod, note, discount },
                        cart,
                        customerName,
                        change || 0,
                        cashReceived || 0
                    );
                    await Print.printAsync({ html });
                } catch (fallbackError) {
                    Alert.alert("Info", "Gagal mencetak struk");
                }
            }

            Alert.alert("Sukses", `Transaksi Berhasil!\nKembalian: Rp ${(change || 0).toLocaleString()}`, [
                {
                    text: "OK",
                    onPress: async () => {
                        // PRINT COPY 2 - STORE/ARCHIVE
                        try {
                            if (printerService.isConnected()) {
                                await printerService.printReceipt(
                                    { ...orderData, payment_method: paymentMethod, note },
                                    cart,
                                    customerName,
                                    change || 0,
                                    cashReceived || 0,
                                    '--- KASIR/ARSIP ---'
                                );
                            } else {
                                const autoConnected = await printerService.autoConnect();
                                if (autoConnected) {
                                    await printerService.printReceipt(
                                        { ...orderData, payment_method: paymentMethod, note },
                                        cart,
                                        customerName,
                                        change || 0,
                                        cashReceived || 0,
                                        '--- KASIR/ARSIP ---'
                                    );
                                }
                            }
                        } catch (e) {
                            console.log("Failed to print second copy", e);
                            // Silent fail for second copy or show toast
                        }

                        setCart([]);
                        setCustomerName('');
                        setNote('');
                        setTransactionType('outlet'); // Reset to default
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
                <StableSidebar />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 flex-row">
            <StableSidebar />

            {/* Main Content Area */}
            <View className="flex-1 flex-row">

                {/* LEFT PANEL: Menu & Products */}
                <View className="flex-1 p-6 pr-3">
                    <View className="flex-col mb-6">
                        <View className="flex-row items-center justify-between mb-4">
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

                        {/* Transaction Type Selector - Using inline styles to bypass NativeWind */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Tipe Transaksi</Text>
                            <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 12 }}>
                                {(['outlet', 'gojek', 'grab', 'shopee'] as TransactionType[]).map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setTransactionType(type)}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 8,
                                            borderRadius: 8,
                                            alignItems: 'center',
                                            backgroundColor: transactionType === type ? '#4F46E5' : 'transparent',
                                        }}
                                    >
                                        <Text style={{
                                            fontWeight: 'bold',
                                            fontSize: 12,
                                            textTransform: 'capitalize',
                                            color: transactionType === type ? '#FFFFFF' : '#4B5563'
                                        }}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
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

                            <View className="flex-col gap-3">
                                <TouchableOpacity
                                    onPress={async () => {
                                        if (cart.length === 0) {
                                            Alert.alert("Error", "Keranjang kosong");
                                            return;
                                        }
                                        if (!customerName.trim()) {
                                            Alert.alert("Validasi", "Masukkan nama pelanggan");
                                            return;
                                        }

                                        Alert.alert("Konfirmasi", "Simpan transaksi sebagai 'Bayar Nanti'?", [
                                            { text: "Batal", style: "cancel" },
                                            {
                                                text: "Ya, Simpan",
                                                onPress: async () => {
                                                    try {
                                                        setProcessing(true);
                                                        const orderItems = cart.map(item => ({
                                                            product_id: item.id,
                                                            quantity: item.quantity,
                                                            price: item.price,
                                                            subtotal: item.price * item.quantity,
                                                            note: item.note
                                                        }));

                                                        const orderData = await orderService.createOrder({
                                                            customer_name: customerName,
                                                            total_amount: total,
                                                            status: 'pending',
                                                            payment_method: 'cash', // Placeholder to force view_file first 'cash' officially but status pending
                                                            note: note
                                                        }, orderItems);

                                                        if (orderData?.id) {
                                                            orderService.processStockDeduction(orderData.id);
                                                        }

                                                        Alert.alert("Sukses", "Transaksi disimpan (Belum Dibayar)");
                                                        setCart([]);
                                                        setCustomerName('');
                                                        setNote('');
                                                    } catch (error) {
                                                        console.error(error);
                                                        Alert.alert("Error", "Gagal menyimpan transaksi");
                                                    } finally {
                                                        setProcessing(false);
                                                    }
                                                }
                                            }
                                        ]);
                                    }}
                                    disabled={processing || cart.length === 0}
                                    className={`w-full bg-orange-100 py-4 rounded-xl flex-row justify-center items-center ${processing || cart.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-orange-700 font-bold text-lg">Bayar Nanti</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleOpenPayment}
                                    disabled={processing || cart.length === 0}
                                    className={`w-full bg-indigo-600 py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-indigo-200 ${processing || cart.length === 0 ? 'opacity-50' : ''}`}
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
