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
  }
};
