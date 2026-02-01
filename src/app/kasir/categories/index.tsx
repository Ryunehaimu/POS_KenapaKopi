import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Edit, Trash2 } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';
import { categoryService, Category } from '../../../services/categoryService';

export default function KasirCategoryScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat kategori');
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
               console.error(e);
               Alert.alert("Gagal", "Tidak dapat menghapus kategori. Mungkin sedang digunakan.");
             }
          }
        }
      ]
    );
  };

  const renderCategoryRow = ({ item }: { item: Category }) => (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
       <View className="flex-row items-center flex-1">
          {/* Checkbox Placeholder */}
          <View className="w-5 h-5 rounded border border-gray-300 mr-4" />
          
          <Text className="font-bold text-gray-800 text-base">{item.name}</Text>
       </View>
       
       <View className="flex-1">
          <Text className="text-gray-500">Standard</Text>
       </View>

       <View className="flex-1">
          <Text className="text-gray-500">{new Date(item.created_at).toLocaleDateString()}</Text>
       </View>

       <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push(`/kasir/categories/${item.id}`)} className="p-2">
             <Edit size={18} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} className="p-2">
             <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
       </View>
    </View>
  );

  return (
    <View className="flex-1 flex-row bg-gray-50">
       {/* 1. SIDEBAR NAVIGATION */}
       <KasirSidebar activeMenu="categories" />

       {/* 2. MAIN CONTENT AREA */}
       <View className="flex-1">
          <ScrollView contentContainerStyle={{ padding: 32 }}>
             
             {/* Header Title */}
             <Text className="text-4xl font-bold text-gray-900 mb-8">Kategori Menu</Text>

             {/* Summary Cards */}
             <View className="flex-row gap-6 mb-8">
                <View className="flex-1 bg-sky-50 rounded-3xl p-6 h-32 justify-center">
                   <Text className="text-gray-500 text-sm font-medium mb-1">Total Kategori</Text>
                   <View className="flex-row items-baseline">
                      <Text className="text-4xl font-bold text-gray-900 mr-2">{categories.length}</Text>
                      <Text className="text-gray-500">Items</Text>
                   </View>
                </View>

                <View className="flex-1 bg-gray-100 rounded-3xl p-6 h-32 justify-center">
                   <Text className="text-gray-500 text-sm font-medium mb-1">Status Aktif</Text>
                   <View className="flex-row items-baseline">
                      <Text className="text-4xl font-bold text-gray-900 mr-2">{categories.length}</Text>
                      <Text className="text-gray-500">Available</Text>
                   </View>
                </View>

                <View className="flex-1 bg-indigo-50 rounded-3xl p-6 h-32 justify-center">
                   <Text className="text-indigo-600 text-sm font-medium mb-1">New Category</Text>
                   <TouchableOpacity onPress={() => router.push('/kasir/categories/add')} className="flex-row items-center mt-2">
                       <View className="bg-indigo-600 p-2 rounded-full mr-2">
                           <Plus size={16} color="white" />
                       </View>
                       <Text className="text-indigo-900 font-bold">Tambah Baru</Text>
                   </TouchableOpacity>
                </View>
             </View>

             {/* Table Section */}
             <View className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[500px]">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-gray-900">Daftar Kategori</Text>
                    <TouchableOpacity 
                        onPress={() => router.push('/kasir/categories/add')}
                        className="bg-indigo-600 px-5 py-3 rounded-xl flex-row items-center shadow-lg shadow-indigo-200"
                    >
                        <Plus size={20} color="white" className="mr-2" />
                        <Text className="text-white font-bold">Tambah</Text>
                    </TouchableOpacity>
                </View>

                {/* Table Header */}
                <View className="flex-row items-center py-4 border-b border-gray-200 mb-2">
                   <View className="flex-row items-center flex-1">
                      <View className="w-5 h-5 rounded border border-gray-300 mr-4" />
                      <Text className="text-gray-500 font-medium text-sm">Nama Kategori</Text>
                   </View>
                   <View className="flex-1">
                      <Text className="text-gray-500 font-medium text-sm">Tipe</Text>
                   </View>
                   <View className="flex-1">
                      <Text className="text-gray-500 font-medium text-sm">Last updated</Text>
                   </View>
                   <View className="w-20">
                      <Text className="text-gray-500 font-medium text-sm">Action</Text>
                   </View>
                </View>

                {/* Table Content */}
                {loading ? (
                   <View className="py-20 items-center">
                      <ActivityIndicator size="large" color="#4f46e5" />
                   </View>
                ) : (
                   <View>
                      {categories.map(item => (
                         <View key={item.id}>{renderCategoryRow({ item })}</View>
                      ))}
                      {categories.length === 0 && (
                          <View className="py-20 items-center">
                              <Text className="text-gray-400">Belum ada kategori data.</Text>
                          </View>
                      )}
                   </View>
                )}
             </View>
          </ScrollView>
       </View>
    </View>
  );
}
