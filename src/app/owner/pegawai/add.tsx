import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Upload, X, Camera } from 'lucide-react-native';
import GenericFormScreen, { FormField } from '../../../components/GenericFormScreen';
import { employeeService } from '../../../services/employeeService';

export default function AddEmployeeScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState('');

    const handleImagePick = () => {
        Alert.alert(
            "Pilih Foto",
            "Ambil foto langsung atau pilih dari galeri?",
            [
                { text: "Batal", style: "cancel" },
                { text: "Galeri", onPress: () => pickImage(false) },
                { text: "Kamera", onPress: () => pickImage(true) },
            ]
        );
    };

    const pickImage = async (useCamera: boolean) => {
        try {
            let result;
            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            };

            if (useCamera) {
                await ImagePicker.requestCameraPermissionsAsync();
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert("Error", "Gagal mengambil gambar");
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Eror', 'Nama karyawan tidak boleh kosong');
            return;
        }

        try {
            setLoading(true);

            let finalImageUrl = imageUri;
            if (imageUri && !imageUri.startsWith('http')) {
                try {
                    finalImageUrl = await employeeService.uploadProfilePhoto(imageUri);
                } catch (e) {
                    console.log("Upload failed, proceeding without photo");
                    finalImageUrl = '';
                }
            }

            await employeeService.createEmployee(name, finalImageUrl);

            Alert.alert('Sukses', 'Karyawan berhasil ditambahkan', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan data');
        } finally {
            setLoading(false);
        }
    };

    const fields: FormField[] = [
        {
            label: "Nama Karyawan",
            value: name,
            onChangeText: setName,
            placeholder: "Contoh: Rusdi"
        }
    ];

    return (
        <GenericFormScreen
            title="Tambah Karyawan"
            fields={fields}
            onSubmit={handleSave}
            loading={loading}
            submitLabel="Submit"
        >
            <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">Foto Profile</Text>
                <TouchableOpacity onPress={handleImagePick} className="w-full h-48 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center overflow-hidden">
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="items-center">
                            <Camera size={32} color="#9CA3AF" />
                            <Text className="text-gray-400 font-bold mt-2">Pilih Foto</Text>
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
