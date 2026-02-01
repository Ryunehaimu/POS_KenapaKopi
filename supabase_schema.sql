-- Create the categories table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access" ON public.categories
    FOR SELECT USING (true);

-- Allow write access to authenticated users (or everyone if you don't have auth set up strictly yet)
-- adjusting this based on typical simple setup, but sticking to authenticated for safety if auth is used.
-- If you want it public for now (easier dev):
CREATE POLICY "Allow public insert" ON public.categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.categories
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON public.categories
    FOR DELETE USING (true);

-- Seed data
INSERT INTO public.categories (name) VALUES
('Kopi'),
('Non-Kopi'),
('Makanan'),
('Snack');
