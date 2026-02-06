-- Run this in your Supabase SQL Editor to add the missing column
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS clock_out_photo_url text;
