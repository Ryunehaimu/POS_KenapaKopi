-- Create the 'daily_attendance' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily_attendance', 'daily_attendance', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access (Read)
CREATE POLICY "Public Access Daily Attendance"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'daily_attendance' );

-- Allow authenticated upload (Insert)
CREATE POLICY "Authenticated Upload Daily Attendance"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'daily_attendance' AND auth.role() = 'authenticated' );
