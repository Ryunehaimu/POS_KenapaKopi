import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { ArrowLeft, RefreshCcw, Camera, User } from 'lucide-react-native';

import { useRouter } from 'expo-router';
import { attendanceService, Employee, AttendanceLog } from '../../../services/attendanceService';
import KasirSidebar from '../../../components/KasirSidebar';

export default function AttendancePage() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const cameraRef = useRef<CameraView>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);
  
  // Manual Selection State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await attendanceService.getEmployees();
      setEmployees(data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data karyawan');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });

        if (!photo || !photo.base64) throw new Error("Gagal mengambil gambar");

        setCapturedPhoto(photo);

        // 1. Detect Face
        const options = {
           mode: FaceDetector.FaceDetectorMode.fast,
           detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
           runClassifications: FaceDetector.FaceDetectorClassifications.none,
        };
        
        const result = await FaceDetector.detectFacesAsync(photo.uri, options);

        if (result.faces.length > 0) {
           // 2. Open Selection Modal instead of Auto-Identify
           setShowEmployeeModal(true);
           fetchEmployees(); 
        } else {
           Alert.alert("Wajah Tidak Terdeteksi", "Mohon pastikan wajah anda terlihat jelas di kamera.", [
             { text: "Coba Lagi", onPress: resetFlow }
           ]);
        }

      } catch (error) {
        Alert.alert("Error", "Gagal mengambil foto.");
        resetFlow();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleEmployeeSelect = async (employee: Employee) => {
    setShowEmployeeModal(false);
    setIsProcessing(true);

    try {
      // 3. Process Attendance (Check-in Only)
      // Check if already clocked in today
      const existingLog = await attendanceService.getTodayLog(employee.id);

      if (existingLog) {
         const time = new Date(existingLog.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
         
         Alert.alert(
             "Sudah Absen",
             `Halo ${employee.name}, anda sudah melakukan absensi hari ini pada pukul ${time}.`,
             [{ text: "OK", onPress: resetFlow }]
         );
      } else {
         // Perform Clock In
         await attendanceService.logAttendance(employee.id, 'Masuk', capturedPhoto.base64);
         Alert.alert(
            "Berhasil Absen",
            `Selamat Datang, ${employee.name}! Absensi berhasil dicatat.`,
             [{ text: "OK", onPress: resetFlow }]
         );
      }

    } catch (error: any) {

      const errorMessage = error.message || "Gagal memproses absensi.";
      Alert.alert("Gagal", errorMessage, [{ text: "OK", onPress: resetFlow }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const resetFlow = () => {
      setCapturedPhoto(null);
      setIsProcessing(false);
      setShowEmployeeModal(false);
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
                   <Text className="text-white text-3xl font-bold">Absensi Masuk</Text>
                   <Text className="text-gray-200 text-lg">Arahkan wajah ke kamera untuk absen</Text>
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
                           {capturedPhoto ? "Memproses..." : "Memproses..."}
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
                          className="w-20 h-20 bg-white rounded-full items-center justify-center border-4 border-indigo-500 shadow-lg shadow-indigo-500/50"
                       >
                           <View className="w-16 h-16 bg-white rounded-full border-2 border-gray-300" />
                       </TouchableOpacity>

                       <View className="w-14" />
                   </View>
               )}
            </View>
        </View>

        <Modal visible={showEmployeeModal} animationType="slide" transparent>
            <View className="flex-1 bg-black/80 justify-end">
                <View className="bg-white rounded-t-3xl h-[70%] p-6">
                    <Text className="text-2xl font-bold text-gray-900 mb-2">Pilih Nama Anda</Text>
                    <Text className="text-gray-500 mb-6">Silahkan pilih nama anda dari daftar di bawah:</Text>

                    {loadingEmployees ? (
                        <ActivityIndicator size="large" color="#4F46E5" className="mt-10" />
                    ) : (
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            <View className="flex-row flex-wrap gap-4">
                                {employees.map(emp => (
                                    <TouchableOpacity 
                                        key={emp.id}
                                        onPress={() => handleEmployeeSelect(emp)}
                                        className="w-[47%] bg-gray-50 p-4 rounded-xl border border-gray-200 items-center active:bg-indigo-50 active:border-indigo-500"
                                    >
                                        <View className="w-16 h-16 bg-white rounded-full mb-3 items-center justify-center overflow-hidden border border-gray-200">
                                            {emp.photo_url ? (
                                                <Image source={{ uri: emp.photo_url }} className="w-full h-full" />
                                            ) : (
                                                <User size={32} color="#9CA3AF" />
                                            )}
                                        </View>
                                        <Text className="font-bold text-gray-800 text-center">{emp.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    )}
                    
                    <TouchableOpacity 
                        onPress={resetFlow}
                        className="mt-4 py-4 bg-gray-200 rounded-xl items-center"
                    >
                        <Text className="font-bold text-gray-700">Batal / Foto Ulang</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      </View>
    </View>
  );
}
