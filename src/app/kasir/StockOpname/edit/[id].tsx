import React, { useState, useEffect } from 'react';
import { Alert, View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { inventoryService } from '../../../../services/inventoryService';
import GenericFormScreen, { FormField } from '../../../../components/GenericFormScreen';

export default function EditIngredientScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [type, setType] = useState('main');
  const [unit, setUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('0'); // New State
  const [originalStock, setOriginalStock] = useState(0); // To track changes
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
     loadData();
  }, [id]);

  const loadData = async () => {
     try {
         const data = await inventoryService.getIngredientById(id as string);
         if (data) {
             setName(data.name);
             setType(data.type);
             setUnit(data.unit);
             setCurrentStock(data.current_stock?.toString() || '0');
             setOriginalStock(data.current_stock || 0);
         }
     } catch (e) {
         console.error(e);
         Alert.alert("Error", "Gagal memuat data bahan");
         router.back();
     } finally {
         setFetching(false);
     }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // 1. Update Basic Info
      await inventoryService.updateIngredient(id as string, {
          name,
          type: type as 'main' | 'support',
          unit: unit as 'kg' | 'gr' | 'ltr' | 'ml' | 'pcs'
      });

      // 2. Handle Stock Adjustment if changed
      const newStockVal = parseFloat(currentStock);
      if (!isNaN(newStockVal) && newStockVal !== originalStock) {
         await inventoryService.adjustStock(id as string, newStockVal);
      }

      Alert.alert('Sukses', 'Data bahan berhasil diperbarui', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
       console.error(error);
       Alert.alert('Gagal', 'Terjadi kesalahan saat update bahan');
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
      label: "Nama Bahan",
      value: name,
      onChangeText: setName,
      placeholder: "Contoh: Biji Kopi Arabika"
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
    },
    {
        label: "Stok Saat Ini (Adjustment)",
        value: currentStock,
        onChangeText: setCurrentStock,
        placeholder: "0",
        keyboardType: 'numeric'
    }
  ];

  return (
    <GenericFormScreen
      title="Edit Bahan"
      fields={fields}
      onSubmit={handleSave}
      loading={loading}
      submitLabel="Simpan Perubahan"
    >
        <View className="mt-6 border-t border-gray-100 pt-6">
            <TouchableOpacity
                onPress={() => {
                    Alert.alert(
                        "Hapus Bahan",
                        "Apakah Anda yakin ingin menghapus bahan ini? Data yang dihapus tidak dapat dikembalikan.",
                        [
                            { text: "Batal", style: "cancel" },
                            {
                                text: "Hapus",
                                style: "destructive",
                                onPress: async () => {
                                    try {
                                        setLoading(true);
                                        await inventoryService.deleteIngredient(id as string);
                                        Alert.alert("Sukses", "Bahan berhasil dihapus", [
                                            { text: "OK", onPress: () => router.back() }
                                        ]);
                                    } catch (e) {
                                        console.error(e);
                                        Alert.alert("Error", "Gagal menghapus bahan");
                                        setLoading(false);
                                    }
                                }
                            }
                        ]
                    );
                }}
                className="bg-red-50 p-4 rounded-xl flex-row justify-center items-center"
            >
                <Text className="text-red-600 font-bold text-base">Hapus Bahan</Text>
            </TouchableOpacity>
        </View>
    </GenericFormScreen>
  );
}
