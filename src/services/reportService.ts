import { supabase } from "../lib/supabase";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { Alert } from "react-native";

export type ReportType = 'ingredient_expense' | 'transaction_report' | 'best_selling_menu' | 'operational_expense' | 'net_revenue';

interface IngredientExpenseItem {
    name: string;
    unit: string;
    totalAmount: number;
    totalCost: number;
}

interface OperationalExpenseItem {
    name: string;
    totalCost: number;
    count: number;
}

interface BestSellingItem {
    name: string;
    category: string;
    qtySold: number;
    totalRevenue: number;
}

interface TransactionItem {
    date: string; // Formatting date string
    orderId: string;
    customerName: string; // or 'Walk-in'
    paymentMethod: string;
    totalAmount: number;
}

export const reportService = {

    getEffectivePeriod(type: 'monthly' | 'yearly', date: Date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        let start: Date, end: Date;

        if (type === 'monthly') {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0, 23, 59, 59);
        } else {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31, 23, 59, 59);
        }
        return { start, end };
    },

    async getIngredientExpenseReport(startDate: Date, endDate: Date): Promise<IngredientExpenseItem[]> {
        // Fetch all IN logs within period
        const { data, error } = await supabase
            .from('stock_logs')
            .select('*, ingredients(name, unit)')
            .eq('change_type', 'in')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) throw error;

        // Aggregate by Ingredient
        const map = new Map<string, IngredientExpenseItem>();

        data?.forEach(log => {
            const name = log.ingredients?.name || 'Unknown';
            const unit = log.ingredients?.unit || '-';
            const cost = log.price || 0; // Price is total per log
            const amount = log.change_amount || 0;

            if (!map.has(name)) {
                map.set(name, { name, unit, totalAmount: 0, totalCost: 0 });
            }
            const item = map.get(name)!;
            item.totalAmount += amount;
            item.totalCost += cost;
        });

        return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
    },

    async getOperationalExpenseReport(startDate: Date, endDate: Date): Promise<OperationalExpenseItem[]> {
        const { data, error } = await supabase
            .from('operational_expenses')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) throw error;

        const map = new Map<string, OperationalExpenseItem>();

        data?.forEach(op => {
            if (!map.has(op.name)) {
                map.set(op.name, { name: op.name, totalCost: 0, count: 0 });
            }
            const item = map.get(op.name)!;
            item.totalCost += (op.price || 0);
            item.count += 1;
        });

        return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
    },

    async getTransactionReport(startDate: Date, endDate: Date): Promise<TransactionItem[]> {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((order: any) => ({
            date: new Date(order.created_at).toLocaleString('id-ID'),
            orderId: `#${order.id.slice(0, 5).toUpperCase()}`,
            customerName: order.customer_name || 'Pelanggan',
            paymentMethod: order.payment_method || 'Tunai',
            totalAmount: order.total_amount || 0
        }));
    },

    async getBestSellingMenuReport(startDate: Date, endDate: Date): Promise<BestSellingItem[]> {
        // 1. Get Completed Orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id')
            .eq('status', 'completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (ordersError) throw ordersError;

        const orderIds = orders?.map(o => o.id) || [];
        if (orderIds.length === 0) return [];

        // 2. Get Order Items for these orders
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*, products(name, categories(name))')
            .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        // 3. Aggregate
        const map = new Map<string, BestSellingItem>();

        items?.forEach(item => {
            const name = (item.products as any)?.name || 'Unknown Product';
            const category = (item.products as any)?.categories?.name || 'Uncategorized';

            const qty = item.quantity || 0;
            const revenue = (item.price || 0) * qty;

            if (!map.has(name)) {
                map.set(name, { name, category, qtySold: 0, totalRevenue: 0 });
            }
            const entry = map.get(name)!;
            entry.qtySold += qty;
            entry.totalRevenue += revenue;
        });

        return Array.from(map.values()).sort((a, b) => b.qtySold - a.qtySold);
    },

    async getNetRevenueReport(startDate: Date, endDate: Date) {
        // 1. Get Total Revenue
        const transactions = await this.getTransactionReport(startDate, endDate);
        const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);

        // 2. Get Ingredient Expenses
        const ingExpenses = await this.getIngredientExpenseReport(startDate, endDate);
        const totalIngExpense = ingExpenses.reduce((sum, i) => sum + i.totalCost, 0);

        // 3. Get Operational Expenses
        const opExpenses = await this.getOperationalExpenseReport(startDate, endDate);
        const totalOpExpense = opExpenses.reduce((sum, o) => sum + o.totalCost, 0);

        // 4. Calculate Net
        const totalExpense = totalIngExpense + totalOpExpense;
        const netRevenue = totalRevenue - totalExpense;

        return [{
            title: 'Pendapatan Kotor',
            amount: totalRevenue,
            type: 'income'
        }, {
            title: 'Pengeluaran Bahan',
            amount: totalIngExpense,
            type: 'expense'
        }, {
            title: 'Pengeluaran Operasional',
            amount: totalOpExpense,
            type: 'expense'
        }, {
            title: 'Penghasilan Bersih',
            amount: netRevenue,
            type: 'net'
        }];
    },

    async generateExcel(fileName: string, data: any[]) {
        try {
            // 1. Create Worksheet from Data
            const ws = XLSX.utils.json_to_sheet(data);

            // 2. Create Workbook and append sheet
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan");

            // 3. Generate Base64 output
            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

            // 4. Save to filesystem (Using New API)
            const sanitizedName = fileName.replace(/[^a-zA-Z0-9]/g, '_');

            // Note: In newer expo-file-system, we construct a File object
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!permissions.granted) {
                return;
            }

            try {
                const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, sanitizedName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
                Alert.alert("Sukses", "File berhasil disimpan.");
            } catch (e) {
                console.error(e);
                Alert.alert("Error", "Gagal menyimpan file.");
            }

        } catch (error) {
            console.error("Excel Export Error:", error);
            Alert.alert("Error", "Gagal export Excel");
        }
    },

    async generatePDF(title: string, periodInfo: string, htmlContent: string) {
        try {
            const finalHtml = `
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                        h1 { text-align: center; color: #333; margin-bottom: 5px; }
                        h3 { text-align: center; color: #666; margin-top: 0; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; color: #333; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
                        .total-row { font-weight: bold; background-color: #e6e6e6; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .text-green { color: green; }
                        .text-red { color: red; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <h3>${periodInfo}</h3>
                    ${htmlContent}
                    <div class="footer">
                        Dicetak otomatis oleh Sistem POS KenapaKopi pada ${new Date().toLocaleString('id-ID')}
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: finalHtml });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("Info", "Penyimpanan PDF telah dibuat di: " + uri);
            }
        } catch (error) {
            console.error("PDF Generation Error:", error);
            Alert.alert("Error", "Gagal membuat PDF");
        }
    }
};
