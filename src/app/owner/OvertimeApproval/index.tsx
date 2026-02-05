import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Check, X, Calendar, User } from 'lucide-react-native';
import { attendanceService, AttendanceLog } from '../../../services/attendanceService';

export default function OvertimeApprovalScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overtimeLogs, setOvertimeLogs] = useState<AttendanceLog[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getPendingOvertimeLogs();
            setOvertimeLogs(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data lembur");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (logId: string, action: 'approved' | 'rejected') => {
        try {
            setProcessingId(logId);
            await attendanceService.approveOvertime(logId, action);
            
            // Optimistic update
            setOvertimeLogs(prev => prev.filter(log => log.id !== logId));
            
            Alert.alert("Sukses", `Lembur berhasil di-${action === 'approved' ? 'setujui' : 'tolak'}`);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memproses persetujuan");
        } finally {
            setProcessingId(null);
        }
    };

    const renderItem = ({ item }: { item: AttendanceLog }) => (
        <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center">
                    <View className="bg-indigo-100 p-2 rounded-full mr-3">
                        <User size={20} color="#4f46e5" />
                    </View>
                    <View>
                        <Text className="font-bold text-gray-900 text-lg">{item.employees?.name || 'Unknown'}</Text>
                        <Text className="text-gray-500 text-xs">{item.shifts?.name || 'Shift'}</Text>
                    </View>
                </View>
                <View className="bg-orange-100 px-3 py-1 rounded-full">
                    <Text className="text-orange-700 font-bold text-xs">+{item.overtime_minutes} mnt</Text>
                </View>
            </View>

            <View className="bg-gray-50 p-3 rounded-lg flex-row justify-between items-center mb-4">
               <View>
                 <Text className="text-gray-500 text-xs mb-1">Tanggal</Text>
                 <View className="flex-row items-center">
                    <Calendar size={12} color="gray" className="mr-1"/>
                    <Text className="font-medium text-gray-700 text-xs">
                        {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                 </View>
               </View>
               <View className="h-8 w-[1px] bg-gray-200"></View>
                <View>
                 <Text className="text-gray-500 text-xs mb-1">Jam Pulang</Text>
                 <View className="flex-row items-center">
                    <Clock size={12} color="gray" className="mr-1"/>
                    <Text className="font-medium text-gray-700 text-xs">
                         {item.clock_out_at ? new Date(item.clock_out_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-'}
                    </Text>
                 </View>
               </View>
            </View>

            <View className="flex-row gap-3">
                 <TouchableOpacity
                    onPress={() => handleAction(item.id, 'rejected')}
                    disabled={processingId === item.id}
                    className="flex-1 bg-red-50 py-3 rounded-xl border border-red-100 flex-row justify-center items-center"
                >
                    {processingId === item.id ? (
                         <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                        <>
                            <X size={16} color="#ef4444" className="mr-2" />
                            <Text className="text-red-600 font-bold">Tolak</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleAction(item.id, 'approved')}
                    disabled={processingId === item.id}
                    className="flex-1 bg-green-50 py-3 rounded-xl border border-green-100 flex-row justify-center items-center"
                >
                     {processingId === item.id ? (
                         <ActivityIndicator size="small" color="#16a34a" />
                    ) : (
                        <>
                            <Check size={16} color="#16a34a" className="mr-2" />
                            <Text className="text-green-600 font-bold">Setujui</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
             {/* Header */}
            <View className="bg-white p-6 pt-12 rounded-b-3xl shadow-sm z-10">
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ArrowLeft color="#1F2937" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Persetujuan Lembur</Text>
                    <View className="w-10" /> 
                </View>
                <Text className="text-gray-500 text-center">
                    Setujui atau tolak permintaan lembur karyawan.
                </Text>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={overtimeLogs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24 }}
                    ListEmptyComponent={
                        <View className="items-center py-20">
                            <Clock size={48} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-4 text-center font-medium">Tidak ada permintaan lembur yang menunggu.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
