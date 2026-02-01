import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRouter } from "expo-router";
import { authService } from "../../services/authService";
import "../../../global.css"; // Pastikan import ini ada untuk Tailwind

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const redirectBasedOnRole = (email: string) => {
    if (email.toLowerCase().startsWith("kasir")) {
      router.replace('/kasir/Dashboard');
    } else if (email.toLowerCase().startsWith("owner")) {
      router.replace('/owner/Dashboard');
    } else {
      // Default fallback or handle other roles
      router.replace('/kasir/Dashboard'); 
    }
  };

  async function checkSession() {
    const { session } = await authService.getSession();
    if (session?.user?.email) {
      redirectBasedOnRole(session.user.email);
    }
  }

  async function signInWithEmail() {
    setLoading(true)
    const { error, data: {session} } = await authService.signIn(email, password);
    
    if (error) Alert.alert(error.message)
    if (session?.user?.email) {
      console.log('SIGNED IN')
      redirectBasedOnRole(session.user.email);
    }
    setLoading(false)
  }

  return (
    // CONTAINER UTAMA
    // flex-col    : Default HP (Susun ke bawah)
    // md:flex-row : Tablet/Desktop (Susun ke samping kiri-kanan)
    <View className="flex-1 flex-col md:flex-row bg-white">

      {/* --- BAGIAN KIRI: GAMBAR BRANDING --- */}
      {/* Di HP tingginya fix 250px (h-64), di Tablet tingginya Full (md:h-full) & lebar separuh (md:flex-1) */}
      <View className="h-64 w-full md:h-full md:flex-1 bg-amber-50 p-4 md:p-6 items-center justify-center">
        <View className="w-full h-full rounded-3xl overflow-hidden shadow-2xl relative bg-gray-200">
          {/* Overlay Gelap supaya tulisan terbaca */}
          <View className="absolute inset-0 bg-black/30 z-10" />
          
          {/* Gambar Background Kopi */}
          <Image 
            source={{ uri: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=1000&auto=format&fit=crop" }} 
            className="w-full h-full object-cover"
          />
          
          {/* Teks Logo */}
          <View className="absolute bottom-6 left-6 md:bottom-12 md:left-10 z-20">
            <Text className="text-3xl md:text-5xl font-extrabold text-white shadow-sm">
              KenapaKopi.
            </Text>
            <Text className="text-xs md:text-lg text-amber-200 font-medium tracking-[0.2em] mt-2">
              POINT OF SALE SYSTEM
            </Text>
          </View>
        </View>
      </View>

      {/* --- BAGIAN KANAN: FORM LOGIN --- */}
      <KeyboardAwareScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={100}
        className="flex-1 bg-white"
      >
        <View className="flex-1 h-full items-center justify-center p-8">
          <View className="w-full max-w-sm">
            
            {/* Header Form */}
            <View className="mb-10">
              <Text className="text-4xl font-bold text-gray-900 mb-2">Welcome Back!</Text>
              <Text className="text-gray-500 text-lg">
                Masuk untuk mulai mengelola pesanan.
              </Text>
            </View>

            {/* Input Fields */}
            <View className="space-y-6">
              <View>
                <Text className="text-gray-700 font-semibold mb-2 ml-1">Email Staff</Text>
                <TextInput
                  placeholder="barista@kenapakopi.com"
                  placeholderTextColor="#9CA3AF"
                  className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50 text-lg text-gray-900 focus:border-indigo-500 focus:bg-white"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View>
                <Text className="text-gray-700 font-semibold mb-2 ml-1">Password</Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50 text-lg text-gray-900 focus:border-indigo-500 focus:bg-white"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Tombol Login */}
              <TouchableOpacity 
                className={`mt-6 p-4 rounded-2xl shadow-lg shadow-indigo-200 flex-row justify-center items-center ${loading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                onPress={() => signInWithEmail()}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading && <ActivityIndicator size="small" color="white" className="mr-3" />}
                <Text className="text-white text-center font-bold text-xl tracking-wide">
                  {loading ? "Memproses..." : "Masuk Kasir"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer Version */}
            <View className="mt-12 items-center">
              <Text className="text-gray-300 text-sm">v1.0.0 • KenapaKopi Tech</Text>
            </View>

          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}