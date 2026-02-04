-- Function to process stock deduction for a completed order
create or replace function process_order_stock_deduction(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    v_item record;
    v_ingredient record;
    v_deduction_amount float;
begin
    -- Loop through each item in the order
    for v_item in 
        select product_id, quantity 
        from order_items 
        where order_id = p_order_id
    loop
        -- Loop through ingredients for this product (Recipe)
        for v_ingredient in
            select ingredient_id, quantity
            from product_ingredients
            where product_id = v_item.product_id
        loop
            -- Calculate total amount to deduct (Order Qty * Recipe Qty)
            v_deduction_amount := v_item.quantity * v_ingredient.quantity;

            -- 1. Deduct from ingredients table
            update ingredients
            set current_stock = current_stock - v_deduction_amount
            where id = v_ingredient.ingredient_id;

            -- 2. Log changes to stock_logs
            insert into stock_logs (
                ingredient_id,
                change_amount,
                current_stock_snapshot,
                change_type,
                notes
            )
            select 
                id, 
                -v_deduction_amount, 
                current_stock, 
                'transaction', 
                'Order Deduction: ' || p_order_id
            from ingredients
            where id = v_ingredient.ingredient_id;
            
        end loop;
    end loop;
end;
$$;

-- Function to RESTORE stock when order is cancelled (Reverse of deduction)
create or replace function restore_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    v_item record;
    v_ingredient record;
    v_restore_amount float;
begin
    -- Loop through each item in the order
    for v_item in 
        select product_id, quantity 
        from order_items 
        where order_id = p_order_id
    loop
        -- Loop through ingredients for this product (Recipe)
        for v_ingredient in
            select ingredient_id, quantity
            from product_ingredients
            where product_id = v_item.product_id
        loop
            -- Calculate total amount to restore (Order Qty * Recipe Qty)
            v_restore_amount := v_item.quantity * v_ingredient.quantity;

            -- 1. Add back to ingredients table
            update ingredients
            set current_stock = current_stock + v_restore_amount
            where id = v_ingredient.ingredient_id;

            -- 2. Log changes to stock_logs
            insert into stock_logs (
                ingredient_id,
                change_amount,
                current_stock_snapshot,
                change_type,
                notes
            )
            select 
                id, 
                v_restore_amount, 
                current_stock, 
                'adjustment', 
                'Order Cancelled - Stock Restored: ' || p_order_id
            from ingredients
            where id = v_ingredient.ingredient_id;
            
        end loop;
    end loop;
end;
$$;

-- Function to get daily sales report (Revenue, Count, Split, Menu Sales)
create or replace function get_daily_sales_report(report_date date)
returns json
language plpgsql
security definer
as $$
declare
    v_total_revenue numeric;
    v_total_transactions int;
    v_cash_revenue numeric;
    v_qris_revenue numeric;
    v_menu_sales json;
begin
    -- 1. Calculate Totals
    select 
        coalesce(sum(total_amount), 0),
        count(id),
        coalesce(sum(case when payment_method = 'cash' then total_amount else 0 end), 0),
        coalesce(sum(case when payment_method = 'qris' then total_amount else 0 end), 0)
    into 
        v_total_revenue,
        v_total_transactions,
        v_cash_revenue,
        v_qris_revenue
    from orders
    where date(created_at AT TIME ZONE 'Asia/Jakarta') = report_date 
    and status = 'completed';

    -- 2. Calculate Menu Sales
    select json_agg(t)
    into v_menu_sales
    from (
        select 
            p.name as product_name,
            c.name as category,
            sum(oi.quantity) as quantity_sold,
            sum(oi.subtotal) as total_revenue
        from order_items oi
        join orders o on oi.order_id = o.id
        left join products p on oi.product_id = p.id
        left join categories c on p.category_id = c.id
        where date(o.created_at AT TIME ZONE 'Asia/Jakarta') = report_date
        and o.status = 'completed'
        group by p.name, c.name
        order by quantity_sold desc
    ) t;

    -- 3. Return JSON
    return json_build_object(
        'total_revenue', v_total_revenue,
        'total_transactions', v_total_transactions,
        'cash_revenue', v_cash_revenue,
        'qris_revenue', v_qris_revenue,
        'menu_sales', coalesce(v_menu_sales, '[]'::json)
    );
end;
$$;

-- Function to get sales report by date range (Generic: Daily or Monthly)
create or replace function get_sales_report(start_date date, end_date date)
returns json
language plpgsql
security definer
as $$
declare
    v_total_revenue numeric;
    v_total_transactions int;
    v_cash_revenue numeric;
    v_qris_revenue numeric;
    v_menu_sales json;
begin
    -- 1. Calculate Totals
    select 
        coalesce(sum(total_amount), 0),
        count(id),
        coalesce(sum(case when payment_method = 'cash' then total_amount else 0 end), 0),
        coalesce(sum(case when payment_method = 'qris' then total_amount else 0 end), 0)
    into 
        v_total_revenue,
        v_total_transactions,
        v_cash_revenue,
        v_qris_revenue
    from orders
    where date(created_at AT TIME ZONE 'Asia/Jakarta') between start_date and end_date
    and status = 'completed';

    -- 2. Calculate Menu Sales
    select json_agg(t)
    into v_menu_sales
    from (
        select 
            p.name as product_name,
            c.name as category,
            sum(oi.quantity) as quantity_sold,
            sum(oi.subtotal) as total_revenue
        from order_items oi
        join orders o on oi.order_id = o.id
        left join products p on oi.product_id = p.id
        left join categories c on p.category_id = c.id
        where date(o.created_at AT TIME ZONE 'Asia/Jakarta') between start_date and end_date
        and o.status = 'completed'
        group by p.name, c.name
        order by quantity_sold desc
    ) t;

    -- 3. Return JSON
    return json_build_object(
        'total_revenue', v_total_revenue,
        'total_transactions', v_total_transactions,
        'cash_revenue', v_cash_revenue,
        'qris_revenue', v_qris_revenue,
        'menu_sales', coalesce(v_menu_sales, '[]'::json)
    );
end;
$$;

create or replace function get_monthly_ingredient_usage(report_date date)
returns json
language plpgsql
security definer
as $$
declare
    v_start_date date;
    v_end_date date;
    v_usage_data json;
begin
    -- Determine start and end of the month
    v_start_date := date_trunc('month', report_date);
    v_end_date := (date_trunc('month', report_date) + interval '1 month - 1 day')::date;

    select json_agg(t)
    into v_usage_data
    from (
        select 
            i.name as ingredient_name,
            i.unit,
            abs(sum(sl.change_amount)) as total_used
        from stock_logs sl
        join ingredients i on sl.ingredient_id = i.id
        where date(sl.created_at AT TIME ZONE 'Asia/Jakarta') between v_start_date and v_end_date
        and sl.change_type in ('transaction', 'out')
        group by i.id, i.name, i.unit
        having sum(sl.change_amount) < 0
        order by total_used desc
    ) t;

    return coalesce(v_usage_data, '[]'::json);
end;
$$;

-- Function to get ingredient usage by date range (Generic)
create or replace function get_ingredient_usage(start_date date, end_date date)
returns json
language plpgsql
security definer
as $$
declare
    v_usage_data json;
begin
    select json_agg(t)
    into v_usage_data
    from (
        select 
            i.name as ingredient_name,
            i.unit,
            abs(sum(sl.change_amount)) as total_used
        from stock_logs sl
        join ingredients i on sl.ingredient_id = i.id
        where date(sl.created_at AT TIME ZONE 'Asia/Jakarta') between start_date and end_date
        and sl.change_type in ('transaction', 'out')
        group by i.id, i.name, i.unit
        having sum(sl.change_amount) < 0
        order by total_used desc
    ) t;

    return coalesce(v_usage_data, '[]'::json);
end;
$$;


-- Function to get ingredient EXPENDITURE (Belanja Bahan) by date range
create or replace function get_ingredient_expense_report(start_date date, end_date date)
returns json
language plpgsql
security definer
as $$
declare
    v_expense_data json;
begin
    select json_agg(t)
    into v_expense_data
    from (
        select 
            i.name as ingredient_name,
            i.unit,
            count(sl.id) as purchase_count,
            sum(sl.change_amount) as total_qty_purchased,
            sum(sl.price) as total_expenditure
        from stock_logs sl
        join ingredients i on sl.ingredient_id = i.id
        where date(sl.created_at AT TIME ZONE 'Asia/Jakarta') between start_date and end_date
        and sl.change_type = 'in'
        and sl.price > 0 -- Only count actual purchases with cost
        group by i.id, i.name, i.unit
        order by total_expenditure desc
    ) t;

    return coalesce(v_expense_data, '[]'::json);
end;
$$;

-- Function to get product sales ranking by date range
create or replace function get_product_sales_ranking(start_date date, end_date date)
returns json
language plpgsql
security definer
as $$
declare
    v_ranking_data json;
begin
    select json_agg(t)
    into v_ranking_data
    from (
        select 
            p.name as product_name,
            c.name as category,
            sum(oi.quantity) as quantity_sold,
            sum(oi.subtotal) as total_revenue
        from order_items oi
        join orders o on oi.order_id = o.id
        left join products p on oi.product_id = p.id
        left join categories c on p.category_id = c.id
        where date(o.created_at AT TIME ZONE 'Asia/Jakarta') between start_date and end_date
        and o.status = 'completed'
        group by p.name, c.name
        order by quantity_sold desc
    ) t;

    return coalesce(v_ranking_data, '[]'::json);
end;
$$;

-- [ONE-TIME FIX] Update stock_logs constraint to allow 'transaction'
-- ALTER TABLE stock_logs DROP CONSTRAINT IF EXISTS stock_logs_change_type_check;
-- ALTER TABLE stock_logs ADD CONSTRAINT stock_logs_change_type_check CHECK (change_type IN ('in', 'out', 'adjustment', 'transaction'));
