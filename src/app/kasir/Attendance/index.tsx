import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Modal, ScrollView, FlatList } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, RefreshCcw, Camera, User, LogIn, LogOut, Clock, X } from 'lucide-react-native';

import { useRouter } from 'expo-router';
import { attendanceService, Employee, AttendanceLog } from '../../../services/attendanceService';
import { shiftService, Shift } from '../../../services/shiftService';
import KasirSidebar from '../../../components/KasirSidebar';

export default function AttendancePage() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const cameraRef = useRef<CameraView>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [loadingData, setLoadingData] = useState(false);

  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [empData, shiftData] = await Promise.all([
        attendanceService.getEmployees(),
        shiftService.getShifts()
      ]);
      setEmployees(empData);
      setShifts(shiftData);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
        });

        if (!photo || !photo.base64) throw new Error("Gagal mengambil gambar");

        setCapturedPhoto(photo);

        // Open employee selection
        setShowEmployeeModal(true);
        loadData();

      } catch (error) {
        Alert.alert("Error", "Gagal mengambil foto.");
        resetFlow();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(false);
    // Open Action Modal (Masuk / Pulang)
    setShowActionModal(true);
  };

  // FLOW: ABSEN MASUK -> Select Shift -> Confirm
  const handleClockInFlow = () => {
    setShowActionModal(false);
    setShowShiftModal(true);
  };

  const confirmClockIn = async (shift: Shift) => {
    if (!selectedEmployee || !capturedPhoto) return;

    setShowShiftModal(false);
    setIsProcessing(true);

    try {
      // Check if already clocked in? Optional but good UX.
      // For now trust the user choice as per request "bisa pilih dia sedang absen masuk atau absen pulang"

      await attendanceService.logAttendance(selectedEmployee.id, 'Masuk', capturedPhoto.base64, shift.id);

      Alert.alert(
        "Berhasil Absen Masuk",
        `Halo ${selectedEmployee.name}, selamat bekerja di ${shift.name}!`,
        [{ text: "OK", onPress: resetFlow }]
      );
    } catch (error: any) {
      Alert.alert("Gagal", error.message || "Gagal absen masuk.");
      resetFlow(); // Reset on error too? Or keep state? Reset is safer to avoid loops.
    } finally {
      setIsProcessing(false);
    }
  };

  // FLOW: ABSEN PULANG -> Confirm
  const handleClockOutFlow = async () => {
    if (!selectedEmployee) return;

    setShowActionModal(false);
    setIsProcessing(true);

    try {
      // Here logic checks active session
      // We rely on service.clockOut to find the active session and cap the time if needed
      await attendanceService.clockOut(selectedEmployee.id);

      Alert.alert(
        "Berhasil Absen Pulang",
        `Terima kasih ${selectedEmployee.name}, hati-hati di jalan!`,
        [{ text: "OK", onPress: resetFlow }]
      );

    } catch (error: any) {
      Alert.alert("Gagal", error.message || "Gagal absen pulang (Mungkin belum absen masuk hari ini).");
      resetFlow();
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFlow = () => {
    setCapturedPhoto(null);
    setIsProcessing(false);
    setShowEmployeeModal(false);
    setShowActionModal(false);
    setShowShiftModal(false);
    setSelectedEmployee(null);
  };

  if (!permission || !permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Text className="text-white mb-4">Izin kamera diperlukan.</Text>
        <TouchableOpacity onPress={requestPermission} className="bg-indigo-600 px-4 py-2 rounded">
          <Text className="text-white">Berikan Izin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row bg-black">
      <KasirSidebar activeMenu="attendance" />

      <View className="flex-1 relative">
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          ref={cameraRef}
        />

        <View className="flex-1 justify-between p-8 bg-black/30">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-white text-3xl font-bold">Absensi Digital</Text>
              <Text className="text-gray-200 text-lg">Arahkan wajah ke kamera untuk memulai</Text>
            </View>
            <View className="bg-white/20 p-2 rounded-lg">
              <Text className="text-white font-bold">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
          </View>

          <View className="items-center pb-8">
            {isProcessing ? (
              <View className="items-center">
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text className="text-white mt-4 font-bold text-lg">
                  Memproses...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center space-x-8">
                <TouchableOpacity
                  onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}
                  className="p-4 bg-white/20 rounded-full backdrop-blur-sm"
                >
                  <RefreshCcw color="white" size={24} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCapture}
                  className="w-24 h-24 bg-white rounded-full items-center justify-center border-4 border-indigo-500 shadow-lg shadow-indigo-500/50"
                >
                  <Camera size={40} color="#4f46e5" />
                </TouchableOpacity>

                <View className="w-14" />
              </View>
            )}
          </View>
        </View>

        {/* 1. EMPLOYEE SELECT MODAL */}
        <Modal visible={showEmployeeModal} animationType="slide" transparent>
          <View className="flex-1 bg-black/80 justify-end">
            <View className="bg-white rounded-t-3xl h-[80%] p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900">Siapa Anda?</Text>
                <TouchableOpacity onPress={resetFlow}><X size={24} color="gray" /></TouchableOpacity>
              </View>

              {loadingData ? (
                <ActivityIndicator size="large" color="#4F46E5" />
              ) : (
                <FlatList
                  data={employees}
                  numColumns={2}
                  keyExtractor={item => item.id}
                  columnWrapperStyle={{ justifyContent: 'space-between' }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleEmployeeSelect(item)}
                      className="w-[48%] bg-gray-50 p-4 rounded-xl border border-gray-200 items-center mb-4 active:bg-indigo-50 active:border-indigo-500"
                    >
                      <View className="w-20 h-20 bg-white rounded-full mb-3 items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                        {item.photo_url ? (
                          <Image source={{ uri: item.photo_url }} className="w-full h-full" />
                        ) : (
                          <User size={32} color="#9CA3AF" />
                        )}
                      </View>
                      <Text className="font-bold text-gray-800 text-center text-lg">{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* 2. ACTION SELECT MODAL (MASUK / PULANG) */}
        <Modal visible={showActionModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 justify-center items-center p-6">
            <View className="bg-white w-full max-w-lg rounded-3xl p-8 items-center shadow-2xl">
              <Text className="text-2xl font-bold text-gray-900 mb-2">Pilih Jenis Absensi</Text>
              <Text className="text-gray-500 mb-8 text-center text-lg">
                Halo {selectedEmployee?.name}, apa yang ingin anda lakukan?
              </Text>

              <View className="flex-row gap-4 w-full">
                <TouchableOpacity
                  onPress={handleClockInFlow}
                  className="flex-1 bg-indigo-50 border-2 border-indigo-100 p-6 rounded-2xl items-center active:bg-indigo-100"
                >
                  <View className="bg-indigo-600 p-4 rounded-full mb-4">
                    <LogIn size={32} color="white" />
                  </View>
                  <Text className="text-xl font-bold text-indigo-900">Absen Masuk</Text>
                  <Text className="text-indigo-600 text-sm mt-1">Mulai Shift</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClockOutFlow}
                  className="flex-1 bg-orange-50 border-2 border-orange-100 p-6 rounded-2xl items-center active:bg-orange-100"
                >
                  <View className="bg-orange-600 p-4 rounded-full mb-4">
                    <LogOut size={32} color="white" />
                  </View>
                  <Text className="text-xl font-bold text-orange-900">Absen Pulang</Text>
                  <Text className="text-orange-600 text-sm mt-1">Selesai Shift</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={resetFlow} className="mt-8">
                <Text className="text-gray-400 font-bold">Batalkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 3. SHIFT SELECT MODAL */}
        <Modal visible={showShiftModal} animationType="slide" transparent>
          <View className="flex-1 bg-black/80 justify-end">
            <View className="bg-white rounded-t-3xl p-8 pb-12">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900">Pilih Shift Kerja</Text>
                <TouchableOpacity onPress={resetFlow}><X size={24} color="gray" /></TouchableOpacity>
              </View>
              <Text className="text-gray-500 mb-6 font-medium">Silahkan pilih shift anda hari ini:</Text>

              <ScrollView className="max-h-[60vh]" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 20 }}>
                {shifts.map(shift => (
                  <TouchableOpacity
                    key={shift.id}
                    onPress={() => confirmClockIn(shift)}
                    className="bg-white border border-gray-200 p-5 rounded-2xl flex-row justify-between items-center shadow-sm active:border-indigo-500 active:bg-indigo-50"
                  >
                    <View className="flex-row items-center">
                      <View className="bg-indigo-100 p-3 rounded-xl mr-4">
                        <Clock size={24} color="#4f46e5" />
                      </View>
                      <View>
                        <Text className="font-bold text-gray-900 text-lg">{shift.name}</Text>
                        <Text className="text-gray-500">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</Text>
                      </View>
                    </View>
                    <View className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  </TouchableOpacity>
                ))}
                {shifts.length === 0 && (
                  <Text className="text-center text-red-500 py-4">Belum ada data shift. Hubungi Owner.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </View>
  );
}
