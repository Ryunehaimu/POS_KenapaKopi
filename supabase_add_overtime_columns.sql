-- Add overtime columns to attendance_logs
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS overtime_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_status text DEFAULT 'pending' CHECK (overtime_status IN ('pending', 'approved', 'rejected'));

-- Update existing rows to have default values (optional, handled by DEFAULT)
-- UPDATE attendance_logs SET overtime_minutes = 0, overtime_status = 'pending' WHERE overtime_minutes IS NULL;
