import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Image, Switch, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { employeeService, Employee, AttendanceLog } from '../../../services/employeeService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

export default function AbsensiScreen() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState({ total: 0, present: 0, late: 0, permission: 0 });
    const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const today = new Date().toISOString().split('T')[0];

    // Load data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [emps, statData, todaysLogs] = await Promise.all([
                employeeService.getEmployees(),
                employeeService.getAttendanceStats(),
                employeeService.getTodayAttendance()
            ]);

            setEmployees(emps);
            setStats(statData);

            // Map existing logs to local state
            const map: { [key: string]: AttendanceLog | null } = {};
            
            emps.forEach(emp => {
                const log = todaysLogs.find(l => l.employee_id === emp.id);
                map[emp.id] = log || null;
            });
            setAttendanceMap(map);

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data absensi");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const toggleAttendance = async (id: string, currentStatus: string) => {
        // Toggling from Owner side usually means Manual Correction without Photo
        // So we keep it simple or disable it if we want Strict Photo Compliance.
        // For now, let's keep it but it won't have a photo.
        const newStatus = currentStatus === 'Masuk' ? 'Tidak' : 'Masuk';
        
        // Note: This optimistic update is tricky with the new object structure.
        // Let's just reload data for simplicity after update.

        try {
            await employeeService.markAttendance(id, newStatus, today);
            fetchData(); // Reload to get consistent state
        } catch (error) {
           console.error(error);
           Alert.alert("Error", "Gagal menyimpan absensi");
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* ... HEADER & SUMMARY ... */}
            <LinearGradient
                colors={['#4c1d95', '#7c3aed']}
                className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative"
            >
                <View className="flex-row items-center mb-6 relative">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 bg-white/20 rounded-full mr-4"
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">Absensi Karyawan</Text>
                </View>

                <Text className="text-white text-sm font-medium mb-2">Summary</Text>
            </LinearGradient>

            {/* SUMMARY CARDS */}
            <View className="px-6 -mt-16 mb-6">
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                        <Text className="text-blue-600 text-3xl font-bold">{stats.present}</Text>
                        <Text className="text-gray-400 text-xs mt-1">Pegawai Masuk</Text>
                    </View>
                    <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                        <Text className="text-indigo-600 text-3xl font-bold">{stats.total}</Text>
                        <Text className="text-gray-400 text-xs mt-1">Total Pegawai</Text>
                    </View>
                </View>
                {/* ... other stats ... */}
            </View>

            <View className="px-6 mb-2">
                <Text className="text-gray-500 font-medium">Daftar hadir karyawan hari ini</Text>
            </View>

            {/* TABLE HEADER */}
            <View className="mx-6 bg-gray-100 p-4 rounded-t-xl flex-row justify-between border-b border-gray-200">
                <Text className="font-bold text-gray-500">Nama karyawan</Text>
                <Text className="font-bold text-gray-500">Bukti / Status</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
                className="-mt-2"
            >
                <View className="bg-white rounded-b-xl shadow-sm overflow-hidden border border-gray-100 border-t-0 p-4 pt-0">
                    {loading && !refreshing ? (
                        <ActivityIndicator className="py-8" color="#4f46e5" />
                    ) : (
                        employees.map((emp, index) => {
                            const log = attendanceMap[emp.id];
                            const status = log ? log.status : 'Tidak';
                            const isPresent = status === 'Masuk';
                            const photoUrl = log?.attendance_photo_url;

                            return (
                                <View key={emp.id} className="flex-row items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                    <View>
                                        <Text className="font-bold text-gray-800 text-base">{emp.name}</Text>
                                        {isPresent && log && (
                                            <Text className="text-xs text-gray-400">
                                                {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        )}
                                    </View>
                                    
                                    <View className="flex-row items-center gap-2">
                                        {/* Display Attendance Photo if available */}
                                        {photoUrl && (
                                            <TouchableOpacity onPress={() => setSelectedImage(photoUrl)}>
                                                <Image 
                                                    source={{ uri: photoUrl }} 
                                                    className="w-10 h-10 rounded-full border border-gray-200"
                                                    style={{ backgroundColor: '#f0f0f0' }}
                                                />
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={() => toggleAttendance(emp.id, status)}
                                            className={`flex-row items-center border rounded-lg px-3 py-1.5 ${isPresent ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                                        >
                                            <View className={`w-2.5 h-2.5 rounded-full mr-2 ${isPresent ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <Text className={`font-bold text-xs ${isPresent ? 'text-green-700' : 'text-red-700'}`}>
                                                {isPresent ? 'Masuk' : 'Tidak'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                <View className="flex-1 bg-black/90 justify-center items-center p-4">
                    <TouchableOpacity 
                        onPress={() => setSelectedImage(null)}
                        className="absolute top-12 right-6 z-10 p-2 bg-white/20 rounded-full"
                    >
                        <X color="white" size={24} />
                    </TouchableOpacity>
                    
                    {selectedImage && (
                        <Image 
                            source={{ uri: selectedImage }} 
                            className="w-full h-[80%]" 
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <OwnerBottomNav />
        </View>
    );
}
