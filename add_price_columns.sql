-- Add columns for platform-specific prices
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_gojek numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_grab numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_shopee numeric;

-- Optional: Initialize new columns with the base price
UPDATE products SET price_gojek = price WHERE price_gojek IS NULL;
UPDATE products SET price_grab = price WHERE price_grab IS NULL;
UPDATE products SET price_shopee = price WHERE price_shopee IS NULL;
