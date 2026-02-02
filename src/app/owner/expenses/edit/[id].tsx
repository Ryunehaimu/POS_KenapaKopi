import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { inventoryService } from '../../../../services/inventoryService';
import GenericFormScreen, { FormField } from '../../../../components/GenericFormScreen';

export default function EditExpenseScreen() {
    const router = useRouter();
    const { id, type } = useLocalSearchParams(); // type: 'ingredient' | 'operational'
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Fields
    const [name, setName] = useState(''); // Only for operational
    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [ingredientName, setIngredientName] = useState(''); // Display only for ingredient

    const [amount, setAmount] = useState(''); // Log Amount
    const [unit, setUnit] = useState(''); // Ingredient Unit

    useEffect(() => {
        if (id && type) {
            loadData();
        }
    }, [id, type]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (type === 'operational') {
                const data = await inventoryService.getOperationalExpenseById(id as string);
                setName(data.name);
                setPrice(data.price.toString());
                setNotes(data.notes || '');
            } else if (type === 'ingredient') {
                const data = await inventoryService.getStockLogById(id as string);
                setPrice(data.price.toString());
                setNotes(data.notes || '');
                setAmount(data.change_amount.toString());
                setIngredientName(data.ingredients?.name || 'Unknown Ingredient');
                setUnit(data.ingredients?.unit || '');
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!price) {
            Alert.alert("Error", "Harga harus diisi");
            return;
        }

        setSubmitting(true);
        try {
            if (type === 'operational') {
                if (!name) {
                    Alert.alert("Error", "Nama harus diisi");
                    setSubmitting(false);
                    return;
                }
                await inventoryService.updateOperationalExpense(id as string, {
                    name,
                    price: parseFloat(price),
                    notes
                });
            } else {
                // Ingredient
                if (!amount) {
                    Alert.alert("Error", "Jumlah harus diisi");
                    setSubmitting(false);
                    return;
                }
                await inventoryService.updateStockLog(id as string, {
                    change_amount: parseFloat(amount),
                    price: parseFloat(price),
                    notes
                });
            }

            Alert.alert("Berhasil", "Data berhasil diperbarui", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal menyimpan perubahan");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Hapus Pengeluaran",
            "Apakah Anda yakin ingin menghapus data ini? Stok akan dikembalikan (untuk bahan baku).",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            if (type === 'operational') {
                                await inventoryService.deleteOperationalExpense(id as string);
                            } else {
                                await inventoryService.deleteStockLog(id as string);
                            }
                            Alert.alert("Sukses", "Data berhasil dihapus", [
                                { text: "OK", onPress: () => router.back() }
                            ]);
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Error", "Gagal menghapus data");
                            setLoading(false); // Only stop loading if error, otherwise we go back
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    const fields: FormField[] = [];

    if (type === 'operational') {
        fields.push({
            label: "Nama Pengeluaran",
            value: name,
            onChangeText: setName,
            placeholder: "Nama Pengeluaran"
        });
    } else {
        // Ingredient Name (Read Only but shown)
        // Since GenericForm doesn't support read-only well in dynamic fields without hack, 
        // we will use `children` prop for custom display of Ingredient Name, 
        // OR add it as a disabled field if GenericForm supported it.
        // Best approach given constraints: Add Amount field now.

        fields.push({
            label: `Jumlah (${unit})`,
            value: amount,
            onChangeText: setAmount,
            placeholder: "0",
            keyboardType: 'numeric'
        });
    }

    fields.push({
        label: "Total Harga (Rp)",
        value: price,
        onChangeText: setPrice,
        placeholder: "0",
        keyboardType: 'numeric'
    });

    fields.push({
        label: "Catatan",
        value: notes,
        onChangeText: setNotes,
        placeholder: "Catatan...",
        multiline: true
    });

    return (
        <GenericFormScreen
            title={type === 'operational' ? "Edit Pengeluaran" : "Edit Stok Masuk"}
            fields={fields}
            onSubmit={handleSave}
            loading={submitting}
            submitLabel="Simpan Perubahan"
        >
            {type === 'ingredient' && (
                <View className="mb-6">
                    <Text className="text-gray-500 text-sm mb-1">Bahan Baku</Text>
                    <View className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                        <Text className="font-bold text-gray-700 text-lg">{ingredientName}</Text>
                        <Text className="text-gray-400 text-xs italic mt-1">Nama bahan tidak dapat diubah dari sini.</Text>
                    </View>
                </View>
            )}

            <View className="mt-6 border-t border-gray-100 pt-6">
                <TouchableOpacity
                    onPress={handleDelete}
                    className="bg-red-50 p-4 rounded-xl flex-row justify-center items-center"
                >
                    <Text className="text-red-600 font-bold text-base">Hapus Data</Text>
                </TouchableOpacity>
            </View>
        </GenericFormScreen>
    );
}
