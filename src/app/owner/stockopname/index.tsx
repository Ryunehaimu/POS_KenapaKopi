import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, FlatList, Alert, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, ChevronLeft, MoreVertical, Edit, X, Check, Search, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { inventoryService, Ingredient, StockLog } from '../../../services/inventoryService';
import OwnerBottomNav from '../../../components/OwnerBottomNav';

const PINNED_STORAGE_KEY = 'STOCK_OPNAME_PINNED_IDS_V2';

export default function StockOpnameScreen() {
    const router = useRouter();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pinnedIngredientsData, setPinnedIngredientsData] = useState<Ingredient[]>([]);

    // Pagination & Search States
    const [ingPage, setIngPage] = useState(1);
    const [ingSearch, setIngSearch] = useState('');
    const [ingTotal, setIngTotal] = useState(0);

    const [logsPage, setLogsPage] = useState(1);
    const [logsSearch, setLogsSearch] = useState('');
    const [logsTotal, setLogsTotal] = useState(0);

    // Dynamic array of pinned IDs
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);

    // Selection Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);


    // Load Logs with Pagination
    const fetchLogs = async () => {
        try {
            const res = await inventoryService.getLogs(undefined, logsSearch, logsPage, 5);
            setLogs(res.data);
            setLogsTotal(res.count || 0);
        } catch (error) {
            console.error("Fetch logs error:", error);
        }
    };

    // Load Ingredients with Pagination
    const fetchIngredients = async () => {
        try {
            const res = await inventoryService.getIngredients(ingSearch, ingPage, 5);
            setIngredients(res.data);
            setIngTotal(res.count || 0);
        } catch (error) {
            console.error("Fetch ingredients error:", error);
        }
    };

    // Load Pinned Data Specifically (independent of pagination)
    const fetchPinnedData = async () => {
        if (pinnedIds.length === 0) return;
        try {
            // Fetch all pinned items details. Ideally, we should have a bulk fetch by IDs.
            // For now, we will fetch individual or use a workaround if needed.
            // Assuming we can just fetch all ingredients if list is small, or iterate.
            // Be efficient: Promise.all
            const promises = pinnedIds.map(id => inventoryService.getIngredientById(id));
            const results = await Promise.all(promises);
            setPinnedIngredientsData(results.filter(i => !!i)); // Filter out nulls
        } catch (error) {
            console.error("Fetch pinned data error:", error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Initial Load of everything
            await Promise.all([
                fetchIngredients(),
                fetchLogs()
            ]);

            // 2. Load pinned IDs from storage
            const stored = await AsyncStorage.getItem(PINNED_STORAGE_KEY);
            let currentPinnedIds: string[] = [];

            if (stored) {
                currentPinnedIds = JSON.parse(stored);
                setPinnedIds(currentPinnedIds);
            } else {
                // If no pinned, we need to pick defaults. 
                // But wait, ingredients might be empty if we rely on state. 
                // We should get defaults from the first fetch if needed?
                // Let's just try to fetch a small batch to determine defaults if needed.
                const firstBatch = await inventoryService.getIngredients('', 1, 4);
                if (firstBatch.data.length > 0) {
                    const defaults = firstBatch.data.map(i => i.id);
                    currentPinnedIds = defaults;
                    setPinnedIds(defaults);
                    await AsyncStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(defaults));
                }
            }

            // 3. Fetch details for pinned IDs
            if (currentPinnedIds.length > 0) {
                const promises = currentPinnedIds.map(id => inventoryService.getIngredientById(id));
                const results = await Promise.all(promises);
                setPinnedIngredientsData(results.filter(i => !!i));
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Effects for Search/Pagination changes (Skip initial load as loadData handles it)
    useEffect(() => {
        fetchIngredients();
    }, [ingPage, ingSearch]);

    useEffect(() => {
        fetchLogs();
    }, [logsPage, logsSearch]);

    useEffect(() => {
        fetchPinnedData();
    }, [pinnedIds]);

    const loadPinnedIds = async (allIngredients: Ingredient[]) => {
        // Deprecated but keeping signature if needed or removing usage
        // Replaced logic in loadData
    };

    const openSelectionModal = () => {
        setTempSelectedIds([...pinnedIds]);
        setModalVisible(true);
    };

    const toggleSelection = (id: string) => {
        if (tempSelectedIds.includes(id)) {
            setTempSelectedIds(tempSelectedIds.filter(tid => tid !== id));
        } else {
            if (tempSelectedIds.length >= 4) {
                Alert.alert("Batas Maksimal", "Anda hanya bisa memilih maksimal 4 bahan untuk ringkasan.");
                return;
            }
            setTempSelectedIds([...tempSelectedIds, id]);
        }
    };

    const saveSelection = async () => {
        setPinnedIds(tempSelectedIds);
        setModalVisible(false);
        try {
            await AsyncStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(tempSelectedIds));
        } catch (e) {
            console.error("Failed to save pinned ids", e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const getPinnedIngredient = (id: string) => {
        return pinnedIngredientsData.find(i => i.id === id);
    };

    const renderIngredientRow = ({ item }: { item: Ingredient }) => (
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <View className="flex-1">
                <Text className="font-bold text-gray-800 text-base">{item.name}</Text>
                <Text className="text-xs text-gray-400 capitalize">{item.type}</Text>
            </View>
            <View className="flex-row items-center gap-4">
                <Text className="font-bold text-gray-800 text-base mr-2">{item.current_stock} {item.unit}</Text>
                <TouchableOpacity onPress={() => router.push(`/owner/stockopname/add-stock/${item.id}`)}>
                    <View className="bg-indigo-50 p-2 rounded-lg">
                        <Plus size={16} color="#4f46e5" />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push(`/owner/stockopname/edit/${item.id}`)}>
                    <MoreVertical size={20} color="#9ca3af" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSummaryCard = (id: string, index: number) => {
        const item = getPinnedIngredient(id);
        if (!item) return null;

        return (
            <View key={index} className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4 min-h-[90px]">
                <View className="flex-1 justify-between">
                    <View>
                        <View className="flex-row items-baseline mb-1 flex-wrap">
                            <Text className="text-indigo-600 text-2xl font-bold mr-1">{item.current_stock}</Text>
                            <Text className="text-gray-400 text-xs">{item.unit}</Text>
                        </View>
                        <Text className="text-gray-500 text-xs font-medium pr-1" numberOfLines={2}>{item.name}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderLog = ({ item }: { item: StockLog }) => (
        <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
            <View>
                <Text className="font-bold text-gray-800">{item.ingredients?.name}</Text>
                <Text className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                </Text>
            </View>
            <View className="items-end">
                <Text className="text-green-600 font-bold">+{item.change_amount} {item.ingredients?.unit}</Text>
                <Text className="text-xs text-gray-400">@ Rp {item.price.toLocaleString()}</Text>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* 1. Header with Gradient */}
                <LinearGradient
                    colors={['#4c1d95', '#7c3aed']}
                    className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg"
                >
                    <TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-6 z-20">
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-center text-xl font-bold mb-4">Stock Opname</Text>

                    <View className="flex-row items-center mb-1">
                        <Text className="text-white text-base font-medium opacity-90 mr-2">Summary</Text>
                        <TouchableOpacity onPress={openSelectionModal} className="bg-white/20 p-1.5 rounded-full">
                            <Edit size={12} color="white" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View className="px-6 -mt-20">
                    {/* 2. Summary Cards Grid (Dynamic) */}
                    <View className="flex-row flex-wrap justify-between mb-8">
                        {pinnedIds.map((id, index) => renderSummaryCard(id, index))}
                        {pinnedIds.length === 0 && (
                            <TouchableOpacity onPress={openSelectionModal} className="w-full bg-white p-6 rounded-xl shadow-sm items-center justify-center">
                                <Text className="text-gray-500 font-medium">Pilih Bahan Ringkasan</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* 3. Stok Bahan List Table */}
                    <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-bold text-gray-900">Stok Bahan</Text>
                            <TouchableOpacity
                                onPress={() => router.push('/owner/stockopname/add')}
                                className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center"
                            >
                                <Plus size={16} color="white" className="mr-1" />
                                <Text className="text-white font-medium text-xs">Tambah</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Ingredient */}
                        <View className="bg-gray-50 rounded-xl px-4 py-2 flex-row items-center border border-gray-100 mb-4">
                            <Search size={18} color="#9CA3AF" />
                            <TextInput
                                placeholder="Cari bahan..."
                                className="flex-1 ml-2 text-gray-800"
                                value={ingSearch}
                                onChangeText={(t) => {
                                    setIngSearch(t);
                                    setIngPage(1); // Reset page on search
                                }}
                            />
                        </View>

                        {loading ? <ActivityIndicator color="#4f46e5" /> : (
                            <View>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-xs text-gray-400 font-medium">Bahan</Text>
                                    <Text className="text-xs text-gray-400 font-medium mr-12">Stok (kg/ltr/buah)</Text>
                                </View>
                                {ingredients.map(item => (
                                    <View key={item.id}>{renderIngredientRow({ item })}</View>
                                ))}
                                {ingredients.length === 0 && (
                                    <Text className="text-center text-gray-400 py-4">Tidak ada bahan ditemukan.</Text>
                                )}

                                {/* Ingredient Pagination */}
                                <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                    <Text className="text-xs text-gray-400">
                                        {(ingPage - 1) * 5 + 1}-{Math.min(ingPage * 5, ingTotal)} dari {ingTotal}
                                    </Text>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            disabled={ingPage === 1}
                                            onPress={() => setIngPage(Math.max(1, ingPage - 1))}
                                            className={`p-2 rounded-lg border ${ingPage === 1 ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <ChevronLeft size={16} color={ingPage === 1 ? "#D1D5DB" : "#374151"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            disabled={ingPage * 5 >= ingTotal}
                                            onPress={() => setIngPage(ingPage + 1)}
                                            className={`p-2 rounded-lg border ${ingPage * 5 >= ingTotal ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <ChevronRight size={16} color={ingPage * 5 >= ingTotal ? "#D1D5DB" : "#374151"} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* 4. Logs */}
                    <View className="bg-white rounded-2xl p-6 shadow-sm">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Log Riwayat Stok</Text>

                        {/* Search Logs */}
                        <View className="bg-gray-50 rounded-xl px-4 py-2 flex-row items-center border border-gray-100 mb-4">
                            <Search size={18} color="#9CA3AF" />
                            <TextInput
                                placeholder="Cari di riwayat..."
                                className="flex-1 ml-2 text-gray-800"
                                value={logsSearch}
                                onChangeText={(t) => {
                                    setLogsSearch(t);
                                    setLogsPage(1);
                                }}
                            />
                        </View>

                        {loading ? <ActivityIndicator color="#4f46e5" /> : (
                            <View>
                                {logs.map(item => (
                                    <View key={item.id}>{renderLog({ item })}</View>
                                ))}
                                {logs.length === 0 && <Text className="text-gray-400 text-center py-4">Belum ada riwayat</Text>}

                                {/* Logs Pagination */}
                                <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                    <Text className="text-xs text-gray-400">
                                        {(logsPage - 1) * 5 + 1}-{Math.min(logsPage * 5, logsTotal)} dari {logsTotal}
                                    </Text>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            disabled={logsPage === 1}
                                            onPress={() => setLogsPage(Math.max(1, logsPage - 1))}
                                            className={`p-2 rounded-lg border ${logsPage === 1 ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <ChevronLeft size={16} color={logsPage === 1 ? "#D1D5DB" : "#374151"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            disabled={logsPage * 5 >= logsTotal}
                                            onPress={() => setLogsPage(logsPage + 1)}
                                            className={`p-2 rounded-lg border ${logsPage * 5 >= logsTotal ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <ChevronRight size={16} color={logsPage * 5 >= logsTotal ? "#D1D5DB" : "#374151"} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Selection Modal (Multi-select) */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-white p-6">
                    <View className="flex-row justify-between items-center mb-2 mt-4">
                        <Text className="text-xl font-bold text-gray-900">Pilih Tampilan Summary</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-gray-400 text-sm mb-6">Pilih maksimal 4 bahan untuk ditampilkan di halaman utama.</Text>

                    <FlatList
                        data={ingredients}
                        keyExtractor={item => item.id}
                        className="mb-20"
                        contentContainerStyle={{ paddingBottom: 100 }}
                        renderItem={({ item }) => {
                            const isSelected = tempSelectedIds.includes(item.id);
                            return (
                                <TouchableOpacity
                                    onPress={() => toggleSelection(item.id)}
                                    className={`py-4 border-b border-gray-100 flex-row justify-between items-center px-2 ${isSelected ? 'bg-indigo-50 rounded-lg border-b-0 mb-1' : ''}`}
                                >
                                    <View>
                                        <Text className={`text-base font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>{item.name}</Text>
                                        <Text className="text-sm text-gray-500">{item.current_stock} {item.unit}</Text>
                                    </View>
                                    {isSelected && <Check size={20} color="#4f46e5" />}
                                </TouchableOpacity>
                            );
                        }}
                    />

                    <View className="absolute bottom-6 left-6 right-6">
                        <TouchableOpacity
                            onPress={saveSelection}
                            className="bg-indigo-600 p-4 rounded-xl items-center shadow-md"
                        >
                            <Text className="text-white font-bold text-base">Simpan Pilihan ({tempSelectedIds.length})</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <OwnerBottomNav />
        </View>
    );
}
