import { supabase } from "../lib/supabase";

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export const categoryService = {
  async getCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Category[];
  },

  async createCategory(name: string) {
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async updateCategory(id: string, name: string) {
    const { data, error } = await supabase
      .from("categories")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
    return true;
  },
};
