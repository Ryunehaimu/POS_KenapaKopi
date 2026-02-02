import { supabase } from "../lib/supabase";
import { decode } from 'base64-arraybuffer';

export interface Employee {
  id: string;
  name: string;
  photo_url?: string;
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  status: 'in' | 'out';
  date: string;
  photo_url: string;
  created_at: string;
}

export const attendanceService = {
  // Get all employees
  async getEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as Employee[];
  },

  // Upload photo to storage
  async uploadPhoto(base64Image: string, fileName: string) {
    const filePath = `logs/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('attendance')
      .upload(filePath, decode(base64Image), {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('attendance')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Clock In/Out
  async logAttendance(employeeId: string, status: 'in' | 'out', photoBase64: string) {
    try {
      // 1. Upload Photo
      const timestamp = new Date().getTime();
      const fileName = `${employeeId}_${status}_${timestamp}.jpg`;
      const photoUrl = await this.uploadPhoto(photoBase64, fileName);

      // 2. Insert Log
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert({
          employee_id: employeeId,
          status,
          photo_url: photoUrl,
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        })
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceLog;

    } catch (error) {
      console.error('Attendance Log Error:', error);
      throw error;
    }
  },

  // Check today's status for an employee
  async getTodayLog(employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
    return data as AttendanceLog | null;
  }
};
