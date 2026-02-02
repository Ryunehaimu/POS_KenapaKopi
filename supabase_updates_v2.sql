-- Drop the check constraint on status to allow more flexible values if needed, 
-- or we just stick to 'Masuk'/'Tidak' but map them to 'in'/'out' properly.
-- Actually the user wants 'Telat' logic.
-- Let's add late_minutes column first.

ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;

-- Drop constraint if it exists to avoid issues with 'Masuk' vs 'in'
-- We have to find the constraint name first, usually attendance_logs_status_check
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_logs_status_check') THEN 
        ALTER TABLE attendance_logs DROP CONSTRAINT attendance_logs_status_check; 
    END IF; 
END $$;
