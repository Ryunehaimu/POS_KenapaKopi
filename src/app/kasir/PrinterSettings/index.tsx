import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bluetooth, Printer, CheckCircle, RefreshCw, Trash2 } from 'lucide-react-native';
import KasirSidebar from '../../../components/KasirSidebar';
import { printerService, PrinterDevice } from '../../../services/printerService';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrinterSettingsScreen() {
    const router = useRouter();
    const [devices, setDevices] = useState<PrinterDevice[]>([]);
    const [scanning, setScanning] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(null);
    const [savedPrinter, setSavedPrinter] = useState<PrinterDevice | null>(null);
    const [testPrinting, setTestPrinting] = useState(false);

    useEffect(() => {
        loadSavedPrinter();
        checkCurrentConnection();
    }, []);

    const loadSavedPrinter = async () => {
        const saved = await printerService.loadDefaultPrinter();
        setSavedPrinter(saved);
    };

    const checkCurrentConnection = () => {
        const current = printerService.getConnectedPrinter();
        setConnectedPrinter(current);
    };

    const handleScan = async () => {
        try {
            setScanning(true);
            setDevices([]);
            const foundDevices = await printerService.scanDevices();
            setDevices(foundDevices);
            
            if (foundDevices.length === 0) {
                Alert.alert('Info', 'Tidak ditemukan printer Bluetooth.\n\nPastikan printer sudah dipair di pengaturan Bluetooth Android.');
            }
        } catch (error: any) {
            console.error('Scan error:', error);
            
            if (error.message?.includes('permission')) {
                Alert.alert(
                    'Izin Bluetooth Diperlukan',
                    'Untuk menggunakan printer Bluetooth, izinkan akses berikut:\n\n' +
                    '1. Buka Settings Android\n' +
                    '2. Pilih Apps → POS KenapaKopi\n' +
                    '3. Pilih Permissions\n' +
                    '4. Aktifkan "Nearby devices" dan "Location"\n\n' +
                    'Kemudian coba Scan lagi.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Error', error.message || 'Gagal scan perangkat Bluetooth');
            }
        } finally {
            setScanning(false);
        }
    };

    const handleConnect = async (device: PrinterDevice) => {
        try {
            setConnecting(device.inner_mac_address);
            await printerService.connectPrinter(device.inner_mac_address);
            setConnectedPrinter(device);
            Alert.alert('Sukses', `Terhubung ke ${device.device_name}`);
        } catch (error: any) {
            console.error('Connect error:', error);
            Alert.alert('Error', 'Gagal menghubungkan printer');
        } finally {
            setConnecting(null);
        }
    };

    const handleDisconnect = async () => {
        try {
            await printerService.disconnectPrinter();
            setConnectedPrinter(null);
            Alert.alert('Info', 'Printer terputus');
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    };

    const handleSaveDefault = async () => {
        if (connectedPrinter) {
            await printerService.saveDefaultPrinter(connectedPrinter);
            setSavedPrinter(connectedPrinter);
            Alert.alert('Sukses', 'Printer disimpan sebagai default');
        }
    };

    const handleClearDefault = async () => {
        Alert.alert(
            'Konfirmasi',
            'Hapus printer default?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        await printerService.clearDefaultPrinter();
                        setSavedPrinter(null);
                    }
                }
            ]
        );
    };

    const handleTestPrint = async () => {
        if (!connectedPrinter) {
            Alert.alert('Error', 'Tidak ada printer terhubung');
            return;
        }

        try {
            setTestPrinting(true);
            await printerService.printTestPage();
            Alert.alert('Sukses', 'Test print berhasil!');
        } catch (error: any) {
            console.error('Test print error:', error);
            Alert.alert('Error', 'Gagal test print');
        } finally {
            setTestPrinting(false);
        }
    };

    const renderDevice = ({ item }: { item: PrinterDevice }) => {
        const isConnected = connectedPrinter?.inner_mac_address === item.inner_mac_address;
        const isConnecting = connecting === item.inner_mac_address;
        const isSaved = savedPrinter?.inner_mac_address === item.inner_mac_address;

        return (
            <TouchableOpacity
                onPress={() => !isConnected && handleConnect(item)}
                disabled={isConnecting || isConnected}
                className={`bg-white p-4 mb-3 rounded-xl border-2 ${
                    isConnected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                            isConnected ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                            <Printer size={24} color={isConnected ? '#22C55E' : '#6B7280'} />
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <Text className="font-bold text-gray-900 text-base">
                                    {item.device_name || 'Unknown Device'}
                                </Text>
                                {isSaved && (
                                    <View className="ml-2 bg-indigo-100 px-2 py-0.5 rounded">
                                        <Text className="text-indigo-600 text-xs font-medium">Default</Text>
                                    </View>
                                )}
                            </View>
                            <Text className="text-gray-500 text-sm">{item.inner_mac_address}</Text>
                        </View>
                    </View>
                    
                    {isConnecting ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                    ) : isConnected ? (
                        <CheckCircle size={24} color="#22C55E" />
                    ) : (
                        <Text className="text-indigo-600 font-medium">Hubungkan</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50 flex-row">
            <KasirSidebar activeMenu="printerSettings" />
            
            <View className="flex-1">
                {/* Header */}
                <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="px-6 py-6"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-4">
                                <Bluetooth size={24} color="white" />
                            </View>
                            <View>
                                <Text className="text-white text-2xl font-bold">Pengaturan Printer</Text>
                                <Text className="text-white/80">Kelola printer Bluetooth thermal</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                <View className="flex-1 p-6">
                    {/* Current Connection Status */}
                    <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
                        <Text className="text-gray-500 font-medium mb-3 uppercase text-xs tracking-wider">
                            Status Koneksi
                        </Text>
                        
                        {connectedPrinter ? (
                            <View>
                                <View className="flex-row items-center mb-4">
                                    <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                                    <Text className="text-green-600 font-medium">Terhubung</Text>
                                </View>
                                <View className="bg-green-50 p-4 rounded-xl mb-4">
                                    <Text className="font-bold text-gray-900">{connectedPrinter.device_name}</Text>
                                    <Text className="text-gray-500 text-sm">{connectedPrinter.inner_mac_address}</Text>
                                </View>
                                <View className="flex-row">
                                    <TouchableOpacity
                                        onPress={handleTestPrint}
                                        disabled={testPrinting}
                                        className="flex-1 bg-indigo-600 py-3 rounded-xl mr-2 flex-row items-center justify-center"
                                    >
                                        {testPrinting ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <Printer size={18} color="white" />
                                                <Text className="text-white font-bold ml-2">Test Print</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    
                                    {!savedPrinter || savedPrinter.inner_mac_address !== connectedPrinter.inner_mac_address ? (
                                        <TouchableOpacity
                                            onPress={handleSaveDefault}
                                            className="flex-1 bg-green-600 py-3 rounded-xl ml-2 items-center justify-center"
                                        >
                                            <Text className="text-white font-bold">Simpan Default</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={handleDisconnect}
                                            className="flex-1 bg-red-100 py-3 rounded-xl ml-2 items-center justify-center"
                                        >
                                            <Text className="text-red-600 font-bold">Putuskan</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <View className="flex-row items-center">
                                <View className="w-3 h-3 rounded-full bg-gray-400 mr-2" />
                                <Text className="text-gray-500">Tidak ada printer terhubung</Text>
                            </View>
                        )}
                    </View>

                    {/* Saved Default Printer */}
                    {savedPrinter && (
                        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
                            <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-gray-500 font-medium uppercase text-xs tracking-wider">
                                    Printer Default
                                </Text>
                                <TouchableOpacity onPress={handleClearDefault}>
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                            <View className="bg-indigo-50 p-4 rounded-xl">
                                <Text className="font-bold text-gray-900">{savedPrinter.device_name}</Text>
                                <Text className="text-gray-500 text-sm">{savedPrinter.inner_mac_address}</Text>
                            </View>
                        </View>
                    )}

                    {/* Scan Section */}
                    <View className="bg-white rounded-2xl p-5 flex-1 shadow-sm border border-gray-100">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-gray-500 font-medium uppercase text-xs tracking-wider">
                                Perangkat Ditemukan
                            </Text>
                            <TouchableOpacity
                                onPress={handleScan}
                                disabled={scanning}
                                className="flex-row items-center bg-indigo-100 px-4 py-2 rounded-full"
                            >
                                {scanning ? (
                                    <ActivityIndicator size="small" color="#4F46E5" />
                                ) : (
                                    <>
                                        <RefreshCw size={16} color="#4F46E5" />
                                        <Text className="text-indigo-600 font-medium ml-2">Scan</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {devices.length === 0 && !scanning ? (
                            <View className="flex-1 items-center justify-center py-10">
                                <Bluetooth size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-3 text-center">
                                    Tap "Scan" untuk mencari printer{'\n'}Bluetooth yang sudah dipair
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={devices}
                                keyExtractor={(item) => item.inner_mac_address}
                                renderItem={renderDevice}
                                refreshControl={
                                    <RefreshControl refreshing={scanning} onRefresh={handleScan} />
                                }
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
}
