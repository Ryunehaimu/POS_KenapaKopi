import React, { useState, useEffect } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { categoryService } from '../../../services/categoryService';
import GenericFormScreen, { FormField } from '../../../components/GenericFormScreen';

export default function EditCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const cats = await categoryService.getCategories('', 1, 1000);
      const cat = cats.data.find(c => c.id === id);
      if (cat) {
        setName(cat.name);
      } else {
        Alert.alert("Error", "Kategori tidak ditemukan");
        router.back();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Eror', 'Nama kategori tidak boleh kosong');
      return;
    }

    try {
      setLoading(true);
      await categoryService.updateCategory(id as string, name);
      Alert.alert('Sukses', 'Kategori berhasil diperbarui', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan kategori');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <View className="flex-1 bg-gray-50 justify-center items-center">
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );

  const fields: FormField[] = [
    {
      label: "Nama Kategori",
      value: name,
      onChangeText: setName,
      placeholder: "Contoh: Kopi, Makanan, Dessert",
      autoFocus: true
    }
  ];

  return (
    <GenericFormScreen
      title="Edit Kategori"
      fields={fields}
      onSubmit={handleSave}
      loading={loading}
      submitLabel="Simpan Perubahan"
    />
  );
}
