import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { categoryService } from '../../../services/categoryService';
import GenericFormScreen, { FormField } from '../../../components/GenericFormScreen';

export default function AddCategoryScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Eror', 'Nama kategori tidak boleh kosong');
      return;
    }

    try {
      setLoading(true);
      await categoryService.createCategory(name);
      Alert.alert('Sukses', 'Kategori berhasil ditambahkan', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
       console.error(error);
       Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan kategori');
    } finally {
      setLoading(false);
    }
  };

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
      title="Tambah Kategori"
      fields={fields}
      onSubmit={handleSave}
      loading={loading}
      submitLabel="Simpan Kategori"
    />
  );
}
