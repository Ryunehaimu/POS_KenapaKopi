-- Create products table
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create product_ingredients table (Many-to-Many relationship for Recipes)
create table product_ingredients (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) on delete restrict not null,
  quantity numeric not null, -- Quantity needed for one unit of product
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Optional, depending on your auth policy, here assuming public for simpler start or existing policy)
alter table products enable row level security;
alter table product_ingredients enable row level security;

-- Create policies (Example: Allow all authenticated access)
create policy "Enable read access for all users" on products for select using (true);
create policy "Enable insert for authenticated users only" on products for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on products for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users only" on products for delete using (auth.role() = 'authenticated');

create policy "Enable read access for all users" on product_ingredients for select using (true);
create policy "Enable insert for authenticated users only" on product_ingredients for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on product_ingredients for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users only" on product_ingredients for delete using (auth.role() = 'authenticated');
