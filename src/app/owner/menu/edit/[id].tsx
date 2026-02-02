import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Upload, X } from 'lucide-react-native';
import GenericFormScreen, { FormField } from '../../../../components/GenericFormScreen';
import { productService } from '../../../../services/productService';
import { categoryService, Category } from '../../../../services/categoryService';

export default function EditMenuScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);

    // Fields
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                setInitialLoading(true);
                const [params, cats] = await Promise.all([
                    productService.getProductById(id as string),
                    categoryService.getCategories()
                ]);

                setCategories(cats);

                // Populate form
                setName(params.name);
                setPrice(params.price.toString());
                setCategoryId(params.category_id || '');
                setDescription(params.description || '');
                if (params.image_url) {
                    setImageUri(params.image_url);
                }

            } catch (error) {
                console.error(error);
                Alert.alert("Error", "Gagal memuat data menu", [
                    { text: "Kembali", onPress: () => router.back() }
                ]);
            } finally {
                setInitialLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleImagePick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert("Error", "Gagal mengambil gambar");
        }
    };

    const handleSave = async () => {
        if (!name || !price || !categoryId) {
            Alert.alert('Error', 'Mohon lengkapi Nama, Harga, dan Kategori');
            return;
        }

        try {
            setLoading(true);

            let finalImageUrl = imageUri;
            // Only upload if it's a new local file (starts with file:// or content://, not http)
            if (imageUri && !imageUri.startsWith('http')) {
                try {
                    finalImageUrl = await productService.uploadImage(imageUri);
                } catch (e) {
                    Alert.alert('Warning', 'Gagal upload gambar, menyimpan tanpa gambar baru.');
                    // Keep old one if exists? Actually if upload fails we probably shouldn't update the image url
                }
            } else if (!imageUri) {
                finalImageUrl = ''; // Removed image
            }

            await productService.updateProduct(id as string, {
                name,
                price: parseInt(price),
                category_id: categoryId,
                description,
                image_url: finalImageUrl
            });

            Alert.alert('Sukses', 'Menu berhasil diperbarui', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan menu');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const fields: FormField[] = [
        {
            label: "Nama Menu",
            value: name,
            onChangeText: setName,
            placeholder: "Contoh: Americano"
        },
        {
            label: "Harga",
            value: price,
            onChangeText: setPrice,
            placeholder: "Contoh: 15000",
            keyboardType: 'numeric'
        },
        {
            label: "Kategori",
            value: categoryId,
            onChangeText: setCategoryId,
            type: 'select',
            options: categories.map(c => ({ label: c.name, value: c.id }))
        },
        {
            label: "Deskripsi",
            value: description,
            onChangeText: setDescription,
            placeholder: "Deskripsi singkat menu...",
            multiline: true
        }
    ];

    return (
        <GenericFormScreen
            title="Edit Menu"
            fields={fields}
            onSubmit={handleSave}
            loading={loading}
            submitLabel="Simpan Perubahan"
        >
            <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">Foto Menu</Text>
                <TouchableOpacity onPress={handleImagePick} className="w-full h-48 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center overflow-hidden">
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="items-center">
                            <Upload size={32} color="#9CA3AF" />
                            <Text className="text-gray-400 font-bold mt-2">Tap untuk Upload</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {imageUri !== '' && (
                    <TouchableOpacity onPress={() => setImageUri('')} className="bg-red-500 self-start mt-2 px-3 py-1 rounded-full">
                        <Text className="text-white text-xs">Hapus Foto</Text>
                    </TouchableOpacity>
                )}
            </View>
        </GenericFormScreen>
    );
}
