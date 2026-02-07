import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { inventoryService } from '../../../../services/inventoryService';
import GenericFormScreen, { FormField } from '../../../../components/GenericFormScreen';

export default function AddStockScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState('');

  useEffect(() => {
    loadIngredient();
  }, [id]);

  const loadIngredient = async () => {
      try {
          const data = await inventoryService.getIngredientById(id as string);
          if (data) setUnit(data.unit);
      } catch (e) {
          console.error(e);
      }
  };

  const handleSave = async () => {
    if (!amount.trim()) {
       Alert.alert('Eror', 'Jumlah harus diisi');
       return;
    }
    
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
        Alert.alert('Eror', 'Jumlah harus angka positif lebih dari 0');
        return;
    }

    // Harga opsional - jika kosong, simpan null
    const priceVal = price.trim() ? parseFloat(price) : null;
    if (priceVal !== null && (isNaN(priceVal) || priceVal <= 0)) {
        Alert.alert('Eror', 'Harga harus angka positif lebih dari 0');
        return;
    }

    try {
      setLoading(true);
      await inventoryService.addStock(id as string, parseFloat(amount), priceVal);
      Alert.alert('Sukses', 'Stok berhasil ditambahkan', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
       console.error(error);
       Alert.alert('Gagal', 'Terjadi kesalahan saat update stok');
    } finally {
      setLoading(false);
    }
  };

  const fields: FormField[] = [
    {
      label: `Jumlah Penambahan ${unit ? `(${unit})` : ''}`,
      value: amount,
      onChangeText: setAmount,
      placeholder: "0",
      keyboardType: 'numeric',
      autoFocus: true
    },
    {
      label: "Harga Beli Stok (Total) - Opsional",
      value: price,
      onChangeText: setPrice,
      placeholder: "Kosongkan jika tidak tahu harga",
      keyboardType: 'numeric'
    }
  ];

  return (
    <GenericFormScreen
      title="Tambah Stok"
      fields={fields}
      onSubmit={handleSave}
      loading={loading}
      submitLabel="Update Stok"
    />
  );
}
