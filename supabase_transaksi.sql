-- Create orders table
create table orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null DEFAULT 'ORD-' || to_char(now(), 'YYMMDD') || '-' || substring(md5(random()::text) from 1 for 4), 
  customer_name text,
  total_amount numeric not null,
  status text not null default 'completed', -- pending, completed, cancelled
  payment_method text not null, -- cash, qris
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create order_items table
create table order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  quantity numeric not null,
  price numeric not null, -- snapshot of price at time of order
  subtotal numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table orders enable row level security;
alter table order_items enable row level security;

-- Create policies (Simplistic for now)
create policy "Allow all access for authenticated users" on orders for all using (auth.role() = 'authenticated');
create policy "Allow all access for authenticated users" on order_items for all using (auth.role() = 'authenticated');
