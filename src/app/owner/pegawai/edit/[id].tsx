import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, Calendar, X } from 'lucide-react-native';
import { employeeService, Employee } from '../../../../services/employeeService';

export default function EditEmployeeScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [employee, setEmployee] = useState<Employee | null>(null);

    // Form Data
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState('');
    const [selectedHistoryImage, setSelectedHistoryImage] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setInitialLoading(true);
            const data = await employeeService.getEmployeeById(id as string);
            setEmployee(data);
            setName(data.name);
            setImageUri(data.photo_url || '');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data karyawan");
            router.back();
        } finally {
            setInitialLoading(false);
        }
    };

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
        if (!name.trim()) return;

        try {
            setLoading(true);
            let finalImageUrl = imageUri;

            // If image changed (is local uri)
            if (imageUri && !imageUri.startsWith('http')) {
                try {
                    finalImageUrl = await employeeService.uploadProfilePhoto(imageUri);
                } catch (e) {
                    console.log("Upload failed");
                }
            }

            await employeeService.updateEmployee(id as string, {
                name: name,
                photo_url: finalImageUrl
            });

            Alert.alert("Sukses", "Data berhasil diperbarui");
            loadData(); // Reload to ensure clean state
        } catch (error) {
            Alert.alert("Error", "Gagal menyimpan perubahan");
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

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center p-6 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-indigo-50 rounded-full mr-4">
                    <ChevronLeft size={24} color="#4f46e5" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Lihat Karyawan</Text>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>

                {/* Profile Section */}
                <View className="items-center mb-8">
                    <TouchableOpacity onPress={handleImagePick} className="relative">
                        <View className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                                <View className="w-full h-full items-center justify-center bg-gray-200">
                                    <Camera size={40} color="#9ca3af" />
                                </View>
                            )}
                        </View>
                        <View className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full border-2 border-white">
                            <Camera size={16} color="white" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Name Input */}
                <View className="mb-8">
                    <Text className="text-gray-400 text-xs font-bold mb-2 ml-1 uppercase tracking-wider">Nama Karyawan</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-lg font-bold text-gray-800"
                        placeholder="Nama Karyawan"
                    />
                </View>

                {/* Attendance History */}
                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-24">
                    <View className="flex-row justify-between mb-4 border-b border-gray-100 pb-2">
                        <Text className="font-bold text-gray-500">Tanggal</Text>
                        <Text className="font-bold text-gray-500">Status</Text>
                    </View>

                    {employee?.attendance_logs && employee.attendance_logs.length > 0 ? (
                        employee.attendance_logs.map((log) => (
                            <View key={log.id} className="flex-row justify-between items-center py-3 border-b border-gray-50 last:border-0">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3 overflow-hidden">
                                        {log.attendance_photo_url ? (
                                            <TouchableOpacity 
                                                onPress={() => setSelectedHistoryImage(log.attendance_photo_url || null)}
                                                className="w-full h-full"
                                            >
                                                <Image 
                                                    source={{ uri: log.attendance_photo_url }} 
                                                    className="w-full h-full"
                                                />
                                            </TouchableOpacity>
                                        ) : (
                                            <Calendar size={14} color="#6b7280" />
                                        )}
                                    </View>
                                    <View className="flex-col justify-center">
                                        <Text className="font-bold text-gray-800 text-sm">
                                            {new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">
                                            {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                        </Text>
                                        
                                        {(() => {
                                            if (log.status === 'Masuk') {
                                                const { lateMinutes, effectiveTime } = employeeService.calculateLateness(log.created_at);
                                                if (lateMinutes > 0) {
                                                    const hours = Math.floor(lateMinutes / 60);
                                                    const mins = lateMinutes % 60;
                                                    const durationText = `${hours > 0 ? hours + ' jam ' : ''}${mins} menit`.trim();
                                                    
                                                    return (
                                                        <Text className="text-red-500 text-[10px] font-bold mt-1">
                                                            Telat: {durationText}
                                                        </Text>
                                                    );
                                                }
                                            }
                                            return null;
                                        })()}
                                    </View>
                                </View>

                                <View className={`px-4 py-1.5 rounded-full border ${log.status === 'Masuk' ? 'bg-green-50 border-green-200' :
                                    log.status === 'Alpha' || log.status === 'Tidak' ? 'bg-red-50 border-red-200' :
                                        'bg-yellow-50 border-yellow-200'
                                    }`}>
                                    <View className="flex-row items-center gap-2">
                                        <View className={`w-2 h-2 rounded-full ${log.status === 'Masuk' ? 'bg-green-500' :
                                            log.status === 'Alpha' || log.status === 'Tidak' ? 'bg-red-500' :
                                                'bg-yellow-500'
                                            }`} />
                                        <Text className={`text-xs font-bold ${log.status === 'Masuk' ? 'text-green-700' :
                                            log.status === 'Alpha' || log.status === 'Tidak' ? 'text-red-700' :
                                                'text-yellow-700'
                                            }`}>
                                            {log.status === 'Tidak' ? 'Tidak Masuk' : log.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text className="text-center text-gray-400 py-6">Belum ada riwayat absensi</Text>
                    )}
                </View>

                {/* History Image Modal */}
                <Modal visible={!!selectedHistoryImage} transparent={true} animationType="fade">
                    <View className="flex-1 bg-black/90 justify-center items-center p-4">
                        <TouchableOpacity 
                            onPress={() => setSelectedHistoryImage(null)}
                            className="absolute top-12 right-6 z-10 p-2 bg-white/20 rounded-full"
                        >
                            <X color="white" size={24} />
                        </TouchableOpacity>
                        
                        {selectedHistoryImage && (
                            <Image 
                                source={{ uri: selectedHistoryImage }} 
                                className="w-full h-[80%]" 
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </Modal>

            </ScrollView>

            {/* Bottom Actions */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex-row gap-4">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 p-4 rounded-xl items-center justify-center shadow-lg shadow-indigo-200"
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="flex-1 bg-red-500 p-4 rounded-xl items-center justify-center shadow-lg shadow-red-200"
                >
                    <Text className="text-white font-bold text-lg">Kembali</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
