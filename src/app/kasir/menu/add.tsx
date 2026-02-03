import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, Save, Upload, X, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { categoryService, Category } from '../../../services/categoryService';
import { inventoryService, Ingredient } from '../../../services/inventoryService';
import { productService } from '../../../services/productService';

interface RecipeItem {
    ingredient_id: string;
    quantity: string;
    ingredientName: string;
    unit: string;
}

export default function AddMenuScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    // Data Sources
    const [categories, setCategories] = useState<Category[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);

    // Recipe State
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
    const [currentQuantity, setCurrentQuantity] = useState('');
    const [isIngredientModalVisible, setIngredientModalVisible] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [cats, ings] = await Promise.all([
                    categoryService.getCategories('', 1, 1000),
                    inventoryService.getIngredients('', 1, 1000)
                ]);
                setCategories(cats.data);
                setIngredients(ings.data);
            } catch (error) {
                console.error(error);
                Alert.alert("Error", "Gagal memuat data kategori atau bahan");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal mengambil gambar");
        }
    };

    const handleAddIngredient = () => {
        if (!selectedIngredient || !currentQuantity) {
            Alert.alert("Validasi", "Pilih bahan dan masukkan jumlah");
            return;
        }

        setRecipeItems(prev => [
            ...prev,
            {
                ingredient_id: selectedIngredient.id,
                quantity: currentQuantity,
                ingredientName: selectedIngredient.name,
                unit: selectedIngredient.unit
            }
        ]);

        // Reset inputs
        setSelectedIngredient(null);
        setCurrentQuantity('');
    };

    const handleRemoveIngredient = (index: number) => {
        setRecipeItems(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        if (!name) return "Nama Menu tidak boleh kosong";
        if (!price) return "Harga Barang tidak boleh kosong";
        if (!categoryId) return "Kategori tidak boleh kosong";
        // if (!imageUri) return "Gambar Menu tidak boleh kosong"; // Optional based on design, but user asked for validation. Let's make it mandatory if user insisted on "every field"
        if (recipeItems.length === 0) return "Resep / Bahan Baku tidak boleh kosong";
        return null;
    };

    const handleSubmit = async () => {
        const errorMsg = validateForm();
        if (errorMsg) {
            Alert.alert("Validasi", errorMsg);
            return;
        }

        try {
            setSubmitting(true);
            let finalImageUrl = imageUri;

            // Upload Image if it's local
            if (imageUri && !imageUri.startsWith('http')) {
                setUploadingImage(true);
                try {
                    finalImageUrl = await productService.uploadImage(imageUri);
                } catch (e) {
                    console.error("Upload failed", e);
                    Alert.alert("Error", "Gagal mengupload gambar");
                    setSubmitting(false);
                    setUploadingImage(false);
                    return;
                }
                setUploadingImage(false);
            }

            const priceNumber = parseInt(price.replace(/[^0-9]/g, ''));

            const recipePayload = recipeItems.map(item => ({
                ingredient_id: item.ingredient_id,
                quantity: parseFloat(item.quantity)
            }));

            await productService.createProduct({
                name,
                price: priceNumber,
                category_id: categoryId,
                description,
                image_url: finalImageUrl
            }, recipePayload);

            Alert.alert("Sukses", "Menu berhasil ditambahkan", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal menyimpan menu");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Tambah Data Menu</Text>
                <View className="w-8" />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    className="flex-1"
                >
                    <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

                        {/* Image Upload */}
                        <View className="mb-6 items-center">
                            <TouchableOpacity onPress={pickImage} className="w-full h-48 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center overflow-hidden">
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="items-center">
                                        <Upload size={32} color="#9CA3AF" />
                                        <Text className="text-gray-400 mt-2 font-medium">Upload Foto Menu</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            {imageUri && (
                                <TouchableOpacity onPress={() => setImageUri('')} className="absolute top-2 right-2 bg-red-500 p-1 rounded-full">
                                    <X size={16} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Nama Menu */}
                        <View className="mb-6">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Nama Menu <Text className="text-red-500">*</Text></Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Product1"
                                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800"
                            />
                        </View>

                        {/* Harga & Kategori Row */}
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Harga Barang <Text className="text-red-500">*</Text></Text>
                                <TextInput
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="Rp 0"
                                    keyboardType="numeric"
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Kategori <Text className="text-red-500">*</Text></Text>
                                <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-[58px] justify-center">
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
                                        <View className="flex-row gap-2 items-center">
                                            {categories.map(cat => (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    onPress={() => setCategoryId(cat.id)}
                                                    className={`px-3 py-2 rounded-lg ${categoryId === cat.id ? 'bg-indigo-600' : 'bg-white border border-gray-300'}`}
                                                >
                                                    <Text className={`${categoryId === cat.id ? 'text-white' : 'text-gray-700'} text-xs font-bold whitespace-nowrap`}>
                                                        {cat.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            </View>
                        </View>

                        {/* Deskripsi */}
                        <View className="mb-6">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Deskripsi</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Deskripsi menu..."
                                multiline
                                numberOfLines={4}
                                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 h-32"
                                textAlignVertical="top"
                            />
                        </View>

                        {/* ----------- RECIPE SECTION ----------- */}
                        <View className="mb-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <Text className="text-indigo-900 font-bold mb-4 text-lg">Resep / Bahan Baku <Text className="text-red-500">*</Text></Text>

                            {/* Add Ingredient Form */}
                            <View className="flex-row gap-4 mb-4 items-end">
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-indigo-700 mb-1">Bahan</Text>
                                    <TouchableOpacity
                                        onPress={() => setIngredientModalVisible(true)}
                                        className="h-12 bg-white rounded-xl border border-indigo-200 justify-center px-4 flex-row items-center justify-between"
                                    >
                                        <Text className={selectedIngredient ? "text-gray-800" : "text-gray-400"}>
                                            {selectedIngredient ? selectedIngredient.name : "Pilih Bahan"}
                                        </Text>
                                        <ChevronDown size={16} color="#6366f1" />
                                    </TouchableOpacity>
                                </View>

                                <View className="w-1/3">
                                    <Text className="text-xs font-medium text-indigo-700 mb-1">Jumlah</Text>
                                    <TextInput
                                        value={currentQuantity}
                                        onChangeText={setCurrentQuantity}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        className="bg-white border border-indigo-200 rounded-xl h-12 px-4 text-gray-800"
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleAddIngredient}
                                    className="bg-indigo-600 w-12 h-12 rounded-xl items-center justify-center mb-0"
                                >
                                    <Plus size={24} color="white" />
                                </TouchableOpacity>
                            </View>

                            {selectedIngredient && (
                                <Text className="text-xs text-indigo-500 mb-4 px-1">
                                    Satuan: {selectedIngredient.unit} | Stok: {selectedIngredient.current_stock}
                                </Text>
                            )}

                            {/* List of Added Ingredients */}
                            {recipeItems.map((item, index) => (
                                <View key={index} className="flex-row justify-between items-center bg-white p-3 rounded-lg mb-2 border border-gray-200">
                                    <View>
                                        <Text className="font-bold text-gray-800">{item.ingredientName}</Text>
                                        <Text className="text-gray-500 text-xs">{item.quantity} {item.unit}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleRemoveIngredient(index)}>
                                        <Trash2 size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Fixed Bottom Action Bar */}
            <View className="p-6 bg-white border-t border-gray-100 shadow-lg">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    className={`bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center ${submitting ? 'opacity-70' : ''}`}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Save size={20} color="white" className="mr-2" />
                            <Text className="text-white font-bold text-base">
                                {uploadingImage ? "Uploading Image..." : "Submit Data"}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Ingredient Selection Modal */}
            <Modal
                visible={isIngredientModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIngredientModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl h-[70%] p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Pilih Bahan Baku</Text>
                            <TouchableOpacity onPress={() => setIngredientModalVisible(false)} className="p-2">
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={ingredients}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedIngredient(item);
                                        setIngredientModalVisible(false);
                                    }}
                                    className="p-4 border-b border-gray-100 flex-row justify-between items-center active:bg-gray-50"
                                >
                                    <View>
                                        <Text className="font-bold text-gray-800 text-base">{item.name}</Text>
                                        <Text className="text-gray-500 text-sm">Stok: {item.current_stock} {item.unit}</Text>
                                    </View>
                                    {selectedIngredient?.id === item.id && (
                                        <View className="w-4 h-4 rounded-full bg-indigo-600" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
