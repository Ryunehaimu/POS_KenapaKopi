import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Camera as CameraIcon, CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';
import { employeeService, Employee } from '../../../../services/employeeService';

export default function FaceScanScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<CameraType>('front');

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    // Face detected state is removed as we can't detect in real-time with CameraView yet
    // We will verify after capture

    useEffect(() => {
        loadEmployee();
    }, [id]);

    const loadEmployee = async () => {
        try {
            const data = await employeeService.getEmployeeById(id as string);
            setEmployee(data);
        } catch (error) {
            Alert.alert("Error", "Gagal memuat data karyawan");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-900 p-8">
                <Text className="text-white text-center mb-4 text-lg">Kami membutuhkan izin kamera untuk fitur absensi.</Text>
                <TouchableOpacity onPress={requestPermission} className="bg-indigo-600 px-6 py-3 rounded-xl">
                    <Text className="text-white font-bold">Berikan Izin</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-gray-400">Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleScan = async () => {
        if (cameraRef.current) {
            setScanning(true);
            try {
                // 1. Take Picture
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: true,
                });

                if (!photo) {
                    throw new Error("Gagal mengambil foto");
                }

                // 2. Simulate Face Detection & Matching
                // Since native FaceDetector module requires a rebuild, we will simulate the check

                setTimeout(async () => {
                    // Random success for simulation or always success since face found
                    const isMatch = true;

                    if (isMatch) {
                        try {
                            const today = new Date().toISOString().split('T')[0];
                            await employeeService.markAttendance(id as string, 'Masuk', today);
                            Alert.alert(
                                "Absensi Berhasil!",
                                `Selamat datang, ${employee?.name}. Absensi tercatat.`,
                                [{ text: "OK", onPress: () => router.replace('/kasir/absensi') }]
                            );
                        } catch (err) {
                            Alert.alert("Gagal", "Gagal menyimpan data absensi.");
                        }
                    } else {
                        Alert.alert("Gagal Verifikasi", "Wajah tidak cocok dengan data karyawan.");
                    }
                    setScanning(false);
                }, 1500);

            } catch (error) {
                console.error(error);
                Alert.alert("Error", "Gagal memproses foto.");
                setScanning(false);
            }
        }
    };

    if (loading) return <View className="flex-1 bg-gray-900 justify-center items-center"><ActivityIndicator color="white" /></View>;

    return (
        <View className="flex-1 bg-black relative">
            <CameraView
                style={{ flex: 1 }}
                facing={facing}
                ref={cameraRef}
            >
                {/* Overlay UI */}
                <View className="flex-1 bg-black/30 justify-between py-12 px-6">
                    {/* Header */}
                    <View className="items-center">
                        <View className="flex-row items-center self-start mb-4">
                            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-black/40 rounded-full mr-4">
                                <ChevronLeft color="white" size={24} />
                            </TouchableOpacity>
                            <Text className="text-white text-xl font-bold">Verifikasi Wajah</Text>
                        </View>
                        <View className="bg-yellow-500/90 px-4 py-1 rounded-full">
                            <Text className="text-black font-bold text-xs">⚠️ MODE SIMULASI (TANPA AI)</Text>
                        </View>
                    </View>

                    {/* Face Frame */}
                    <View className="items-center justify-center flex-1">
                        <View className="w-80 h-80 border-4 border-white/50 rounded-3xl items-center justify-center bg-transparent">
                            <Text className="text-white/80 text-center font-bold text-lg bg-black/40 px-4 py-2 rounded-lg">
                                Posisikan Wajah
                            </Text>
                        </View>
                        <Text className="text-white/80 mt-8 text-center text-lg font-medium">
                            {employee?.name}
                        </Text>
                    </View>

                    {/* Controls */}
                    <View className="items-center pb-8">
                        <TouchableOpacity
                            onPress={handleScan}
                            disabled={scanning}
                            className={`w-20 h-20 rounded-full items-center justify-center border-4 ${scanning ? 'bg-gray-500 border-gray-400' : 'bg-white border-indigo-500'}`}
                        >
                            {scanning ? (
                                <ActivityIndicator color="white" size="large" />
                            ) : (
                                <CameraIcon size={32} color="#4f46e5" />
                            )}
                        </TouchableOpacity>
                        <Text className="text-white/60 mt-4 text-sm">
                            {scanning ? "Memverifikasi..." : "Ambil Foto"}
                        </Text>
                    </View>
                </View>
            </CameraView>
        </View>
    );
}
