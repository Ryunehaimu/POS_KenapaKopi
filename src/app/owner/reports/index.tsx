import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronDown, Download, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import OwnerBottomNav from '../../../components/OwnerBottomNav';
import { reportService, ReportType } from '../../../services/reportService';

const REPORT_TYPES: { label: string; value: ReportType }[] = [
    { label: 'Penghasilan Bersih', value: 'net_revenue' },
    { label: 'Laporan Transaksi', value: 'transaction_report' },
    { label: 'Menu Terlaris', value: 'best_selling_menu' },
    { label: 'Pengeluaran Bahan', value: 'ingredient_expense' },
    { label: 'Pengeluaran Operasional', value: 'operational_expense' }
];

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function ReportsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    // Filters
    const [selectedType, setSelectedType] = useState<ReportType>('net_revenue');

    // Range States
    const now = new Date();
    const [startMonth, setStartMonth] = useState(now.getMonth());
    const [startYear, setStartYear] = useState(now.getFullYear());
    const [endMonth, setEndMonth] = useState(now.getMonth());
    const [endYear, setEndYear] = useState(now.getFullYear());

    // UI State
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

    useEffect(() => {
        loadData();
    }, [selectedType, startMonth, startYear, endMonth, endYear]);

    const loadData = async () => {
        try {
            setLoading(true);
            setData([]);

            const startDate = new Date(startYear, startMonth, 1);
            const endDate = new Date(endYear, endMonth + 1, 0, 23, 59, 59);

            let result: any[] = [];
            if (selectedType === 'ingredient_expense') {
                result = await reportService.getIngredientExpenseReport(startDate, endDate);
            } else if (selectedType === 'best_selling_menu') {
                result = await reportService.getBestSellingMenuReport(startDate, endDate);
            } else if (selectedType === 'operational_expense') {
                result = await reportService.getOperationalExpenseReport(startDate, endDate);
            } else if (selectedType === 'transaction_report') {
                result = await reportService.getTransactionReport(startDate, endDate);
            } else if (selectedType === 'net_revenue') {
                result = await reportService.getNetRevenueReport(startDate, endDate);
            }
            setData(result);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal memuat data laporan");
        } finally {
            setLoading(false);
        }
    };

    // Memoized Totals and Labels
    const grandTotal = React.useMemo(() => {
        if (selectedType === 'net_revenue') return 0; // Net Revenue has its own calculation in the rows
        return data.reduce((acc, curr) => {
            const val = curr.totalCost ?? curr.totalRevenue ?? curr.totalAmount ?? 0;
            return acc + val;
        }, 0);
    }, [data, selectedType]);

    const typeLabel = React.useMemo(() => {
        return REPORT_TYPES.find(t => t.value === selectedType)?.label || '';
    }, [selectedType]);

    const periodLabel = React.useMemo(() => {
        const start = `${MONTHS[startMonth]} ${startYear}`;
        const end = `${MONTHS[endMonth]} ${endYear}`;
        return `${start} - ${end}`;
    }, [startMonth, startYear, endMonth, endYear]);

    const handleExport = async () => {
        try {
            setLoading(true);
            const startDate = new Date(startYear, startMonth, 1);
            const endDate = new Date(endYear, endMonth + 1, 0, 23, 59, 59);

            let html = '';

            // Build HTML Table based on Type
            if (selectedType === 'net_revenue') {
                html = `
                    <h3>Ringkasan Penghasilan Bersih</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Keterangan</th>
                                <th class="text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item: any) => `
                                <tr>
                                    <td>${item.title}</td>
                                    <td class="text-right ${item.type === 'net' ? 'total-row' : ''} ${item.type === 'expense' ? 'text-red' : (item.type === 'income' ? 'text-green' : '')}">
                                        Rp ${(item.amount || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else if (selectedType === 'ingredient_expense') {
                html = `
                    <table>
                        <thead>
                            <tr>
                                <th>Nama Bahan</th>
                                <th>Satuan</th>
                                <th class="text-right">Total Pakai/Beli</th>
                                <th class="text-right">Total Biaya</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item: any) => `
                                <tr>
                                    <td>${item.name || '-'}</td>
                                    <td>${item.unit || '-'}</td>
                                    <td class="text-right">${item.totalAmount || 0}</td>
                                    <td class="text-right">Rp ${(item.totalCost ?? 0).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="3" class="text-center">Total</td>
                                <td class="text-right">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else if (selectedType === 'best_selling_menu') {
                html = `
                    <table>
                        <thead>
                            <tr>
                                <th>Nama Menu</th>
                                <th>Kategori</th>
                                <th class="text-center">Terjual</th>
                                <th class="text-right">Pendapatan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item: any) => `
                                <tr>
                                    <td>${item.name || '-'}</td>
                                    <td>${item.category || '-'}</td>
                                    <td class="text-center">${item.qtySold || 0}</td>
                                    <td class="text-right">Rp ${(item.totalRevenue ?? 0).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="3" class="text-center">Total</td>
                                <td class="text-right">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else if (selectedType === 'operational_expense') {
                html = `
                    <table>
                        <thead>
                            <tr>
                                <th>Nama Pengeluaran</th>
                                <th class="text-center">Frekuensi</th>
                                <th class="text-right">Total Biaya</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item: any) => `
                                <tr>
                                    <td>${item.name || '-'}</td>
                                    <td class="text-center">${item.count || 0}x</td>
                                    <td class="text-right">Rp ${(item.totalCost ?? 0).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2" class="text-center">Total</td>
                                <td class="text-right">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else if (selectedType === 'transaction_report') {
                html = `
                    <table>
                        <thead>
                            <tr>
                                <th>Tgl</th>
                                <th>Order ID</th>
                                <th>Pelanggan</th>
                                <th>Metode</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item: any) => `
                                <tr>
                                    <td>${item.date || '-'}</td>
                                    <td>${item.orderId || '-'}</td>
                                    <td>${item.customerName || '-'}</td>
                                    <td>${item.paymentMethod || '-'}</td>
                                    <td class="text-right">Rp ${(item.totalAmount ?? 0).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="4" class="text-center">Total Pendapatan</td>
                                <td class="text-right">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            }

            await reportService.generatePDF(
                `Laporan ${typeLabel}`,
                `Periode: ${periodLabel}`,
                html
            );

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal export PDF");
        } finally {
            setLoading(false);
        }
    };

    const changeYear = (year: number) => {
        if (activePicker === 'start') {
            setStartYear(year);
        } else {
            setEndYear(year);
        }
        setShowYearPicker(false);
    };

    const changeMonth = (monthIndex: number) => {
        if (activePicker === 'start') {
            setStartMonth(monthIndex);
        } else {
            setEndMonth(monthIndex);
        }
        setShowMonthPicker(false);
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <LinearGradient
                colors={['#4c1d95', '#7c3aed']}
                className="pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative z-10"
            >
                <View className="flex-row items-center mb-4 gap-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 bg-white/20 rounded-full"
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-white">Laporan</Text>
                </View>
                <Text className="text-white text-sm font-medium opacity-90 mb-2">
                    Filter & Periode Laporan
                </Text>
            </LinearGradient>

            {/* Filters Card - Overlapping Header */}
            <View className="px-6 -mt-16 z-20">
                <View className="bg-white p-4 rounded-xl shadow-sm mb-4">
                    <View className="space-y-3">
                        {/* Report Type Selector */}
                        <TouchableOpacity
                            className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2"
                            onPress={() => setShowTypePicker(!showTypePicker)}
                        >
                            <Text className="font-medium text-gray-800">
                                {typeLabel}
                            </Text>
                            <ChevronDown size={20} color="#6b7280" />
                        </TouchableOpacity>

                        {showTypePicker && (
                            <View className="bg-white border border-gray-200 rounded-lg shadow-lg absolute top-[60px] left-0 right-0 z-50">
                                {REPORT_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type.value}
                                        onPress={() => {
                                            setSelectedType(type.value);
                                            setShowTypePicker(false);
                                        }}
                                        className="p-3 border-b border-gray-100 last:border-0"
                                    >
                                        <Text className={`text-sm ${selectedType === type.value ? 'text-indigo-600 font-bold' : 'text-gray-600'}`}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Period Selector Row */}
                        <View className="flex-row gap-3">
                            {/* Start Range */}
                            <TouchableOpacity
                                className="flex-1 bg-white border border-gray-200 p-2 rounded-lg"
                                onPress={() => {
                                    setActivePicker('start');
                                    setShowMonthPicker(true);
                                }}
                            >
                                <Text className="text-[10px] text-gray-400 font-bold uppercase mb-1">Dari</Text>
                                <View className="flex-row items-center gap-2">
                                    <Calendar size={14} color="#4f46e5" />
                                    <Text className="text-gray-700 font-medium text-xs">
                                        {MONTHS[startMonth].substring(0, 3)} {startYear}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* End Range */}
                            <TouchableOpacity
                                className="flex-1 bg-white border border-gray-200 p-2 rounded-lg"
                                onPress={() => {
                                    setActivePicker('end');
                                    setShowMonthPicker(true);
                                }}
                            >
                                <Text className="text-[10px] text-gray-400 font-bold uppercase mb-1">Sampai</Text>
                                <View className="flex-row items-center gap-2">
                                    <Calendar size={14} color="#4f46e5" />
                                    <Text className="text-gray-700 font-medium text-xs">
                                        {MONTHS[endMonth].substring(0, 3)} {endYear}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Content / Preview List */}
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator size="large" color="#4F46E5" className="mt-10" />
                ) : (
                    <View className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                        {/* Header Row */}
                        <View className="bg-gray-50 flex-row p-3 border-b border-gray-100">
                            {selectedType === 'transaction_report' ? (
                                <>
                                    <Text className="flex-1 font-bold text-gray-500 text-xs text-left">Tgl</Text>
                                    <Text className="flex-1 font-bold text-gray-500 text-xs text-left">ID</Text>
                                    <Text className="flex-[1.5] font-bold text-gray-500 text-xs text-left">Pelanggan</Text>
                                    <Text className="flex-[1.5] font-bold text-gray-500 text-xs text-right">Total</Text>
                                </>
                            ) : selectedType === 'net_revenue' ? (
                                <>
                                    <Text className="flex-[3] font-bold text-gray-500 text-xs text-left">Keterangan</Text>
                                    <Text className="flex-[2] font-bold text-gray-500 text-xs text-right">Jumlah</Text>
                                </>
                            ) : (
                                <>
                                    <Text className="flex-[2] font-bold text-gray-500 text-xs text-left">
                                        {selectedType === 'best_selling_menu' ? 'Nama Menu' : 'Nama Item'}
                                    </Text>
                                    {selectedType === 'ingredient_expense' && (
                                        <Text className="flex-1 font-bold text-gray-500 text-xs text-left">Unit</Text>
                                    )}
                                    <Text className="flex-1 font-bold text-gray-500 text-xs text-center">
                                        {selectedType === 'ingredient_expense' ? 'Qty' : (selectedType === 'best_selling_menu' ? 'Terjual' : 'Freq')}
                                    </Text>
                                    <Text className="flex-[1.5] font-bold text-gray-500 text-xs text-right">Total</Text>
                                </>
                            )}
                        </View>

                        {data.length === 0 ? (
                            <View className="p-8 items-center">
                                <Text className="text-gray-400 italic">Tidak ada data untuk periode ini</Text>
                            </View>
                        ) : (
                            data.map((item, idx) => (
                                <View key={idx} className={`flex-row p-3 border-b border-gray-50 items-center ${item.type === 'net' ? 'bg-indigo-50 border-t border-indigo-100' : ''}`}>
                                    {selectedType === 'transaction_report' ? (
                                        <TouchableOpacity
                                            className="flex-row items-center flex-1"
                                            onPress={() => router.push(`/owner/reports/transaction/${item.id}`)}
                                        >
                                            <Text className="flex-1 text-gray-600 text-[10px]">{(item.date || '').split(',')[0]}</Text>
                                            <Text className="flex-1 text-gray-800 font-medium text-xs">{item.orderId || '-'}</Text>
                                            <Text className="flex-[1.5] text-gray-600 text-[10px]" numberOfLines={1}>{item.customerName || 'Pelanggan'}</Text>
                                            <Text className="flex-[1.5] text-indigo-600 font-bold text-xs text-right">
                                                Rp {(item.totalAmount ?? 0).toLocaleString('id-ID')}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : selectedType === 'net_revenue' ? (
                                        <>
                                            <Text className={`flex-[3] text-sm ${item.type === 'net' ? 'font-bold text-indigo-900' : 'text-gray-700'}`}>
                                                {item.title}
                                            </Text>
                                            <Text className={`flex-[2] text-right text-sm font-bold ${item.type === 'income' ? 'text-green-600' :
                                                item.type === 'expense' ? 'text-red-500' :
                                                    'text-indigo-700'
                                                }`}>
                                                {item.type === 'expense' ? '- ' : ''}Rp {(item.amount || 0).toLocaleString('id-ID')}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <View className="flex-[2]">
                                                <Text className="text-gray-800 font-medium text-sm">{item.name || '-'}</Text>
                                                {selectedType === 'best_selling_menu' && <Text className="text-[10px] text-gray-400">{item.category}</Text>}
                                            </View>

                                            {selectedType === 'ingredient_expense' && (
                                                <Text className="flex-1 text-gray-600 text-xs">{item.unit || '-'}</Text>
                                            )}

                                            <Text className="flex-1 text-gray-600 text-xs text-center">
                                                {selectedType === 'ingredient_expense' ? (item.totalAmount ?? 0)
                                                    : (selectedType === 'best_selling_menu' ? (item.qtySold ?? 0)
                                                        : `${item.count ?? 0}x`)}
                                            </Text>

                                            <Text className="flex-[1.5] text-indigo-600 font-bold text-xs text-right">
                                                Rp {(item.totalCost ?? item.totalRevenue ?? 0).toLocaleString('id-ID')}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            ))
                        )}

                        {/* Footer Totals */}
                        {data.length > 0 && selectedType !== 'net_revenue' && (
                            <View className="bg-indigo-50 p-3 flex-row justify-between items-center border-t border-indigo-100">
                                <Text className="font-bold text-indigo-900">Total</Text>
                                <Text className="font-bold text-indigo-900 text-base">
                                    Rp {grandTotal.toLocaleString('id-ID')}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Floating Export Button */}
            {!loading && data.length > 0 && (
                <View className="absolute bottom-24 right-6 left-6 flex-row gap-4">
                    <TouchableOpacity
                        onPress={async () => {
                            try {
                                setLoading(true);
                                const fileName = `${typeLabel}_${periodLabel}`;
                                await reportService.generateExcel(fileName, data);
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setLoading(false);
                            }
                        }}
                        className="flex-1 bg-green-600 p-4 rounded-xl shadow-lg flex-row justify-center items-center gap-2"
                    >
                        <Download color="white" size={20} />
                        <Text className="text-white font-bold text-base">Excel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleExport}
                        className="flex-1 bg-red-600 p-4 rounded-xl shadow-lg flex-row justify-center items-center gap-2"
                    >
                        <Download color="white" size={20} />
                        <Text className="text-white font-bold text-base">PDF</Text>
                    </TouchableOpacity>
                </View>
            )}

            <OwnerBottomNav />

            {/* Modals for Date Picking (Simplified) */}
            <Modal visible={showMonthPicker} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white w-full rounded-2xl p-4 max-h-[80%]">
                        <Text className="text-lg font-bold text-center mb-4">Pilih Bulan</Text>
                        <FlatList
                            data={MONTHS}
                            keyExtractor={(item) => item}
                            numColumns={3}
                            renderItem={({ item, index }) => {
                                const isSelected = activePicker === 'start' ? startMonth === index : endMonth === index;
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            changeMonth(index);
                                            setShowMonthPicker(false);
                                            setShowYearPicker(true);
                                        }}
                                        className={`flex-1 m-1 p-3 rounded-xl items-center ${isSelected ? 'bg-indigo-100' : 'bg-gray-50'}`}
                                    >
                                        <Text className={isSelected ? 'text-indigo-700 font-bold' : 'text-gray-600'}>
                                            {item.substring(0, 3)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                        <TouchableOpacity onPress={() => setShowMonthPicker(false)} className="mt-4 p-3 bg-gray-200 rounded-xl items-center">
                            <Text>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showYearPicker} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white w-full rounded-2xl p-4">
                        <Text className="text-lg font-bold text-center mb-4">Pilih Tahun</Text>
                        <ScrollView className="max-h-60">
                            {[2024, 2025, 2026, 2027, 2028].map(year => {
                                const isSelected = activePicker === 'start' ? startYear === year : endYear === year;
                                return (
                                    <TouchableOpacity
                                        key={year}
                                        onPress={() => changeYear(year)}
                                        className={`p-4 border-b border-gray-100 items-center ${isSelected ? 'bg-indigo-50' : ''}`}
                                    >
                                        <Text className={isSelected ? 'font-bold text-indigo-600' : 'text-gray-700'}>
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setShowYearPicker(false)} className="mt-4 p-3 bg-gray-200 rounded-xl items-center">
                            <Text>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}
