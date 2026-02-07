import { supabase } from "../lib/supabase";

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  note?: string; // Added note support
  product_name?: string; // Helper for UI
}

export interface Order {
  id?: string;
  order_number?: string;
  customer_name: string;
  note?: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'qris';
  created_at?: string;
  discount?: number; // Added discount field
  items?: OrderItem[];
}

export const orderService = {
  async createOrder(order: Order, items: OrderItem[]) {
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_name: order.customer_name,
        note: order.note,
        total_amount: order.total_amount,
        status: order.status,
        payment_method: order.payment_method,
        discount: order.discount || 0 // Insert discount
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
      subtotal: item.subtotal,
      note: item.note // Save item note
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

  async getRecentOrders(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 10,
    status?: string,
    paymentMethod?: string
  ) {
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    if (status && status !== 'All') {
      query = query.eq('status', status.toLowerCase());
    }

    if (paymentMethod && paymentMethod !== 'All') {
      const method = paymentMethod === 'QRIS' ? 'qris' : 'cash';
      query = query.eq('payment_method', method);
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
      // We log but don't throw, as the order itself was successful.
      // In a real app, this might trigger a manual review flag.
    }
  },

  async restoreOrderStock(orderId: string) {
    const { error } = await supabase
      .rpc('restore_order_stock', { p_order_id: orderId });

    if (error) {
      throw error;
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
      gojek_revenue: number;
      grab_revenue: number;
      shopee_revenue: number;
      menu_sales: {
        product_name: string;
        category: string;
        quantity_sold: number;
        total_revenue: number;
      }[];
    };
  },

  async getShiftReport(startTime: Date, endTime: Date) {
    // Format as ISO strings for timestamp parameters
    const formatTimestamp = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - offset);
      return localDate.toISOString().slice(0, 19).replace('T', ' ');
    };

    const { data, error } = await supabase
      .rpc('get_shift_sales_report', {
        start_time: formatTimestamp(startTime),
        end_time: formatTimestamp(endTime)
      });

    if (error) throw error;
    return data as {
      total_revenue: number;
      total_transactions: number;
      cash_revenue: number;
      qris_revenue: number;
      gojek_revenue: number;
      grab_revenue: number;
      shopee_revenue: number;
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
  },

  async updateOrder(
    orderId: string,
    updates: {
      customer_name?: string;
      note?: string;
      payment_method?: 'cash' | 'qris';
      status?: 'pending' | 'completed' | 'cancelled';
      total_amount?: number;
      discount?: number; // Added discount
    },
    newItems?: OrderItem[]
  ) {
    // 1. Update Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update({
        customer_name: updates.customer_name,
        note: updates.note,
        payment_method: updates.payment_method,
        status: updates.status,
        total_amount: updates.total_amount,
        discount: updates.discount // Update discount
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Update Items if provided (replace all)
    if (newItems && newItems.length > 0) {
      // Delete existing items
      await supabase.from('order_items').delete().eq('order_id', orderId);

      // Insert new items
      const itemsToInsert = newItems.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        note: item.note // Save item note
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return orderData;
  },

  async deleteOrder(orderId: string) {
    // order_items should cascade delete if FK is set up
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    return true;
  },

  async payOrder(orderId: string, paymentMethod: 'cash' | 'qris', totalAmount: number, discount?: number) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_method: paymentMethod,
        total_amount: totalAmount, // Confirm amount (e.g. if price changed or for record)
        discount: discount || 0, // Save discount
        created_at: new Date().toISOString() // Optional: Update timestamp to payment time? Or keep original? Let's keep original for now or maybe add `paid_at` column later. For now, just status update.
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
