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

export const inventoryService = {
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
      .insert([{ ...ingredient, current_stock: 0 }]) // Start with 0
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

  async getLogs(filter?: { type?: string, startDate?: Date, endDate?: Date }) {
    let query = supabase
      .from('stock_logs')
      .select('*, ingredients(name, unit)')
      .order('created_at', { ascending: false });

    if (filter?.type && filter.type !== 'all') {
      query = query.eq('change_type', filter.type);
    }

    if (filter?.startDate) {
      query = query.gte('created_at', filter.startDate.toISOString());
    }

    if (filter?.endDate) {
      // Add one day to end date to include the full day
      const nextDay = new Date(filter.endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt('created_at', nextDay.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as StockLog[];
  },

  async getLowStockIngredients(threshold: number = 5) {
      const { data, error } = await supabase
          .from('ingredients')
          .select('*')
          .lt('current_stock', threshold)
          .order('current_stock', { ascending: true });
      
      if (error) throw error;
      return data as Ingredient[];
  },

  async getMonthlyIngredientUsage(date: Date) {
      // Keep legacy support or refactor? Let's just wrap the new one for now if needed, 
      // but UI will switch to new one.
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return this.getIngredientUsage(startOfMonth, endOfMonth);
  },

  async getIngredientUsage(startDate: Date, endDate: Date) {
      const formatDate = (date: Date) => {
          const offset = date.getTimezoneOffset() * 60000;
          const localDate = new Date(date.getTime() - offset);
          return localDate.toISOString().split('T')[0];
      };

      const { data, error } = await supabase
          .rpc('get_ingredient_usage', { 
              start_date: formatDate(startDate),
              end_date: formatDate(endDate)
          });

      if (error) throw error;
      return data as {
          ingredient_name: string;
          unit: string;
          total_used: number;
      }[];
  },

  async getIngredientExpenseReport(startDate: Date, endDate: Date) {
      const formatDate = (date: Date) => {
          const offset = date.getTimezoneOffset() * 60000;
          const localDate = new Date(date.getTime() - offset);
          return localDate.toISOString().split('T')[0];
      };

      const { data, error } = await supabase
          .rpc('get_ingredient_expense_report', { 
              start_date: formatDate(startDate),
              end_date: formatDate(endDate)
          });

      if (error) throw error;
      return data as {
          ingredient_name: string;
          unit: string;
          purchase_count: number;
          total_qty_purchased: number;
          total_expenditure: number;
      }[];
  },

  async deleteIngredient(id: string) {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
