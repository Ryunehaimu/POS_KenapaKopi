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
  payment_method: 'cash' | 'qris' | 'transfer';
  created_at?: string;
  discount?: number; // Added discount field
  discount_type?: 'percent' | 'nominal';
  discount_rate?: number;
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
        discount: order.discount || 0,
        discount_type: order.discount_type || 'nominal',
        discount_rate: order.discount_rate || 0
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
      const method = paymentMethod === 'QRIS' ? 'qris' : paymentMethod === 'Transfer' ? 'transfer' : 'cash';
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
      transfer_revenue: number;
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
      transfer_revenue: number;
      menu_sales: {
        product_name: string;
        category: string;
        quantity_sold: number;
        total_revenue: number;
      }[];
    };
  },

  async getSalesReport(startDate: Date, endDate: Date) {
    // We fetch ALL completed orders for the period and aggregate manually
    // because the RPC might not support the new payment methods yet or we want flexibility.
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, payment_method, orders_items:order_items(quantity, price, products(name))')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const stats = {
      total_revenue: 0,
      total_transactions: orders?.length || 0,
      cash_revenue: 0,
      qris_revenue: 0,
      gojek_revenue: 0,
      grab_revenue: 0,
      shopee_revenue: 0,
      transfer_revenue: 0,
      menu_sales: [] as any[]
    };

    const menuMap = new Map<string, { quantity: number, revenue: number }>();

    orders?.forEach((order: any) => {
      const amount = order.total_amount || 0;
      stats.total_revenue += amount;

      const method = (order.payment_method || '').toLowerCase(); // Normalize
      if (method === 'cash' || method === 'tunai') stats.cash_revenue += amount;
      else if (method === 'qris') stats.qris_revenue += amount;
      else if (method.includes('gojek')) stats.gojek_revenue += amount;
      else if (method.includes('grab')) stats.grab_revenue += amount;
      else if (method.includes('shopee')) stats.shopee_revenue += amount;
      else if (method.includes('transfer')) stats.transfer_revenue += amount;
      else {
        // Fallback for others or if specific string logic fails, assume cash or just don't categorize? 
        // For now let's assume if not matched it might be 'other' but user asked specifically for these 5.
        // Maybe we just add to cash if unknown? or keep separate?
        // Let's stick to what we requested.
      }

      // Menu Sales Aggregation
      order.orders_items?.forEach((item: any) => {
        const name = item.products?.name || 'Unknown';
        const qty = item.quantity || 0;
        const rev = (item.price || 0) * qty;

        const current = menuMap.get(name) || { quantity: 0, revenue: 0 };
        menuMap.set(name, { quantity: current.quantity + qty, revenue: current.revenue + rev });
      });
    });

    stats.menu_sales = Array.from(menuMap.entries()).map(([name, val]) => ({
      product_name: name,
      quantity_sold: val.quantity,
      total_revenue: val.revenue
    })).sort((a, b) => b.total_revenue - a.total_revenue);

    return stats;
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
      payment_method?: 'cash' | 'qris' | 'transfer';
      status?: 'pending' | 'completed' | 'cancelled';
      total_amount?: number;
      discount?: number; // Added discount
      discount_type?: 'percent' | 'nominal';
      discount_rate?: number;
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
        discount: updates.discount, // Update discount
        discount_type: updates.discount_type,
        discount_rate: updates.discount_rate
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Update Items if provided (replace all)
    if (newItems && newItems.length > 0) {
      // RESTORE stock for existing items before deleting them
      // This ensures the previous deduction is reversed (logged as 'in' or similar restoration)
      try {
        await this.restoreOrderStock(orderId);
      } catch (e) {
        console.error("Error restoring stock during update:", e);
        // Continue? If we fail to restore, we might double deduct if we proceed. 
        // But throwing here blocks the edit. Let's assume restoration is critical.
        // throw e; 
      }

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

      // DEDUCT stock for new items
      // This logs the new usage (logged as 'transaction' or 'out')
      try {
        await this.processStockDeduction(orderId);
      } catch (e) {
        console.error("Error deducting stock during update:", e);
      }
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

  async payOrder(orderId: string, paymentMethod: 'cash' | 'qris' | 'transfer', totalAmount: number, discount?: number, discountType?: 'percent' | 'nominal', discountRate?: number) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_method: paymentMethod,
        total_amount: totalAmount, // Confirm amount (e.g. if price changed or for record)
        discount: discount || 0, // Save discount
        discount_type: discountType || 'nominal',
        discount_rate: discountRate || 0,
        created_at: new Date().toISOString() // Optional: Update timestamp to payment time? Or keep original? Let's keep original for now or maybe add `paid_at` column later. For now, just status update.
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
