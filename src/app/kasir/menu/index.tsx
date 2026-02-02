import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';
import { productService, Product } from '../../../services/productService';
import { categoryService, Category } from '../../../services/categoryService';

export default function KasirMenuScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [productsData, categoriesData] = await Promise.all([
                productService.getProducts(),
                categoryService.getCategories()
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error(error);
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

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <View className="flex-1 flex-row bg-gray-50">
            <KasirSidebar activeMenu="menu" />

            <View className="flex-1">
                <ScrollView 
                    contentContainerStyle={{ padding: 32 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <View className="flex-row justify-between items-center mb-8">
                         {/* Search Bar */}
                        <View className="flex-1 max-w-md relative">
                            <View className="absolute left-4 top-3 z-10">
                                <Search size={20} color="#9CA3AF" />
                            </View>
                            <TextInput
                                className="bg-white border border-gray-200 pl-12 pr-4 py-3 rounded-full text-gray-800"
                                placeholder="Search menu"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <View className="flex-row items-center gap-4">
                             <Text className="text-4xl font-bold text-gray-900">Tambah Menu</Text>
                             <TouchableOpacity 
                                onPress={() => router.push('/kasir/menu/add')}
                                className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200"
                             >
                                <Plus size={24} color="white" />
                             </TouchableOpacity>
                        </View>
                    </View>

                    {/* Categories Filter */}
                    <View className="flex-row gap-3 mb-8">
                        <TouchableOpacity
                            onPress={() => setSelectedCategory('all')}
                            className={`px-6 py-2 rounded-full border ${selectedCategory === 'all' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-200'}`}
                        >
                            <Text className={`${selectedCategory === 'all' ? 'text-white' : 'text-indigo-400'} font-medium`}>All</Text>
                        </TouchableOpacity>
                        
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setSelectedCategory(cat.id)}
                                className={`px-6 py-2 rounded-full border ${selectedCategory === cat.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-200'}`}
                            >
                                <Text className={`${selectedCategory === cat.id ? 'text-white' : 'text-indigo-400'} font-medium`}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Product Grid */}
                    {loading ? (
                        <View className="py-20 items-center">
                            <ActivityIndicator size="large" color="#4f46e5" />
                        </View>
                    ) : (
                        <View className="flex-row flex-wrap gap-6">
                            {filteredProducts.map(product => (
                                <View key={product.id} className="w-[300px] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <View className="h-48 bg-gray-200 relative">
                                        {/* Image Placeholder or Actual Image */}
                                        {product.image_url ? (
                                            <Image source={{ uri: product.image_url }} className="w-full h-full" resizeMode="cover" />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center bg-gray-100">
                                                 <Text className="text-gray-400 text-3xl font-bold">{product.name.charAt(0)}</Text>
                                            </View>
                                        )}
                                        
                                        {/* Category Badge */}
                                        <View className="absolute top-4 right-4 bg-indigo-600 px-3 py-1 rounded-full">
                                            <Text className="text-white text-xs font-bold">{product.categories?.name || 'Uncategorized'}</Text>
                                        </View>
                                    </View>

                                    <View className="p-5">
                                        <Text className="text-xl font-bold text-gray-900 mb-1">{product.name}</Text>
                                        <Text className="text-gray-500 mb-4">{formatCurrency(product.price)}</Text>
                                        
                                        <TouchableOpacity 
                                            onPress={() => router.push(`/kasir/menu/${product.id}`)}
                                            className="bg-indigo-600 py-2 rounded-full items-center"
                                        >
                                            <Text className="text-white font-bold">Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            
                            {filteredProducts.length === 0 && (
                                <View className="w-full py-20 items-center">
                                    <Text className="text-gray-400 text-lg">Menu tidak ditemukan</Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
