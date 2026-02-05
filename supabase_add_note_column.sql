-- Add note column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS note TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'note';
