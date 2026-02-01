-- Ingredients Table
CREATE TABLE public.ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('main', 'support')),
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'gr', 'ltr', 'ml', 'pcs')),
    current_stock FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Stock Logs Table
CREATE TABLE public.stock_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
    change_amount FLOAT NOT NULL,
    current_stock_snapshot FLOAT NOT NULL, -- Stock after change
    price FLOAT DEFAULT 0, -- Buying price for 'in'
    change_type TEXT NOT NULL CHECK (change_type IN ('in', 'out', 'adjustment')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access ingredients" ON public.ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public insert ingredients" ON public.ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update ingredients" ON public.ingredients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete ingredients" ON public.ingredients FOR DELETE USING (true);

CREATE POLICY "Allow public read access logs" ON public.stock_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert logs" ON public.stock_logs FOR INSERT WITH CHECK (true);
