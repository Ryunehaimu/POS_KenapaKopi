import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, ChevronLeft, Trash2, Edit } from 'lucide-react-native';
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
    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm flex-row items-center justify-between border border-gray-100">
      <View>
        <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
        <Text className="text-xs text-gray-400">ID: ...{item.id.slice(-6)}</Text>
      </View>
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.push(`/owner/categories/${item.id}`)}
          className="p-2 bg-indigo-50 rounded-lg"
        >
          <Edit size={20} color="#4f46e5" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.name)}
          className="p-2 bg-red-50 rounded-lg"
        >
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-6 shadow-sm z-10">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Manajemen Kategori</Text>
          <View className="w-8" />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-gray-400">Belum ada kategori</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/owner/categories/add')}
        className="absolute bottom-8 right-8 bg-indigo-600 w-14 h-14 rounded-full shadow-lg items-center justify-center"
      >
        <Plus size={30} color="white" />
      </TouchableOpacity>
      <OwnerBottomNav />
    </View>
  );
}
