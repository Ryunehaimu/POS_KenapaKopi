import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { productService, Product } from '../../../services/productService';
import { categoryService, Category } from '../../../services/categoryService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

export default function OwnerMenuScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [productsData, categoriesData] = await Promise.all([
                productService.getProducts(),
                categoryService.getCategories('', 1, 1000)
            ]);
            setProducts(productsData);
            setCategories(categoriesData.data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data menu");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            "Hapus Menu",
            `Apakah Anda yakin ingin menghapus ${name}?`,
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await productService.deleteProduct(id);
                            fetchData(); // Reload
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Gagal menghapus menu");
                        }
                    }
                }
            ]
        );
    };

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'all') return products;
        return products.filter(p => p.category_id === selectedCategory);
    }, [products, selectedCategory]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* HEADER */}
            <LinearGradient
                colors={['#4c1d95', '#7c3aed']}
                className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative"
            >
                <View className="flex-row items-center justify-center mb-6 relative">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute left-0 p-2 bg-white/20 rounded-full"
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">Menus</Text>
                </View>

                <Text className="text-white text-sm font-medium mb-2">Summary</Text>
            </LinearGradient>

            {/* SUMMARY CARDS */}
            <View className="px-6 -mt-16 mb-6">
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                        <Text className="text-indigo-600 text-3xl font-bold">{products.length}</Text>
                        <Text className="text-gray-400 text-xs mt-1">Total Menu</Text>
                    </View>
                    <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                        <Text className="text-indigo-600 text-3xl font-bold">{categories.length}</Text>
                        <Text className="text-gray-400 text-xs mt-1">Total Kategori</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-xl font-bold text-indigo-900">List Menu</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/owner/menu/add')}
                        className="flex-row items-center bg-indigo-600 px-4 py-2 rounded-xl"
                    >
                        <Plus size={18} color="white" />
                        <Text className="text-white font-bold ml-2">Tambah</Text>
                    </TouchableOpacity>
                </View>

                {/* CATEGORY TABS */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-6 px-6">
                    <TouchableOpacity
                        onPress={() => setSelectedCategory('all')}
                        className={`mr-3 px-5 py-2 rounded-xl border ${selectedCategory === 'all' ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                    >
                        <Text className={`${selectedCategory === 'all' ? 'text-white' : 'text-gray-700'} font-bold text-sm`}>All</Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => setSelectedCategory(cat.id)}
                            className={`mr-3 px-5 py-2 rounded-xl border ${selectedCategory === cat.id ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                        >
                            <Text className={`${selectedCategory === cat.id ? 'text-white' : 'text-gray-700'} font-bold text-sm`}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* MENU LIST */}
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#4c1d95" className="mt-10" />
                ) : (
                    <View className="space-y-4">
                        {filteredProducts.map(item => (
                            <View key={item.id} className="bg-white p-3 rounded-2xl shadow-sm flex-row items-center gap-4">
                                {/* Image */}
                                <View className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden">
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} className="w-full h-full" resizeMode="cover" />
                                    ) : (
                                        <View className="w-full h-full items-center justify-center">
                                            <Text className="text-gray-400 text-2xl font-bold">{item.name.charAt(0)}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Info */}
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>{item.name}</Text>
                                    <Text className="text-gray-400 text-xs mb-2 leading-relaxed" numberOfLines={2}>
                                        {item.description || 'No description'}
                                    </Text>
                                    <Text className="text-red-500 font-bold text-base">{formatCurrency(item.price)}</Text>
                                </View>

                                {/* Actions */}
                                <View className="flex-col gap-2">
                                    <TouchableOpacity
                                        onPress={() => router.push(`/owner/menu/edit/${item.id}`)}
                                        className="bg-indigo-500 p-2 rounded-lg items-center justify-center"
                                    >
                                        <Edit2 size={16} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id, item.name)}
                                        className="bg-red-500 p-2 rounded-lg items-center justify-center"
                                    >
                                        <Trash2 size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {filteredProducts.length === 0 && (
                            <Text className="text-center text-gray-400 mt-10">Tidak ada menu di kategori ini.</Text>
                        )}
                    </View>
                )}
            </ScrollView>
            <OwnerBottomNav />
        </View>
    );
}
