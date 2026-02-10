import { supabase } from "../lib/supabase";

export interface Ingredient {
  id: string;
  name: string;
  type: "main" | "support";
  unit: "kg" | "gr" | "ltr" | "ml" | "pcs";
  current_stock: number;
  created_at?: string;
}

export interface StockLog {
  id: string;
  ingredient_id: string;
  change_amount: number;
  current_stock_snapshot: number;
  price: number | null;
  change_type: "in" | "out" | "adjustment";
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

export type ExpenseType = "ingredient" | "operational";

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

  async getIngredients(search?: string, page: number = 1, limit: number = 10) {
    let query = supabase
      .from("ingredients")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as Ingredient[], count };
  },

  async getIngredientById(id: string) {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Ingredient;
  },

  async addIngredient(
    ingredient: Omit<Ingredient, "id" | "created_at" | "current_stock">,
  ) {
    const { data, error } = await supabase
      .from("ingredients")
      .insert([{ ...ingredient, current_stock: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data as Ingredient;
  },

  async updateIngredient(id: string, updates: Partial<Ingredient>) {
    const { data, error } = await supabase
      .from("ingredients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Ingredient;
  },

  async addStock(id: string, amount: number, price: number | null) {
    // Force price to 0 if null, satisfying user request "jadikan 0 aja"
    const finalPrice = price === null ? 0 : price;

    // 1. Get current stock
    const ingredient = await this.getIngredientById(id);
    const stockBefore = ingredient.current_stock || 0;
    const newStock = stockBefore + amount;

    // 2. Update ingredient
    const { error: updateError } = await supabase
      .from("ingredients")
      .update({ current_stock: newStock })
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Generate notes
    const priceText = `Rp ${finalPrice.toLocaleString("id-ID")}`;
    const notes = `${ingredient.name}: ${stockBefore} + ${amount} = ${newStock} ${ingredient.unit}. Harga: ${priceText}`;

    // 4. Log it
    const { error: logError } = await supabase.from("stock_logs").insert([
      {
        ingredient_id: id,
        change_amount: amount,
        current_stock_snapshot: newStock,
        price: finalPrice,
        change_type: "in",
        notes: notes,
      },
    ]);

    if (logError) throw logError;

    return true;
  },

  async adjustStock(id: string, newCurrentStock: number, notes?: string) {
    // 1. Get current stock to calculate difference
    const ingredient = await this.getIngredientById(id);
    const stockBefore = ingredient.current_stock || 0;
    const diff = newCurrentStock - stockBefore;

    if (diff === 0) return true; // No change

    // 2. Update ingredient
    const { error: updateError } = await supabase
      .from("ingredients")
      .update({ current_stock: newCurrentStock })
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Log it
    const { error: logError } = await supabase.from("stock_logs").insert([
      {
        ingredient_id: id,
        change_amount: diff,
        current_stock_snapshot: newCurrentStock,
        price: 0, // No price for adjustment
        change_type: "adjustment",
        notes:
          notes || `Manual Adjustment: ${stockBefore} -> ${newCurrentStock}`,
      },
    ]);

    if (logError) throw logError;

    return true;
  },

  async getLogs(
    filter?: { type?: string; startDate?: Date; endDate?: Date },
    search?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Start with a query on stock_logs
    // We select *, and join ingredients.
    // Use !inner if we are searching by ingredient name, so we only get logs that match the ingredient name.
    const selectString = search
      ? "*, ingredients!inner(name, unit)"
      : "*, ingredients(name, unit)";

    let query = supabase
      .from("stock_logs")
      .select(selectString, { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      // Filter by ingredient name via the joined relationship
      query = query.ilike("ingredients.name", `%${search}%`);
    }

    if (filter?.type && filter.type !== "all") {
      query = query.eq("change_type", filter.type);
    }

    if (filter?.startDate) {
      query = query.gte("created_at", filter.startDate.toISOString());
    }

    if (filter?.endDate) {
      // Add one day to end date to include the full day
      const nextDay = new Date(filter.endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt("created_at", nextDay.toISOString());
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as StockLog[], count };
  },

  async getLowStockIngredients(threshold: number = 5) {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .lt("current_stock", threshold)
      .order("current_stock", { ascending: true });

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
      return localDate.toISOString().split("T")[0];
    };

    const { data, error } = await supabase.rpc("get_ingredient_usage", {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
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
      return localDate.toISOString().split("T")[0];
    };

    const { data, error } = await supabase.rpc(
      "get_ingredient_expense_report",
      {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      },
    );

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
    const { error } = await supabase.from("ingredients").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  // --- Operational Expenses Methods ---

  async getOperationalExpenses() {
    // Assumption: 'operational_expenses' table exists.
    // If NOT, we might need to handle it or ask user to create it.
    // For now we assume implementation plan was approved implying DB changes accepted/assumed.
    const { data, error } = await supabase
      .from("operational_expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as OperationalExpense[];
  },

  async addOperationalExpense(name: string, price: number, notes?: string) {
    const { data, error } = await supabase
      .from("operational_expenses")
      .insert([
        {
          name,
          price,
          amount: 1, // Default 1 for now unless specified
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getOperationalExpenseById(id: string) {
    const { data, error } = await supabase
      .from("operational_expenses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as OperationalExpense;
  },

  async updateOperationalExpense(
    id: string,
    updates: Partial<OperationalExpense>,
  ) {
    const { data, error } = await supabase
      .from("operational_expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data)
      throw new Error("Gagal update: Data tidak ditemukan atau izin ditolak.");
    return data as OperationalExpense;
  },

  async getStockLogById(id: string) {
    const { data, error } = await supabase
      .from("stock_logs")
      .select("*, ingredients(name, unit)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as StockLog;
  },

  async updateStockLog(id: string, updates: Partial<StockLog>) {
    // 1. Get original log to calculate difference
    const originalLog = await this.getStockLogById(id);

    // 2. If amount changed, update stock
    if (
      updates.change_amount !== undefined &&
      updates.change_amount !== originalLog.change_amount
    ) {
      // Calculate difference: New - Old
      // Example: Old was 10, New is 15. Diff is 5. We Add 5 to stock.
      // Example: Old was 10, New is 5. Diff is -5. We Subtract 5 from stock.
      const diff = updates.change_amount - originalLog.change_amount;

      // Fetch current ingredient stock
      const ingredient = await this.getIngredientById(
        originalLog.ingredient_id,
      );
      const newStock = (ingredient.current_stock || 0) + diff;

      // Update ingredient stock
      const { error: stockError } = await supabase
        .from("ingredients")
        .update({ current_stock: newStock })
        .eq("id", originalLog.ingredient_id);

      if (stockError) throw stockError;
    }

    // 3. Update the log itself
    const { data, error } = await supabase
      .from("stock_logs")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data)
      throw new Error(
        "Gagal update stok log: Data tidak ditemukan atau izin ditolak.",
      );
    return data as StockLog;
  },

  // Note: Delete for StockLogs is tricky because it affects stock.
  // We might just allow deleting Operational for now or implement logical delete.

  async deleteOperationalExpense(id: string) {
    const { error } = await supabase
      .from("operational_expenses")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async deleteStockLog(id: string) {
    // 1. Get log to revert stock
    const log = await this.getStockLogById(id);

    // 2. Revert stock
    // Since this is an Expense (IN), we must SUBTRACT the amount from current stock to cancel it.
    if (log.change_type === "in") {
      const ingredient = await this.getIngredientById(log.ingredient_id);
      const newStock = (ingredient.current_stock || 0) - log.change_amount;

      const { error: stockError } = await supabase
        .from("ingredients")
        .update({ current_stock: newStock })
        .eq("id", log.ingredient_id);

      if (stockError) throw stockError;
    }

    // 3. Delete log
    const { error } = await supabase.from("stock_logs").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  async getAllExpenses(
    startDate?: Date,
    endDate?: Date,
    search?: string,
  ): Promise<MergedExpense[]> {
    // 1. Get Stock Logs (IN)
    // Use !inner join if searching to filter by ingredient name
    const logSelect = search
      ? "*, ingredients!inner(name)"
      : "*, ingredients(name)";

    let logsQuery = supabase
      .from("stock_logs")
      .select(logSelect)
      .eq("change_type", "in");

    if (startDate)
      logsQuery = logsQuery.gte("created_at", startDate.toISOString());
    if (endDate) logsQuery = logsQuery.lte("created_at", endDate.toISOString());
    if (search) logsQuery = logsQuery.ilike("ingredients.name", `%${search}%`);

    const { data: logs, error: logsError } = await logsQuery;
    if (logsError) throw logsError;

    // 2. Get Operational
    let opsQuery = supabase.from("operational_expenses").select("*");
    if (startDate)
      opsQuery = opsQuery.gte("created_at", startDate.toISOString());
    if (endDate) opsQuery = opsQuery.lte("created_at", endDate.toISOString());
    if (search) opsQuery = opsQuery.ilike("name", `%${search}%`);

    const { data: ops, error: opsError } = await opsQuery;

    // If ops table doesn't exist yet, it might error. Handle gracefully?
    // Let's assume strict success for now.
    if (opsError && opsError.code !== "42P01") throw opsError; // 42P01 is undefined_table
    const safeOps = ops || [];

    // 3. Merge
    const merged: MergedExpense[] = [];

    logs?.forEach((log: any) => {
      merged.push({
        id: log.id,
        type: "ingredient",
        name: log.ingredients?.name || "Unknown Component",
        date: log.created_at,
        total: log.price || 0, // CORRECTED: Price is already total, do not multiply by amount
        notes: log.notes,
      });
    });

    safeOps.forEach((op: OperationalExpense) => {
      merged.push({
        id: op.id,
        type: "operational",
        name: op.name,
        date: op.created_at,
        total: op.price, // Assuming price is total for operational items usually
        notes: op.notes,
      });
    });

    // 4. Sort Descending
    return merged.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  },
};
