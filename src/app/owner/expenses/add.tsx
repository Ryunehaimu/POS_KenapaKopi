import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { inventoryService, Ingredient } from '../../../services/inventoryService';
import GenericFormScreen, { FormField } from '../../../components/GenericFormScreen';

type FormType = 'ingredient' | 'operational';

export default function AddExpenseScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formType, setFormType] = useState<FormType>('operational');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);

    // Field Values
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [opName, setOpName] = useState('');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadIngredients();
    }, []);

    const loadIngredients = async () => {
        try {
            const data = await inventoryService.getIngredients('', 1, 1000);
            setIngredients(data.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        if (!price) {
            Alert.alert("Error", "Harga harus diisi");
            return;
        }

        setLoading(true);
        try {
            if (formType === 'operational') {
                if (!opName) {
                    Alert.alert("Error", "Nama pengeluaran harus diisi");
                    setLoading(false);
                    return;
                }
                await inventoryService.addOperationalExpense(opName, parseFloat(price), notes);
            } else {
                if (!selectedIngredientId) {
                    Alert.alert("Error", "Pilih bahan baku");
                    setLoading(false);
                    return;
                }
                if (!amount) {
                    Alert.alert("Error", "Jumlah stok masuk harus diisi");
                    setLoading(false);
                    return;
                }

                // Note: user removed notes from addStock in previous turn, so we don't pass it here for ingredients
                await inventoryService.addStock(
                    selectedIngredientId,
                    parseFloat(amount),
                    parseFloat(price)
                );
            }
            Alert.alert("Berhasil", "Pengeluaran tersimpan", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal menyimpan pengeluaran");
        } finally {
            setLoading(false);
        }
    };

    // Prepare Options for Select
    const typeOptions = [
        { label: 'Kebutuhan (Ops)', value: 'operational' },
        { label: 'Bahan Baku', value: 'ingredient' }
    ];

    const ingredientOptions = ingredients.map(i => ({
        label: i.name,
        value: i.id
    }));

    const getUnit = () => {
        if (!selectedIngredientId) return '';
        const ing = ingredients.find(i => i.id === selectedIngredientId);
        return ing ? `(${ing.unit})` : '';
    };

    // Construct Fields dynamically
    const fields: FormField[] = [
        {
            label: "Tipe Pengeluaran",
            value: formType,
            onChangeText: (val) => {
                setFormType(val as FormType);
                // Reset related fields if needed? 
                // Maybe better to keep them if user switches back and forth accidentally
            },
            type: 'select',
            options: typeOptions
        }
    ];

    if (formType === 'operational') {
        fields.push({
            label: "Nama Pengeluaran",
            value: opName,
            onChangeText: setOpName,
            placeholder: "Contoh: Listrik, Wifi, Sabun Cuci"
        });
    } else {
        fields.push({
            label: "Pilih Bahan Baku",
            value: selectedIngredientId,
            onChangeText: setSelectedIngredientId,
            type: 'select',
            options: ingredientOptions
        });
        fields.push({
            label: `Jumlah Stok Masuk ${getUnit()}`,
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

    if (formType === 'operational') {
        fields.push({
            label: "Catatan (Opsional)",
            value: notes,
            onChangeText: setNotes,
            placeholder: "Tambahkan catatan...",
            multiline: true
        });
    }

    return (
        <GenericFormScreen
            title="Tambah Pengeluaran"
            fields={fields}
            onSubmit={handleSave}
            loading={loading}
            submitLabel="Simpan Pengeluaran"
        />
    );
}
