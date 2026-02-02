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
  status: 'Masuk' | 'Tidak';
  date: string;
  attendance_photo_url: string;
  late_minutes?: number;
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
      .from('daily_attendance')
      .upload(filePath, decode(base64Image), {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('daily_attendance')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Helper to calculate late info
  calculateLateness(logTime: string | Date) {
      const d = new Date(logTime);
      const hour = d.getHours();
      
      const targetHour = hour >= 12 ? 15 : 9;
      const target = new Date(d);
      target.setHours(targetHour, 0, 0, 0);

      let lateMinutes = 0;

      if (d > target) {
          const diffMs = d.getTime() - target.getTime();
          const diffMins = Math.floor( diffMs / 60000 );

          if (diffMins > 0) {
              lateMinutes = Math.ceil(diffMins / 30) * 30;
          }
      }

      return lateMinutes;
  },

  // Clock In/Out
  async logAttendance(employeeId: string, status: 'Masuk' | 'Tidak', photoBase64: string) {
    try {
      const now = new Date();
      const hour = now.getHours();

      // Store Hours Validation (Block 22:00 - 07:00)
      // "Jam tutup sampai 2 jam sebelum buka (09:00 - 2 = 07:00)"
      if (hour >= 22 || hour < 7) {
          throw new Error("Toko sedang tutup. Absensi hanya dapat dilakukan mulai pukul 07:00 pagi.");
      }

      // Calculate Lateness
      const lateMinutes = this.calculateLateness(now);

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
          attendance_photo_url: photoUrl,
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          late_minutes: lateMinutes
        })
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceLog;

    } catch (error) {
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
  },

  // Get count of employees present today
  async getDailyAttendanceCount() {
    const today = new Date().toISOString().split('T')[0];
    // Get all 'in' logs for today
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('employee_id')
      .eq('date', today)
      .eq('status', 'Masuk');

    if (error) throw error;

    // Count unique employees
    const uniqueEmployees = new Set(data.map(log => log.employee_id));
    return uniqueEmployees.size;
  // Identify user from photo (MOCK IMPLEMENTATION)
  // In a real app, this would send the photo to a Face Recognition API
  async identifyUser(photoBase64: string): Promise<Employee | null> {
    // SIMULATION: Just return the first employee found to demonstrate flow
    // Replace this logic with actual API call to AWS Rekognition / Azure Face
    
    console.log("Simulating Face Recognition...");
    
    // Artificial delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const employees = await this.getEmployees();
    if (employees.length > 0) {
        // Return a random employee for simulation
        // const randomIndex = Math.floor(Math.random() * employees.length);
        // return employees[randomIndex];
        return employees[0]; // Always return the first one for consistent testing
    }
    
    return null;
  }
};
