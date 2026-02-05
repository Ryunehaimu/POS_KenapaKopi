import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, LogOut, FileClock } from 'lucide-react-native';
import { authService } from '../services/authService';

interface OwnerBottomNavProps {
    activeMenu?: 'home' | 'history';
}

export default function OwnerBottomNav({ activeMenu = 'home' }: OwnerBottomNavProps) {
    const router = useRouter();

    const [userRole, setUserRole] = React.useState<'owner' | 'captain'>('owner');

    React.useEffect(() => {
        checkRole();
    }, []);

    const checkRole = async () => {
        const { session } = await authService.getSession();
        const email = session?.user?.email || "";
        if (email.toLowerCase().startsWith("captain")) {
            setUserRole('captain');
        }
    };

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

            {userRole === 'owner' && (
                <TouchableOpacity
                    className="items-center"
                    onPress={() => router.push('/owner/history')}
                >
                    <FileClock color={activeMenu === 'history' ? "#4f46e5" : "#9ca3af"} size={24} />
                    <Text className={`text-[10px] font-bold mt-1 ${activeMenu === 'history' ? 'text-indigo-600' : 'text-gray-400'}`}>Riwayat</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity className="items-center" onPress={handleLogout}>
                <LogOut color="#9ca3af" size={24} />
                <Text className="text-[10px] text-gray-400 font-medium mt-1">Keluar</Text>
            </TouchableOpacity>
        </View>
    );
}
