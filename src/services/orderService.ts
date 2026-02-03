import { supabase } from "../lib/supabase";

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product_name?: string; // Helper for UI
}

export interface Order {
  id?: string;
  order_number?: string;
  customer_name: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'qris';
  created_at?: string;
  items?: OrderItem[];
}

export const orderService = {
  async createOrder(order: Order, items: OrderItem[]) {
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        status: order.status,
        payment_method: order.payment_method
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert Items
    const itemsToInsert = items.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Ideally rollback order here, but for now just throw
      console.error("Error creating order items:", itemsError);
      throw itemsError;
    }

    return orderData;
  },

  async getRecentOrders(startDate?: Date, endDate?: Date, page: number = 1, limit: number = 10) {
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as Order[], count };
  },




  async getOrderDetails(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
            *,
            order_items (
                *,
                products (name)
            )
        `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  },

  async processStockDeduction(orderId: string) {
    const { error } = await supabase
      .rpc('process_order_stock_deduction', { p_order_id: orderId });

    if (error) {
      console.error("Stock Deduction Error:", error);
      // We log but don't throw, as the order itself was successful.
      // In a real app, this might trigger a manual review flag.
    }
  },

  async getDailyReport(date: Date) {
    // Create local date string YYYY-MM-DD
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    const dateStr = localDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .rpc('get_daily_sales_report', { report_date: dateStr });

    if (error) throw error;
    return data as {
      total_revenue: number;
      total_transactions: number;
      cash_revenue: number;
      qris_revenue: number;
      menu_sales: {
        product_name: string;
        category: string;
        quantity_sold: number;
        total_revenue: number;
      }[];
    };
  },

  async getSalesReport(startDate: Date, endDate: Date) {
    // Helper to format YYYY-MM-DD local time
    const formatDate = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - offset);
      return localDate.toISOString().split('T')[0];
    };

    const { data, error } = await supabase.rpc('get_sales_report', {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate)
    });

    if (error) throw error;
    return data as {
      total_revenue: number;
      total_transactions: number;
      cash_revenue: number;
      qris_revenue: number;
      menu_sales: {
        product_name: string;
        quantity_sold: number;
        total_revenue: number;
      }[];
    };
  },
  async getProductRankings(startDate: Date, endDate: Date) {
    const formatDate = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - offset);
      return localDate.toISOString().split('T')[0];
    };

    const { data, error } = await supabase
      .rpc('get_product_sales_ranking', {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
      });

    if (error) throw error;
    return data as {
      product_name: string;
      category: string;
      quantity_sold: number;
      total_revenue: number;
    }[];
  }
};
