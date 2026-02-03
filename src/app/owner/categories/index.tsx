import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, ChevronLeft, Trash2, Edit2, Grid } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { categoryService, Category } from '../../../services/categoryService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      // Alert.alert('Error', 'Gagal memuat kategori');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Hapus Kategori",
      `Apakah Anda yakin ingin menghapus kategori "${name}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await categoryService.deleteCategory(id);
              fetchCategories();
            } catch (e) {
              Alert.alert("Gagal", "Tidak dapat menghapus kategori. Mungkin sedang digunakan.");
            }
          }
        }
      ]
    );
  }

  const renderItem = ({ item }: { item: Category }) => (
    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm flex-row items-center justify-between border-b border-gray-100">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
            <Grid size={20} color="#4f46e5" />
        </View>
        <View>
            <Text className="text-base font-bold text-gray-800">{item.name}</Text>
            <Text className="text-xs text-gray-400">ID: ...{item.id.slice(-6)}</Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => router.push(`/owner/categories/${item.id}`)}
          className="bg-indigo-500 p-2 rounded-lg"
        >
          <Edit2 size={16} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.name)}
          className="bg-red-500 p-2 rounded-lg"
        >
          <Trash2 size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <LinearGradient
        colors={['#4c1d95', '#7c3aed']}
        className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative"
      >
        <View className="flex-row items-center mb-6 relative">
            <TouchableOpacity
                onPress={() => router.back()}
                className="p-2 bg-white/20 rounded-full mr-4"
            >
                <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Manajemen Kategori</Text>
        </View>
        <Text className="text-white text-sm font-medium mb-2">Total Kategori: {categories.length}</Text>
      </LinearGradient>

      {/* Summary / Content overlapping header */}
      <View className="flex-1 px-6 -mt-16">
        {/* Simple Summary Card to mimic employee page style impact */}
        <View className="bg-white p-4 rounded-xl shadow-sm mb-4 flex-row items-center justify-between">
             <View>
                <Text className="text-indigo-600 text-3xl font-bold">{categories.length}</Text>
                <Text className="text-gray-400 text-xs mt-1">Total Kategori Menu</Text>
             </View>
             <View className="w-12 h-12 bg-indigo-50 rounded-full items-center justify-center">
                 <Grid size={24} color="#4f46e5" />
             </View>
        </View>

        {loading ? (
            <View className="flex-1 justify-center items-center mt-10">
            <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        ) : (
            <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View className="items-center justify-center py-20 bg-white rounded-xl shadow-sm mt-2">
                <Text className="text-gray-400">Belum ada kategori</Text>
                </View>
            }
            />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/owner/categories/add')}
        className="absolute bottom-24 right-6 bg-indigo-600 w-14 h-14 rounded-full shadow-lg items-center justify-center z-50"
      >
        <Plus size={30} color="white" />
      </TouchableOpacity>
      
      <OwnerBottomNav />
    </View>
  );
}
