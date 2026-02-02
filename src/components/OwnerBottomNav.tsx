import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, FileText, UserCheck, LogOut } from 'lucide-react-native';
import { authService } from '../services/authService';

interface OwnerBottomNavProps {
    activeMenu?: 'home' | 'log' | 'absensi';
}

export default function OwnerBottomNav({ activeMenu = 'home' }: OwnerBottomNavProps) {
    const router = useRouter();

    const handleLogout = () => {
        Alert.alert(
            "Konfirmasi Logout",
            "Apakah Anda yakin ingin keluar?",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Keluar",
                    style: "destructive",
                    onPress: async () => {
                        await authService.signOut();
                        router.replace('/auth');
                    }
                }
            ]
        );
    };

    return (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex-row justify-around py-4 pb-6 z-50">
            <TouchableOpacity
                className="items-center"
                onPress={() => router.push('/owner/Dashboard')}
            >
                <Home color={activeMenu === 'home' ? "#4f46e5" : "#9ca3af"} size={24} />
                <Text className={`text-[10px] font-bold mt-1 ${activeMenu === 'home' ? 'text-indigo-600' : 'text-gray-400'}`}>Beranda</Text>
            </TouchableOpacity>

            <TouchableOpacity
                className="items-center"
                onPress={() => {
                    // Navigate to Log Bahan if implemented, or just stay/placeholder
                    // router.push('/owner/logbahan'); 
                    console.log("Log Bahan pressed");
                }}
            >
                <FileText color={activeMenu === 'log' ? "#4f46e5" : "#9ca3af"} size={24} />
                <Text className={`text-[10px] font-medium mt-1 ${activeMenu === 'log' ? 'text-indigo-600' : 'text-gray-400'}`}>Log Bahan</Text>
            </TouchableOpacity>

            <TouchableOpacity
                className="items-center"
                onPress={() => {
                    // Navigate to Absensi if implemented
                    // router.push('/owner/absensi');
                    console.log("Absensi pressed");
                }}
            >
                <UserCheck color={activeMenu === 'absensi' ? "#4f46e5" : "#9ca3af"} size={24} />
                <Text className={`text-[10px] font-medium mt-1 ${activeMenu === 'absensi' ? 'text-indigo-600' : 'text-gray-400'}`}>Absensi</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center" onPress={handleLogout}>
                <LogOut color="#9ca3af" size={24} />
                <Text className="text-[10px] text-gray-400 font-medium mt-1">Keluar</Text>
            </TouchableOpacity>
        </View>
    );
}
