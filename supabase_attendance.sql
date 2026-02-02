-- Create Employees Table (if not exists)
CREATE TABLE IF NOT EXISTS employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  photo_url text,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Attendance Logs Table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text CHECK (status IN ('in', 'out')),
  date date DEFAULT current_date,
  photo_url text,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Adjust based on your actual auth requirements)
-- Assuming 'authenticated' users (cashiers/owners) can read/write
CREATE POLICY "Enable all for authenticated users" ON employees
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON attendance_logs
    FOR ALL USING (auth.role() = 'authenticated');


-- STORAGE BUCKET: attendance
-- Ensure this bucket exists in your Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance', 'attendance', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access Attendance"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'attendance' );

CREATE POLICY "Authenticated Upload Attendance"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'attendance' AND auth.role() = 'authenticated' );
