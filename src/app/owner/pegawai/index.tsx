import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, ChevronLeft, Edit2, Trash2, Users, UserCheck, Calendar, Search, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { employeeService, Employee } from '../../../services/employeeService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

export default function EmployeeListScreen() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState({ total: 0, present: 0, late: 0, permission: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 5;

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empData, statData] = await Promise.all([
                employeeService.getEmployees(searchQuery, currentPage, ITEMS_PER_PAGE),
                employeeService.getAttendanceStats()
            ]);
            setEmployees(empData.data || []);
            setTotalItems(empData.count || 0);
            setStats(statData);
        } catch (error) {
            console.error(error);
            // Alert.alert("Error", "Gagal memuat data pegawai");
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

    // Fetch on search or page change
    useEffect(() => {
        fetchData();
    }, [searchQuery, currentPage]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            "Hapus Pegawai",
            `Apakah Anda yakin ingin menghapus ${name}?`,
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await employeeService.deleteEmployee(id);
                            fetchData();
                        } catch (error) {
                            Alert.alert("Error", "Gagal menghapus pegawai");
                        }
                    }
                }
            ]
        );
    };

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
                    <Text className="text-white text-xl font-bold">Karyawan</Text>
                </View>

                <Text className="text-white text-sm font-medium mb-2">Summary</Text>
            </LinearGradient>

            {/* SUMMARY CARDS */}
            <View className="px-6 -mt-16 mb-4">
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

            <ScrollView
                contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-gray-500 font-medium">Total Karyawan: {totalItems}</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/owner/pegawai/add')}
                        className="flex-row items-center bg-indigo-600 px-4 py-2 rounded-xl"
                    >
                        <Plus size={18} color="white" />
                        <Text className="text-white font-bold ml-2">Tambah</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="bg-white rounded-xl px-4 py-3 flex-row items-center border border-gray-100 mb-4 shadow-sm">
                    <Search size={18} color="#9CA3AF" />
                    <TextInput
                        placeholder="Cari Pegawai..."
                        className="flex-1 ml-2 text-gray-800"
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setCurrentPage(1); // Reset to page 1 on search
                        }}
                    />
                </View>

                {/* EMPLOYEE LIST TABLE-STYLE */}
                <View className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                    <View className="flex-row bg-gray-100 p-4 border-b border-gray-200">
                        <Text className="flex-1 text-gray-500 font-bold">Karyawan</Text>
                        <Text className="w-24 text-center text-gray-500 font-bold">Aksi</Text>
                    </View>

                    {loading && !refreshing ? (
                        <ActivityIndicator className="py-8" color="#4f46e5" />
                    ) : (
                        employees.map((emp, index) => (
                            <View key={emp.id} className={`flex-row items-center p-4 border-b border-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                <View className="flex-1 flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden items-center justify-center">
                                        {emp.photo_url ? (
                                            <Image source={{ uri: emp.photo_url }} className="w-full h-full" resizeMode="cover" />
                                        ) : (
                                            <Users size={20} color="#9ca3af" />
                                        )}
                                    </View>
                                    <View>
                                        <Text className="font-bold text-gray-800 text-base" numberOfLines={1}>{emp.name}</Text>
                                        <Text className="text-xs text-gray-400">ID: {emp.id.slice(0, 8)}...</Text>
                                    </View>
                                </View>

                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        onPress={() => router.push(`/owner/pegawai/history/${emp.id}`)}
                                        className="bg-blue-500 p-2 rounded-lg"
                                    >
                                        <Calendar size={16} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => router.push(`/owner/pegawai/edit/${emp.id}`)}
                                        className="bg-indigo-500 p-2 rounded-lg"
                                    >
                                        <Edit2 size={16} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(emp.id, emp.name)}
                                        className="bg-red-500 p-2 rounded-lg"
                                    >
                                        <Trash2 size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}

                    {!loading && employees.length === 0 && (
                        <View className="py-8 items-center">
                            <Text className="text-gray-400">Tidak ada data karyawan</Text>
                        </View>
                    )}
                </View>

                {/* Pagination Controls */}
                {employees.length > 0 && (
                    <View className="flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-10">
                        <TouchableOpacity
                            disabled={currentPage === 1}
                            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className={`p-2 rounded-lg border ${currentPage === 1 ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
                        >
                            <ChevronLeft size={20} color={currentPage === 1 ? "#D1D5DB" : "#4f46e5"} />
                        </TouchableOpacity>

                        <Text className="text-gray-600 font-medium">
                            Halaman {currentPage} dari {totalPages || 1}
                        </Text>

                        <TouchableOpacity
                            disabled={currentPage >= totalPages}
                            onPress={() => setCurrentPage(currentPage + 1)}
                            className={`p-2 rounded-lg border ${currentPage >= totalPages ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
                        >
                            <ChevronRight size={20} color={currentPage >= totalPages ? "#D1D5DB" : "#4f46e5"} />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <OwnerBottomNav />
            {/* Note: 'activeMenu' prop in OwnerBottomNav might need 'pegawai' if added to interface, otherwise default is okay */}
        </View>
    );
}
