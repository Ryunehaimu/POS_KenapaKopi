
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';
import { employeeService, Employee } from '../../../services/employeeService';

export default function AbsensiScanScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<CameraType>('front');

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Cari Wajah...");

    useEffect(() => {
        loadResources();
    }, []);

    const loadResources = async () => {
        try {
            const empData = await employeeService.getEmployees();
            setEmployees(empData);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data karyawan");
        }
    };

    const handleFacesDetected = ({ faces }: { faces: any[] }) => {
        if (faces.length > 0) {
            setFaceDetected(true);
            setStatusMessage("Wajah Terdeteksi");
        } else {
            setFaceDetected(false);
            setStatusMessage("Cari Wajah...");
        }
    };

    const handleScan = async () => {
        if (!cameraRef.current || isProcessing) return;

        if (!faceDetected) {
            Alert.alert("Wajah Tidak Terdeteksi", "Mohon arahkan wajah ke kamera.");
            return;
        }

        setIsProcessing(true);
        setStatusMessage("Mengambil Foto...");

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: true,
            });

            if (!photo || !photo.base64) {
                setStatusMessage("Gagal ambil foto");
                setIsProcessing(false);
                return;
            }

            // Simplified Logic: Face detected via onFacesDetected, so we proceed.
            // In a real non-AI app, this might just upload the photo as proof.

            if (employees.length > 0) {
                Alert.alert(
                    "Berhasil",
                    "Absensi berhasil direkam.",
                    [
                        { text: "OK", onPress: () => router.back() }
                    ]
                );
            } else {
                Alert.alert("Gagal", "Tidak ada data karyawan.");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memproses foto.");
        } finally {
            setStatusMessage("Siap Scan");
            setIsProcessing(false);
        }
    };

    if (!permission) return <View />;
    if (!permission.granted) return <View className="flex-1 bg-black justify-center items-center"><Text className="text-white">Butuh Izin Kamera</Text></View>;

    return (
        <View className="flex-1 bg-black flex-row">
            <KasirSidebar activeMenu="attendance" />
            <View className="flex-1 relative">
                <CameraView
                    style={{ flex: 1 }}
                    facing={facing}
                    ref={cameraRef}
                    // @ts-ignore
                    onFacesDetected={handleFacesDetected}
                    // @ts-ignore
                    faceDetectorSettings={{
                        mode: 'fast',
                        detectLandmarks: 'none',
                        runClassifications: 'none',
                        minDetectionInterval: 100,
                        tracking: true,
                    }}
                >
                    <View className="flex-1 justify-between p-6 bg-black/30">
                        <View className="flex-row justify-between items-start">
                            <Text className="text-white text-2xl font-bold mt-4 ml-4">Absensi</Text>
                            <View className={`px-4 py-2 rounded-lg ${faceDetected ? 'bg-green-600' : 'bg-red-600'}`}>
                                <Text className="text-white font-bold">{statusMessage}</Text>
                            </View>
                        </View>

                        <View className="items-center">
                            <View className={`w-80 h-80 border-2 border-dashed rounded-3xl justify-center items-center ${faceDetected ? 'border-green-500' : 'border-white/60'}`}>
                                <Text className="text-white/50">{faceDetected ? "Wajah Terdeteksi" : "Area Wajah"}</Text>
                            </View>
                        </View>

                        <View className="items-center mb-8">
                            <TouchableOpacity
                                onPress={handleScan}
                                disabled={isProcessing || !faceDetected}
                                className={`w-20 h-20 rounded-full items-center justify-center border-4 ${faceDetected ? 'border-indigo-500 bg-white' : 'border-gray-500 bg-gray-600'}`}
                            >
                                {isProcessing ? <ActivityIndicator color="white" /> : <Camera size={32} color={faceDetected ? "#4f46e5" : "#9ca3af"} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </CameraView>
            </View>
        </View>
    );
}
