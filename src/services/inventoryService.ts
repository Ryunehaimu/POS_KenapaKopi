import { supabase } from "../lib/supabase";

export interface Ingredient {
  id: string;
  name: string;
  type: 'main' | 'support';
  unit: 'kg' | 'gr' | 'ltr' | 'ml' | 'pcs';
  current_stock: number;
  created_at?: string;
}

export interface StockLog {
  id: string;
  ingredient_id: string;
  change_amount: number;
  current_stock_snapshot: number;
  price: number;
  change_type: 'in' | 'out' | 'adjustment';
  notes?: string;
  created_at: string;
  ingredients?: Ingredient; // Joined
}


export interface OperationalExpense {
  id: string;
  name: string;
  amount: number; // usually 1? or quantity?
  price: number;
  notes?: string;
  created_at: string;
}

export type ExpenseType = 'ingredient' | 'operational';

export interface MergedExpense {
  id: string;
  type: ExpenseType;
  name: string;
  date: string;
  total: number;
  notes?: string;
}

export const inventoryService = {
  // ... existing methods ...

  async getIngredients() {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Ingredient[];
  },

  async getIngredientById(id: string) {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Ingredient;
  },

  async addIngredient(ingredient: Omit<Ingredient, 'id' | 'created_at' | 'current_stock'>) {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([{ ...ingredient, current_stock: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data as Ingredient;
  },

  async updateIngredient(id: string, updates: Partial<Ingredient>) {
    const { data, error } = await supabase
      .from('ingredients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Ingredient;
  },

  async addStock(id: string, amount: number, price: number) {
    // 1. Get current stock
    const ingredient = await this.getIngredientById(id);
    const newStock = (ingredient.current_stock || 0) + amount;

    // 2. Update ingredient
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ current_stock: newStock })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Log it
    const { error: logError } = await supabase
      .from('stock_logs')
      .insert([{
        ingredient_id: id,
        change_amount: amount,
        current_stock_snapshot: newStock,
        price: price,
        change_type: 'in'
      }]);

    if (logError) throw logError;

    return true;
  },

  async getLogs() {
    const { data, error } = await supabase
      .from('stock_logs')
      .select('*, ingredients(name, unit)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StockLog[];
  },

  async deleteIngredient(id: string) {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // --- Operational Expenses Methods ---

  async getOperationalExpenses() {
    // Assumption: 'operational_expenses' table exists. 
    // If NOT, we might need to handle it or ask user to create it.
    // For now we assume implementation plan was approved implying DB changes accepted/assumed.
    const { data, error } = await supabase
      .from('operational_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as OperationalExpense[];
  },

  async addOperationalExpense(name: string, price: number, notes?: string) {
    const { data, error } = await supabase
      .from('operational_expenses')
      .insert([{
        name,
        price,
        amount: 1, // Default 1 for now unless specified
        notes
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getOperationalExpenseById(id: string) {
    const { data, error } = await supabase
      .from('operational_expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as OperationalExpense;
  },

  async updateOperationalExpense(id: string, updates: Partial<OperationalExpense>) {
    const { data, error } = await supabase
      .from('operational_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Gagal update: Data tidak ditemukan atau izin ditolak.");
    return data as OperationalExpense;
  },

  async getStockLogById(id: string) {
    const { data, error } = await supabase
      .from('stock_logs')
      .select('*, ingredients(name, unit)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as StockLog;
  },

  async updateStockLog(id: string, updates: Partial<StockLog>) {
    // 1. Get original log to calculate difference
    const originalLog = await this.getStockLogById(id);

    // 2. If amount changed, update stock
    if (updates.change_amount !== undefined && updates.change_amount !== originalLog.change_amount) {
      // Calculate difference: New - Old
      // Example: Old was 10, New is 15. Diff is 5. We Add 5 to stock.
      // Example: Old was 10, New is 5. Diff is -5. We Subtract 5 from stock.
      const diff = updates.change_amount - originalLog.change_amount;

      // Fetch current ingredient stock
      const ingredient = await this.getIngredientById(originalLog.ingredient_id);
      const newStock = (ingredient.current_stock || 0) + diff;

      // Update ingredient stock
      const { error: stockError } = await supabase
        .from('ingredients')
        .update({ current_stock: newStock })
        .eq('id', originalLog.ingredient_id);

      if (stockError) throw stockError;
    }

    // 3. Update the log itself
    const { data, error } = await supabase
      .from('stock_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Gagal update stok log: Data tidak ditemukan atau izin ditolak.");
    return data as StockLog;
  },

  // Note: Delete for StockLogs is tricky because it affects stock. 
  // We might just allow deleting Operational for now or implement logical delete.

  async deleteOperationalExpense(id: string) {
    const { error } = await supabase
      .from('operational_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async deleteStockLog(id: string) {
    // 1. Get log to revert stock
    const log = await this.getStockLogById(id);

    // 2. Revert stock
    // Since this is an Expense (IN), we must SUBTRACT the amount from current stock to cancel it.
    if (log.change_type === 'in') {
      const ingredient = await this.getIngredientById(log.ingredient_id);
      const newStock = (ingredient.current_stock || 0) - log.change_amount;

      const { error: stockError } = await supabase
        .from('ingredients')
        .update({ current_stock: newStock })
        .eq('id', log.ingredient_id);

      if (stockError) throw stockError;
    }

    // 3. Delete log
    const { error } = await supabase
      .from('stock_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getAllExpenses(startDate?: Date, endDate?: Date): Promise<MergedExpense[]> {
    // 1. Get Stock Logs (IN)
    let logsQuery = supabase
      .from('stock_logs')
      .select('*, ingredients(name)')
      .eq('change_type', 'in');

    if (startDate) logsQuery = logsQuery.gte('created_at', startDate.toISOString());
    if (endDate) logsQuery = logsQuery.lte('created_at', endDate.toISOString());

    const { data: logs, error: logsError } = await logsQuery;
    if (logsError) throw logsError;

    // 2. Get Operational
    let opsQuery = supabase.from('operational_expenses').select('*');
    if (startDate) opsQuery = opsQuery.gte('created_at', startDate.toISOString());
    if (endDate) opsQuery = opsQuery.lte('created_at', endDate.toISOString());

    const { data: ops, error: opsError } = await opsQuery;

    // If ops table doesn't exist yet, it might error. Handle gracefully?
    // Let's assume strict success for now.
    if (opsError && opsError.code !== '42P01') throw opsError; // 42P01 is undefined_table
    const safeOps = ops || [];

    // 3. Merge
    const merged: MergedExpense[] = [];

    logs?.forEach((log: any) => {
      merged.push({
        id: log.id,
        type: 'ingredient',
        name: log.ingredients?.name || 'Unknown Component',
        date: log.created_at,
        total: log.price || 0, // CORRECTED: Price is already total, do not multiply by amount
        notes: log.notes
      });
    });

    safeOps.forEach((op: OperationalExpense) => {
      merged.push({
        id: op.id,
        type: 'operational',
        name: op.name,
        date: op.created_at,
        total: op.price, // Assuming price is total for operational items usually
        notes: op.notes
      });
    });

    // 4. Sort Descending
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};
