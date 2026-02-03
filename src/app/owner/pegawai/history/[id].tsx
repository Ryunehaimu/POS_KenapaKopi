
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, FlatList, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Calendar, User, Clock, CheckCircle, XCircle, Edit, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { employeeService, AttendanceLog, Employee } from '../../../../services/employeeService'; // Check relative path

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function EmployeeHistoryScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    // State
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Date Selection
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [selectedHistoryImage, setSelectedHistoryImage] = useState<string | null>(null);

    // Status Edit Modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
    const [editStatus, setEditStatus] = useState('');
    const [editNote, setEditNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filter & Pagination State
    const [filterStatus, setFilterStatus] = useState('Semua');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Initial Load - Get Employee Info
    useEffect(() => {
        if (id) {
            fetchEmployee();
        }
    }, [id]);

    // Fetch Logs when month/year changes
    useEffect(() => {
        if (id) {
            fetchLogs();
        }
    }, [id, selectedMonth, selectedYear]);

    const fetchEmployee = async () => {
        try {
            setLoading(true);
            const emp = await employeeService.getEmployeeById(id as string);
            setEmployee(emp);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setLoadingLogs(true);
            const data = await employeeService.getEmployeeAttendanceByMonth(id as string, selectedMonth, selectedYear);
            setLogs(data);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Helper to calculate summary
    const getSummary = () => {
        const present = logs.filter(l => l.status === 'Masuk').length;
        const absent = logs.filter(l => ['Alpha', 'Tidak'].includes(l.status)).length;
        const permission = logs.filter(l => ['Izin', 'Sakit'].includes(l.status)).length;

        // Late calculation
        let lateCount = 0;
        let totalLateMinutes = 0;
        logs.forEach(l => {
            if (l.late_minutes && l.late_minutes > 0) {
                lateCount++;
                totalLateMinutes += l.late_minutes;
            }
        });

        return { present, absent, permission, lateCount, totalLateMinutes };
    };

    // Filter Logic
    const getFilteredLogs = () => {
        let filtered = logs;

        if (filterStatus !== 'Semua') {
            filtered = logs.filter(log => {
                if (filterStatus === 'Masuk') return log.status === 'Masuk';
                if (filterStatus === 'Telat') return log.status === 'Masuk' && (log.late_minutes || 0) > 0;
                if (filterStatus === 'Izin') return ['Izin', 'Sakit'].includes(log.status);
                if (filterStatus === 'Alpha') return ['Alpha', 'Tidak'].includes(log.status);
                return true;
            });
        }
        return filtered;
    };

    const filteredLogs = getFilteredLogs();
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Initial Load - Get Employee Info

    const summary = getSummary();

    const renderMonthPicker = () => (
        <Modal
            visible={showMonthPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowMonthPicker(false)}
        >
            <View className="flex-1 bg-black/50 justify-center items-center">
                <View className="bg-white m-4 p-4 rounded-xl w-4/5 max-h-[80%]">
                    <Text className="text-lg font-bold mb-4 text-center">Pilih Bulan</Text>
                    <FlatList
                        data={MONTHS}
                        keyExtractor={(item) => item}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                className={`p-4 border-b border-gray-100 ${selectedMonth === index + 1 ? 'bg-indigo-50' : ''}`}
                                onPress={() => {
                                    setSelectedMonth(index + 1);
                                    setShowMonthPicker(false);
                                }}
                            >
                                <Text className={`text-center ${selectedMonth === index + 1 ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                    {/* Year Selector could be added here if needed, for now assuming current year or manual simple control if requested, but let's just stick to month for this iteration unless complex year nav is needed */}
                    <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-gray-200">
                        <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)} className="p-2">
                            <ChevronLeft size={20} color="#4b5563" />
                        </TouchableOpacity>
                        <Text className="font-bold text-lg">{selectedYear}</Text>
                        <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)} className="p-2">
                            <ChevronLeft size={20} color="#4b5563" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowMonthPicker(false)}
                        className="mt-4 bg-indigo-600 p-3 rounded-lg"
                    >
                        <Text className="text-white text-center font-bold">Tutup</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (loading && !employee) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const openEditModal = (log: AttendanceLog) => {
        setEditingLog(log);
        setEditStatus(''); // Reset or set based on current status if needed
        setEditNote(log.notes || '');
        setShowStatusModal(true);
    };

    const handleSaveStatus = async () => {
        if (!editingLog || !editStatus) {
            Alert.alert("Error", "Pilih status terlebih dahulu");
            return;
        }

        if (editStatus === 'Lainnya' && !editNote.trim()) {
            Alert.alert("Error", "Isi keterangan izin");
            return;
        }

        try {
            setIsSaving(true);
            // Prepare status - if 'Lainnya', effectively it is 'Izin' but we use the note to describe detailed reason
            // User requested dropdown options: Sakit, Acara, Lainnya. These map to 'Izin' or 'Sakit'.

            // Map UI selection to DB status
            let dbStatus = 'Izin';
            if (editStatus === 'Sakit') dbStatus = 'Sakit';
            if (editStatus === 'Acara' || editStatus === 'Lainnya') dbStatus = 'Izin';

            await employeeService.updateAttendanceStatus(
                employee!.id,
                editingLog.date,
                dbStatus,
                editNote
            );

            // Close and refresh
            setShowStatusModal(false);
            fetchLogs();
            Alert.alert("Sukses", "Status berhasil diperbarui");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memperbarui status");
        } finally {
            setIsSaving(false);
        }
    };

    const renderStatusModal = () => (
        <Modal
            visible={showStatusModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowStatusModal(false)}
        >
            <View className="flex-1 bg-black/50 justify-center items-center p-4">
                <View className="bg-white rounded-xl w-full max-w-sm p-6">
                    <Text className="text-xl font-bold text-center mb-6">Ubah Status Absensi ({editingLog && new Date(editingLog.date).getDate()})</Text>

                    <View className="gap-3 mb-4">
                        {['Sakit', 'Acara', 'Lainnya'].map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => {
                                    setEditStatus(option);
                                    if (option !== 'Lainnya') setEditNote(option); // Auto-fill note for simple cases
                                    else setEditNote('');
                                }}
                                className={`p-4 rounded-xl border ${editStatus === option ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Text className={`text-center font-bold ${editStatus === option ? 'text-indigo-600' : 'text-gray-600'}`}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {editStatus === 'Lainnya' && (
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-500 mb-2">Keterangan</Text>
                            <TextInput
                                value={editNote}
                                onChangeText={setEditNote}
                                placeholder="Tulis alasan..."
                                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                                multiline
                            />
                        </View>
                    )}

                    <View className="flex-row gap-3 mt-4">
                        <TouchableOpacity
                            onPress={() => setShowStatusModal(false)}
                            className="flex-1 p-3 bg-gray-200 rounded-lg"
                        >
                            <Text className="text-center font-bold text-gray-600">Batal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSaveStatus}
                            disabled={isSaving}
                            className="flex-1 p-3 bg-indigo-600 rounded-lg"
                        >
                            {isSaving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-center font-bold text-white">Simpan</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <LinearGradient
                colors={['#4c1d95', '#7c3aed']}
                className="pt-12 pb-6 px-6 rounded-b-[30px] shadow-lg"
            >
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 bg-white/20 rounded-full mr-4"
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>
                        Riwayat: {employee?.name}
                    </Text>
                </View>

                {/* Date Selector Trigger */}
                <TouchableOpacity
                    onPress={() => setShowMonthPicker(true)}
                    className="flex-row bg-white/20 self-start px-4 py-2 rounded-full items-center"
                >
                    <Calendar size={18} color="white" className="mr-2" />
                    <Text className="text-white font-medium">
                        {MONTHS[selectedMonth - 1]} {selectedYear}
                    </Text>
                </TouchableOpacity>
            </LinearGradient>

            {/* Summary Stats */}
            <View className="px-6 -mt-0 pt-6">
                <View className="flex-row gap-2 mb-4">
                    <View className="flex-1 bg-white p-3 rounded-xl shadow-sm items-center">
                        <Text className="text-green-600 text-xl font-bold">{summary.present}</Text>
                        <Text className="text-gray-400 text-[10px] mt-1 text-center">Masuk</Text>
                    </View>
                    <View className="flex-1 bg-white p-3 rounded-xl shadow-sm items-center">
                        <Text className="text-red-500 text-xl font-bold">{summary.absent}</Text>
                        <Text className="text-gray-400 text-[10px] mt-1 text-center">Alpha/Tidak</Text>
                    </View>
                    <View className="flex-1 bg-white p-3 rounded-xl shadow-sm items-center">
                        <Text className="text-yellow-600 text-xl font-bold">{summary.permission}</Text>
                        <Text className="text-gray-400 text-[10px] mt-1 text-center">Izin/Sakit</Text>
                    </View>
                    <View className="flex-1 bg-white p-3 rounded-xl shadow-sm items-center">
                        <Text className="text-orange-600 text-xl font-bold">{summary.lateCount}</Text>
                        <Text className="text-gray-400 text-[10px] mt-1 text-center">Telat ({summary.totalLateMinutes}m)</Text>
                    </View>
                </View>

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                    {['Semua', 'Masuk', 'Telat', 'Izin', 'Alpha'].map((status) => (
                        <TouchableOpacity
                            key={status}
                            onPress={() => {
                                setFilterStatus(status);
                                setCurrentPage(1);
                            }}
                            className={`mr-2 px-4 py-2 rounded-full border ${filterStatus === status
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <Text className={`font-bold text-xs ${filterStatus === status ? 'text-white' : 'text-gray-600'
                                }`}>
                                {status}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Logs List */}
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
                {loadingLogs ? (
                    <ActivityIndicator color="#4f46e5" className="mt-10" />
                ) : filteredLogs.length === 0 ? (
                    <View className="items-center justify-center mt-20">
                        <Text className="text-gray-400">Tidak ada data absensi untuk filter ini</Text>
                    </View>
                ) : (
                    <>
                        {paginatedLogs.map((log) => (
                            <View key={log.id} className="bg-white mb-3 p-4 rounded-xl shadow-sm border border-gray-100 flex-row items-center">
                                {/* Date Box */}
                                <View className="bg-gray-50 rounded-lg p-2 items-center justify-center w-16 mr-3 border border-gray-200">
                                    <Text className="text-gray-500 text-xs font-bold">{new Date(log.date).getDate()}</Text>
                                    <Text className="text-gray-400 text-[10px]">{MONTHS[new Date(log.date).getMonth()].substring(0, 3)}</Text>
                                </View>

                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1 gap-2">
                                        <View className={`w-2 h-2 rounded-full ${log.status === 'Masuk' ? 'bg-green-500' :
                                            log.status === 'Izin' || log.status === 'Sakit' ? 'bg-yellow-500' :
                                                'bg-red-500'
                                            }`} />
                                        <Text className="font-bold text-gray-800">{log.status}</Text>

                                        {log.late_minutes && log.late_minutes > 0 ? (
                                            <View className="bg-orange-100 px-2 py-0.5 rounded ml-2">
                                                <Text className="text-orange-600 text-[10px] font-bold">Telat {log.late_minutes}m</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View>
                                        <Text className="text-gray-400 text-xs">
                                            {log.status === 'Alpha'
                                                ? '23.59'
                                                : new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                            }
                                            {log.status !== 'Alpha' && " WIB"}
                                        </Text>
                                        {log.notes && (
                                            <Text className="text-xs text-indigo-500 italic mt-0.5">"{log.notes}"</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Edit Button for Alpha */}
                                {log.status === 'Alpha' && (
                                    <TouchableOpacity
                                        onPress={() => openEditModal(log)}
                                        className="bg-indigo-500 p-2 rounded-lg"
                                    >
                                        <Edit size={16} color="white" />
                                    </TouchableOpacity>
                                )}

                                {/* Photo Thumbnail */}
                                {log.attendance_photo_url ? (
                                    <TouchableOpacity
                                        onPress={() => setSelectedHistoryImage(log.attendance_photo_url || null)}
                                    >
                                        <Image
                                            source={{ uri: log.attendance_photo_url }}
                                            className="w-10 h-10 rounded-lg bg-gray-200"
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <View className="w-10 h-10" />
                                )}
                            </View>
                        ))}

                        {/* Pagination Controls */}
                        {filteredLogs.length > itemsPerPage && (
                            <View className="flex-row justify-between items-center mt-4 mb-8 bg-white p-3 rounded-xl border border-gray-100">
                                <TouchableOpacity
                                    disabled={currentPage === 1}
                                    onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    className={`p-2 rounded-lg border ${currentPage === 1 ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
                                >
                                    <ChevronLeft size={20} color={currentPage === 1 ? "#D1D5DB" : "#4f46e5"} />
                                </TouchableOpacity>

                                <Text className="text-gray-600 font-medium text-xs">
                                    Page {currentPage} of {totalPages}
                                </Text>

                                <TouchableOpacity
                                    disabled={currentPage >= totalPages}
                                    onPress={() => setCurrentPage(currentPage + 1)}
                                    className={`p-2 rounded-lg border ${currentPage >= totalPages ? 'border-gray-100 bg-gray-50' : 'border-indigo-100 bg-indigo-50'}`}
                                >
                                    <ChevronRight size={20} color={currentPage >= totalPages ? "#D1D5DB" : "#4f46e5"} style={currentPage >= totalPages ? {} : {}} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {renderMonthPicker()}
            {renderStatusModal()}

            {/* Photo Viewer Modal */}
            <Modal visible={!!selectedHistoryImage} transparent={true} animationType="fade">
                <View className="flex-1 bg-black/90 justify-center items-center p-4">
                    <TouchableOpacity
                        onPress={() => setSelectedHistoryImage(null)}
                        className="absolute top-12 right-6 z-10 p-2 bg-white/20 rounded-full"
                    >
                        <XCircle color="white" size={24} />
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
        </View>
    );
}
