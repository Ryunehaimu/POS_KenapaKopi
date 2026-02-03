import { supabase } from "../lib/supabase";

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export const categoryService = {
  async getCategories(search?: string, page: number = 1, limit: number = 10) {
    let query = supabase
      .from("categories")
      .select("*", { count: 'exact' })
      .order("name", { ascending: true });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as Category[], count };
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
