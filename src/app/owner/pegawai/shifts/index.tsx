import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Alert, Modal, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Plus, Trash2, Clock, Edit2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shiftService, Shift } from '../../../../services/shiftService'; // Check path

export default function ShiftManagementScreen() {
    const router = useRouter();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const data = await shiftService.getShifts();
            setShifts(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data shift");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchShifts();
        }, [])
    );

    const handleOpenModal = (shift?: Shift) => {
        if (shift) {
            setEditingShift(shift);
            setName(shift.name);
            setStartTime(shift.start_time); // Assumes HH:mm:ss
            setEndTime(shift.end_time);
        } else {
            setEditingShift(null);
            setName('');
            setStartTime('');
            setEndTime('');
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name || !startTime || !endTime) {
            Alert.alert("Hapus", "Mohon lengkapi semua field");
            return;
        }

        // Simple Time Validation Regex (HH:mm or HH:mm:ss)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            Alert.alert("Format Waktu Salah", "Gunakan format HH:mm (Contoh: 08:00)");
            return;
        }

        try {
            if (editingShift) {
                await shiftService.updateShift(editingShift.id, { name, start_time: startTime, end_time: endTime });
            } else {
                await shiftService.createShift(name, startTime, endTime);
            }
            setModalVisible(false);
            fetchShifts();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal menyimpan shift");
        }
    };

    const handleDelete = (id: string, shiftName: string) => {
        Alert.alert(
            "Hapus Shift",
            `Hapus shift "${shiftName}"?`,
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await shiftService.deleteShift(id);
                            fetchShifts();
                        } catch (error: any) {
                            Alert.alert("Message", error.message || "Gagal menghapus shift");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            <LinearGradient
                colors={['#4c1d95', '#7c3aed']}
                className="pt-12 pb-6 px-6 shadow-sm"
            >
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 bg-white/20 rounded-full mr-4"
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">Manajemen Shift</Text>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-gray-800 font-bold text-lg">Daftar Shift</Text>
                    <TouchableOpacity
                        onPress={() => handleOpenModal()}
                        className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center"
                    >
                        <Plus size={16} color="white" className="mr-2" />
                        <Text className="text-white font-bold">Tambah Shift</Text>
                    </TouchableOpacity>
                </View>

                {shifts.map((shift, idx) => (
                    <View key={shift.id} className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-gray-100 flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-900">{shift.name}</Text>
                            <View className="flex-row items-center mt-2">
                                <Clock size={14} color="#6B7280" className="mr-2" />
                                <Text className="text-gray-500">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</Text>
                            </View>
                        </View>
                        <View className="flex-row gap-2">
                            <TouchableOpacity onPress={() => handleOpenModal(shift)} className="p-2 bg-indigo-50 rounded-lg">
                                <Edit2 size={18} color="#4f46e5" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(shift.id, shift.name)} className="p-2 bg-red-50 rounded-lg">
                                <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 bg-black/50 justify-center items-center p-6"
                >
                    <View className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">
                                {editingShift ? "Edit Shift" : "Tambah Shift Baru"}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-4">
                            <Text className="text-gray-700 font-medium mb-2">Nama Shift</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Contoh: Shift Pagi"
                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                            />
                        </View>

                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text className="text-gray-700 font-medium mb-2">Jam Mulai</Text>
                                <TextInput
                                    value={startTime}
                                    onChangeText={setStartTime}
                                    placeholder="08:00"
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 text-center"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-700 font-medium mb-2">Jam Selesai</Text>
                                <TextInput
                                    value={endTime}
                                    onChangeText={setEndTime}
                                    placeholder="16:00"
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 text-center"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            className="bg-indigo-600 p-4 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">Simpan</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
