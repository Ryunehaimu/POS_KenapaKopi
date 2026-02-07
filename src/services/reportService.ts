import { supabase } from "../lib/supabase";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { Alert } from "react-native";

export type ReportType = 'ingredient_expense' | 'transaction_report' | 'best_selling_menu' | 'operational_expense' | 'net_revenue' | 'stock_usage' | 'current_stock';

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    totalPages: number;
    currentPage: number;
}

interface StockUsageItem {
    name: string;
    unit: string;
    totalUsed: number;
}

interface CurrentStockItem {
    name: string;
    unit: string;
    currentStock: number;
    status: 'Safe' | 'Low' | 'Empty';
}

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

    async getIngredientExpenseReport(startDate: Date, endDate: Date, page: number = 1, limit: number = 10): Promise<PaginatedResult<IngredientExpenseItem>> {
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

        const allItems = Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);

        // Manual Pagination for Aggregated Data
        const total = allItems.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedData = allItems.slice((page - 1) * limit, page * limit);

        return {
            data: paginatedData,
            total,
            totalPages,
            currentPage: page
        };
    },

    async getOperationalExpenseReport(startDate: Date, endDate: Date, page: number = 1, limit: number = 10): Promise<PaginatedResult<OperationalExpenseItem>> {
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

        const allItems = Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedData = allItems.slice((page - 1) * limit, page * limit);

        return {
            data: paginatedData,
            total,
            totalPages,
            currentPage: page
        };
    },

    async getTransactionReport(startDate: Date, endDate: Date, page: number = 1, limit: number = 10): Promise<PaginatedResult<TransactionItem>> {
        // DB Side Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('status', 'completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const formattedData = (data || []).map((order: any) => ({
            date: new Date(order.created_at).toLocaleString('id-ID'),
            orderId: `#${order.id.slice(0, 5).toUpperCase()}`,
            customerName: order.customer_name || 'Pelanggan',
            paymentMethod: order.payment_method || 'Tunai',
            totalAmount: order.total_amount || 0
        }));

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
            data: formattedData,
            total,
            totalPages,
            currentPage: page
        };
    },

    async getBestSellingMenuReport(startDate: Date, endDate: Date, page: number = 1, limit: number = 10): Promise<PaginatedResult<BestSellingItem>> {
        // 1. Get Completed Orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id')
            .eq('status', 'completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (ordersError) throw ordersError;

        const orderIds = orders?.map(o => o.id) || [];
        if (orderIds.length === 0) return { data: [], total: 0, totalPages: 0, currentPage: 1 };

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

        const allItems = Array.from(map.values()).sort((a, b) => b.qtySold - a.qtySold);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedData = allItems.slice((page - 1) * limit, page * limit);

        return {
            data: paginatedData,
            total,
            totalPages,
            currentPage: page
        };
    },

    async getNetRevenueReport(startDate: Date, endDate: Date) {
        // Net Revenue is always summary, 1 page
        // ... (keep logic but maybe wrap return if needed, or leave since it's special)

        // ... existing logic ...
        // 1. Get Total Revenue
        // NOTE: We need full data for aggregation, so we call internal/DB directly or pass high limit?
        // Let's just do the aggregation calls similar to before.

        // 1. Get Total Revenue
        const { data: orders } = await supabase.from('orders').select('total_amount').eq('status', 'completed').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        // 2. Ingredient Expenses
        const { data: stockLogs } = await supabase.from('stock_logs').select('price').eq('change_type', 'in').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        const totalIngExpense = stockLogs?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;

        // 3. Op Expenses
        const { data: opExpenses } = await supabase.from('operational_expenses').select('price').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        const totalOpExpense = opExpenses?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;

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

    async getStockUsageReport(startDate: Date, endDate: Date, page: number = 1, limit: number = 10): Promise<PaginatedResult<StockUsageItem>> {
        const { data, error } = await supabase
            .from('stock_logs')
            .select('change_amount, change_type, ingredients(name, unit)')
            .in('change_type', ['out', 'transaction', 'adjustment']) // Include transaction, manual out, and adjustments
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) throw error;

        const map = new Map<string, StockUsageItem>();

        data?.forEach((log: any) => {
            const name = log.ingredients?.name || 'Unknown';
            const unit = log.ingredients?.unit || '-';
            const amount = log.change_amount || 0;

            if (!map.has(name)) {
                map.set(name, { name, unit, totalUsed: 0 });
            }
            const item = map.get(name)!;
            // Usage implies reduction, so we subtract the change amount.
            // e.g. -50 (Usage) becomes +50 Used.
            // e.g. +10 (Adjustment Gain) becomes -10 Used.
            item.totalUsed -= amount;
        });

        const allItems = Array.from(map.values()).sort((a, b) => b.totalUsed - a.totalUsed);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedData = allItems.slice((page - 1) * limit, page * limit);

        return {
            data: paginatedData,
            total,
            totalPages,
            currentPage: page
        };
    },

    async getCurrentStockReport(page: number = 1, limit: number = 10): Promise<PaginatedResult<CurrentStockItem>> {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('ingredients')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true })
            .range(from, to);

        if (error) throw error;

        const formattedData = (data || []).map((item: any) => {
            let status: 'Safe' | 'Low' | 'Empty' = 'Safe';
            if (item.current_stock <= 0) status = 'Empty';
            else if (item.current_stock < 5) status = 'Low'; // Threshold could be dynamic

            return {
                name: item.name,
                unit: item.unit,
                currentStock: item.current_stock,
                status
            };
        });

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
            data: formattedData,
            total,
            totalPages,
            currentPage: page
        };
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

            // 4. Save and Share (Cross-platform)
            const sanitizedName = fileName.replace(/[^a-zA-Z0-9]/g, '_') + '.xlsx';

            // Use legacy cast or import to ensure we can write
            const fileUri = (FileSystem.documentDirectory || (FileSystem as any).cacheDirectory) + sanitizedName;

            await FileSystem.writeAsStringAsync(fileUri, wbout, {
                encoding: FileSystem.EncodingType.Base64
            });

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Export Report Excel',
                UTI: 'com.microsoft.excel.xlsx' // for iOS
            });

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
