import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle, Clock, AlertCircle, X, Edit2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { attendanceService, AttendanceLog } from '../../../services/attendanceService';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function IncompleteAttendanceScreen() {
    const router = useRouter();
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [resolutionType, setResolutionType] = useState<'normal' | 'manual'>('normal');
    const [customTime, setCustomTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getIncompleteLogs();
            setLogs(data);
        } catch (error) {
            Alert.alert("Error", "Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (log: AttendanceLog) => {
        setSelectedLog(log);
        setResolutionType('normal');
        setNotes('');
        
        // Default custom time to Shift End (on the correct date) for convenience
        if (log.shifts) {
            const logDate = new Date(log.date);
            const [endHour, endMinute] = log.shifts.end_time.split(':').map(Number);
            const [startHour, startMinute] = log.shifts.start_time.split(':').map(Number);
            
            let defaultTime = new Date(logDate);
            defaultTime.setHours(endHour, endMinute, 0, 0);
            
            // Handle overnight
            if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
                defaultTime.setDate(defaultTime.getDate() + 1);
            }
            setCustomTime(defaultTime);
        } else {
            setCustomTime(new Date());
        }

        setModalVisible(true);
    };

    const handleResolve = async () => {
        if (!selectedLog) return;

        try {
            setLoading(true);
            let finalTimeStr = new Date().toISOString(); 

            if (resolutionType === 'normal') {
                // Determine Shift End Date/Time from Log
                // Reconstruct Shift End logic
                if (selectedLog.shifts) {
                     const logDate = new Date(selectedLog.date);
                     const [endHour, endMinute] = selectedLog.shifts.end_time.split(':').map(Number);
                     const [startHour, startMinute] = selectedLog.shifts.start_time.split(':').map(Number);

                     let shiftEnd = new Date(logDate);
                     shiftEnd.setHours(endHour, endMinute, 0, 0);

                     if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
                         shiftEnd.setDate(shiftEnd.getDate() + 1);
                     }
                     finalTimeStr = shiftEnd.toISOString();
                }
            } else {
                // Manual Time
                // Be careful: customTime is just a Date object (likely Today).
                // If resolving for a PAST DATE, we might want the date part to match the Log Date?
                // User requirement: "Captain bakal memilih dia checkout secara rl bener atau ga"
                // Usually implies adjusting the TIME on the CORRECT DATE.
                
                // Let's assume customTime carries the correct date if picked via DatePicker?
                // Or should we force the Date to match the Log/Shift Date and only take the Time?
                
                // For simplicity, let's use customTime as is. The user can pick 'Yesterday' in picker if needed.
                // Or better: Default customTime to the SHIFT END date/time.
                finalTimeStr = customTime.toISOString();
            }

            await attendanceService.resolveIncompleteLog(selectedLog.id, resolutionType as any, finalTimeStr, notes);
            
            setModalVisible(false);
            fetchLogs(); // Reload
            Alert.alert("Berhasil", "Absensi telah diupdate.");

        } catch (error: any) {
            Alert.alert("Gagal", error.message);
        } finally {
            setLoading(false);
        }
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false); // iOS handling might differ
        if (selectedDate) {
            setCustomTime(selectedDate);
        }
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
                    <Text className="text-white text-xl font-bold">Lupa Checkout</Text>
                </View>
                <Text className="text-white/80 text-sm">Daftar pegawai yang belum checkout</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: 24 }}>
                {loading ? (
                    <ActivityIndicator color="#4f46e5" />
                ) : logs.length === 0 ? (
                    <View className="items-center py-10">
                        <CheckCircle size={48} color="#10B981" />
                        <Text className="text-gray-500 mt-4">Semua beres! Tidak ada yang lupa checkout.</Text>
                    </View>
                ) : (
                    logs.map(log => (
                        <View key={log.id} className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-gray-100">
                            <View className="flex-row justify-between items-start mb-2">
                                <View>
                                    <Text className="text-lg font-bold text-gray-800">{log.employees?.name}</Text>
                                    <Text className="text-gray-500 text-xs">{log.shifts?.name} • {log.date}</Text>
                                </View>
                                <View className="bg-red-100 px-2 py-1 rounded">
                                    <Text className="text-red-600 text-[10px] font-bold">Belum Pulang</Text>
                                </View>
                            </View>
                            
                            <Text className="text-gray-600 text-sm mb-4">
                                Masuk: {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                            </Text>

                            <TouchableOpacity 
                                onPress={() => handleOpenModal(log)}
                                className="bg-indigo-600 py-2 rounded-lg items-center"
                            >
                                <Text className="text-white font-bold">Proses Checkout</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* RESOLUTION MODAL */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white w-full rounded-2xl p-6 shadow-xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Atur Checkout</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-600 mb-4">Pilih tindakan untuk <Text className="font-bold">{selectedLog?.employees?.name}</Text>:</Text>

                        {/* Options */}
                        <View className="flex-row gap-2 mb-6">
                            <TouchableOpacity 
                                onPress={() => setResolutionType('normal')}
                                className={`flex-1 p-3 rounded-lg border items-center ${resolutionType === 'normal' ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Clock size={20} color={resolutionType === 'normal' ? "#4f46e5" : "#6B7280"} className="mb-2"/>
                                <Text className={`text-xs font-bold ${resolutionType === 'normal' ? 'text-indigo-700' : 'text-gray-600'}`}>Sesuai Jadwal</Text>
                                <Text className="text-[10px] text-gray-400 text-center mt-1">
                                    Set ke jam pulang shift
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => {
                                    setResolutionType('manual');
                                    // customTime is already set in handleOpenModal
                                }}
                                className={`flex-1 p-3 rounded-lg border items-center ${resolutionType === 'manual' ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Edit2 size={20} color={resolutionType === 'manual' ? "#4f46e5" : "#6B7280"} className="mb-2"/>
                                <Text className={`text-xs font-bold ${resolutionType === 'manual' ? 'text-indigo-700' : 'text-gray-600'}`}>Manual / Overtime</Text>
                                <Text className="text-[10px] text-gray-400 text-center mt-1">
                                    Input jam pulang nyata
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Manual Time Input */}
                        {resolutionType === 'manual' && (
                            <View className="mb-4">
                                <Text className="text-gray-700 font-medium mb-2">Jam Pulang Sebenarnya</Text>
                                <TouchableOpacity 
                                    onPress={() => setShowTimePicker(true)}
                                    className="bg-gray-50 border border-gray-300 p-3 rounded-xl items-center"
                                >
                                    <Text className="text-lg font-bold text-gray-800">
                                        {customTime.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </Text>
                                </TouchableOpacity>
                                {showTimePicker && (
                                    <DateTimePicker
                                        value={customTime}
                                        mode={Platform.OS === 'ios' ? 'datetime' : 'time'}
                                        display="default"
                                        onChange={onTimeChange}
                                    />
                                )}
                            </View>
                        )}

                        {/* Notes */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-medium mb-2">Catatan / Alasan</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Contoh: Lupa absen, Pulang cepat sakit..."
                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-20 text-gray-900"
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleResolve}
                            className="bg-indigo-600 p-4 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">Simpan</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </View>
    );
}
