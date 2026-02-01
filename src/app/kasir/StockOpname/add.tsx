import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { inventoryService } from '../../../services/inventoryService';
import GenericFormScreen, { FormField } from '../../../components/GenericFormScreen';

export default function AddIngredientScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('main');
  const [unit, setUnit] = useState('kg');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Eror', 'Nama bahan tidak boleh kosong');
      return;
    }

    try {
      setLoading(true);
      await inventoryService.addIngredient({
          name,
          type: type as 'main' | 'support',
          unit: unit as 'kg' | 'gr' | 'ltr' | 'ml' | 'pcs'
      });
      Alert.alert('Sukses', 'Bahan berhasil ditambahkan', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
       console.error(error);
       Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan bahan');
    } finally {
      setLoading(false);
    }
  };

  const fields: FormField[] = [
    {
      label: "Nama Bahan",
      value: name,
      onChangeText: setName,
      placeholder: "Contoh: Biji Kopi Arabika",
      autoFocus: true
    },
    {
        label: "Tipe Bahan",
        value: type,
        onChangeText: setType,
        type: 'select',
        options: [
            { label: 'Main', value: 'main' },
            { label: 'Support', value: 'support' }
        ]
    },
    {
        label: "Satuan",
        value: unit,
        onChangeText: setUnit,
        type: 'select',
        options: [
            { label: 'Kg', value: 'kg' },
            { label: 'Gram', value: 'gr' },
            { label: 'Liter', value: 'ltr' },
            { label: 'ML', value: 'ml' },
            { label: 'Pcs', value: 'pcs' }
        ]
    }
  ];

  return (
    <GenericFormScreen
      title="Tambah Bahan"
      fields={fields}
      onSubmit={handleSave}
      loading={loading}
      submitLabel="Simpan Bahan"
    />
  );
}
