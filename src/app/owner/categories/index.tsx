import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, ChevronLeft, Trash2, Edit2, Grid, Search, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { categoryService, Category } from '../../../services/categoryService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories(searchQuery, currentPage, 5); // Limit 5
      setCategories(data.data);
      setTotalItems(data.count || 0);
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

  // Trigger fetch on search or page change (skip initial load as useFocusEffect handles it, 
  // but we need to ensure we don't double fetch. Actually useFocusEffect is safer for navigation back.
  // Let's add specific effect for search/page changes EXCEPT initial mount if useFocus covers it.
  // Simpler: useFocusEffect re-runs on focus. useEffect runs on dependency change.
  // To avoid conflict, let's keep useFocusEffect for "On Screen Entry" to refresh data.
  // And useEffect for local state changes. 
  useEffect(() => {
    fetchCategories();
  }, [searchQuery, currentPage]);

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
        <View className="flex-row items-center justify-center mb-6 relative">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-0 p-2 bg-white/20 rounded-full"
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold text-center">Manajemen Kategori</Text>
        </View>
      </LinearGradient>

      {/* Summary / Content overlapping header */}
      <View className="flex-1 px-6 -mt-16">
        {/* Simple Summary Card to mimic employee page style impact */}
        <View className="bg-white p-4 rounded-xl shadow-sm mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-indigo-600 text-3xl font-bold">{totalItems}</Text>
            <Text className="text-gray-400 text-xs mt-1">Total Kategori Menu</Text>
          </View>
          <View className="w-12 h-12 bg-indigo-50 rounded-full items-center justify-center">
            <Grid size={24} color="#4f46e5" />
          </View>
        </View>

        {/* Search Input */}
        <View className="bg-white rounded-xl px-4 py-3 flex-row items-center border border-gray-100 mb-4 shadow-sm">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Cari Kategori..."
            className="flex-1 ml-2 text-gray-800"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setCurrentPage(1);
            }}
          />
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center mt-10">
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 200, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="items-center justify-center py-20 bg-white rounded-xl shadow-sm mt-2">
                  <Text className="text-gray-400">Kategori tidak ditemukan</Text>
                </View>
              }
            />

            {/* Pagination Controls */}
            <View className="absolute bottom-24 left-6 right-6 flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <TouchableOpacity
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={`p-2 rounded-lg border ${currentPage === 1 ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
              >
                <ChevronLeft size={20} color={currentPage === 1 ? "#D1D5DB" : "#4f46e5"} />
              </TouchableOpacity>

              <Text className="text-gray-600 font-medium">
                Halaman {currentPage}
              </Text>

              <TouchableOpacity
                disabled={currentPage * 5 >= totalItems}
                onPress={() => setCurrentPage(currentPage + 1)}
                className={`p-2 rounded-lg border ${currentPage * 5 >= totalItems ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
              >
                <ChevronRight size={20} color={currentPage * 5 >= totalItems ? "#D1D5DB" : "#4f46e5"} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* FAB - Adjusted position slightly higher for pagination */}
      <TouchableOpacity
        onPress={() => router.push('/owner/categories/add')}
        className="absolute bottom-44 right-6 bg-indigo-600 w-14 h-14 rounded-full shadow-lg items-center justify-center z-50"
      >
        <Plus size={30} color="white" />
      </TouchableOpacity>

      <OwnerBottomNav />
    </View>
  );
}
