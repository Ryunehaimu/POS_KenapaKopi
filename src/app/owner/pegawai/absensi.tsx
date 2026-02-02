import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Image, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { employeeService, Employee } from '../../../services/employeeService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

export default function AbsensiScreen() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState({ total: 0, present: 0, late: 0, permission: 0 });
    const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
            const map: { [key: string]: string } = {};
            // Initialize all as 'Tidak' (Not Present) if not found, or use found status
            // BUT UI toggle is simplistic "Masuk" vs "Tidak". 
            // In reality, "Tidak" might mean they haven't clocked in yet, OR they are absent.
            // Let's default to empty string or check logs.

            emps.forEach(emp => {
                const log = todaysLogs.find(l => l.employee_id === emp.id);
                map[emp.id] = log ? log.status : 'Tidak'; // Default to Tidak (Absent/Not Here)
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
        const newStatus = currentStatus === 'Masuk' ? 'Tidak' : 'Masuk';

        // Optimistic update
        setAttendanceMap(prev => ({ ...prev, [id]: newStatus }));

        try {
            await employeeService.markAttendance(id, newStatus, today);
            // Refresh stats slightly later or just manually update local stats? 
            // For simplicity, let's just refresh stats in background
            const newStats = await employeeService.getAttendanceStats();
            setStats(newStats);
        } catch (error) {
            console.error(error);
            // Revert
            setAttendanceMap(prev => ({ ...prev, [id]: currentStatus }));
            Alert.alert("Error", "Gagal menyimpan absensi");
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* HEADER */}
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
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                        <Text className="text-indigo-600 text-3xl font-bold">{stats.late}</Text>
                        <Text className="text-gray-400 text-xs mt-1">Pegawai Terlambat</Text>
                    </View>
                    <View className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                        <Text className="text-indigo-600 text-3xl font-bold">{stats.permission}</Text>
                        <Text className="text-gray-400 text-xs mt-1">Pegawai Izin</Text>
                    </View>
                </View>
            </View>

            <View className="px-6 mb-2">
                <Text className="text-gray-500 font-medium">Daftar hadir karyawan hari ini</Text>
            </View>

            {/* TABLE HEADER */}
            <View className="mx-6 bg-gray-100 p-4 rounded-t-xl flex-row justify-between border-b border-gray-200">
                <Text className="font-bold text-gray-500">Nama karyawan</Text>
                <Text className="font-bold text-gray-500">Absen</Text>
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
                            const status = attendanceMap[emp.id] || 'Tidak';
                            const isPresent = status === 'Masuk';

                            return (
                                <View key={emp.id} className="flex-row items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                    <Text className="font-bold text-gray-800 text-base">{emp.name}</Text>
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
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <OwnerBottomNav />
        </View>
    );
}
