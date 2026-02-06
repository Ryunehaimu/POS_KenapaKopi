ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
