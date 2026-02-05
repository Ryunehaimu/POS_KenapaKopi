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
  shift_id?: string;
  clock_out_at?: string;
  overtime_minutes?: number;
  overtime_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  employees?: Employee; // Joined
  shifts?: any; // Joined
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
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins > 0) {
        lateMinutes = Math.ceil(diffMins / 30) * 30;
      }
    }

    return lateMinutes;
  },

  // Clock In
  async logAttendance(employeeId: string, status: 'Masuk' | 'Tidak', photoBase64: string, shiftId?: string) {
    try {
      const now = new Date();
      let lateMinutes = 0; // Initialize lateMinutes

      // SHIFT VALIDATION AND LATENESS CALCULATION FOR SHIFT-BASED ATTENDANCE
      if (status === 'Masuk' && shiftId) {
        const { data: shift, error: shiftError } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', shiftId)
          .single();

        if (shiftError || !shift) {
          throw new Error("Data shift tidak valid atau tidak ditemukan.");
        }

        const [startHour, startMinute] = shift.start_time.split(':').map(Number);
        const [endHour, endMinute] = shift.end_time.split(':').map(Number);

        // Construct Shift Start & End
        let shiftStart = new Date(now);
        shiftStart.setHours(startHour, startMinute, 0, 0);

        let shiftEnd = new Date(now);
        shiftEnd.setHours(endHour, endMinute, 0, 0);

        // Check if shift is overnight (e.g. 22:00 - 05:00)
        if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
          // It's an overnight shift.

          // If CURRENT time is before the end time (e.g. now is 01:00, end is 05:00),
          // then we are in the "tail" of the shift. So shift started Yesterday.
          const currentHours = now.getHours();
          const currentMinutes = now.getMinutes();

          if (currentHours < endHour || (currentHours === endHour && currentMinutes < endMinute)) {
            // We are in the early morning of the shift end
            shiftStart.setDate(shiftStart.getDate() - 1);
            // shiftEnd is Today (already set)
          } else {
            // We are in the evening of the shift start (e.g. now is 23:00)
            // shiftStart is Today (already set)
            shiftEnd.setDate(shiftEnd.getDate() + 1);
          }
        }

        // Debugging logs (optional, remove for prod)
        // console.log("Shift Window:", shiftStart.toLocaleString(), " - ", shiftEnd.toLocaleString());

        // Calculate Allowed Start (H-30 mins)
        const allowedStart = new Date(shiftStart.getTime() - 30 * 60000);

        if (now < allowedStart) {
          const diffMs = allowedStart.getTime() - now.getTime();
          const diffMins = Math.ceil(diffMs / 60000);
          throw new Error(`Belum waktunya absen. Absen dibuka 30 menit sebelum shift (${diffMins} menit lagi).`);
        }

        if (now > shiftEnd) {
          throw new Error("Waktu shift sudah berakhir. Anda tidak dapat melakukan absen masuk.");
        }

        // Calculate lateness based on shiftStart
        if (now > shiftStart) {
          const diffMs = now.getTime() - shiftStart.getTime();
          const diffMins = Math.floor(diffMs / 60000);

          if (diffMins > 0) {
            // Rule: Round up to nearest 30 mins (30, 60, 90...)
            lateMinutes = Math.ceil(diffMins / 30) * 30;
          }
        }

      } else if (status === 'Masuk' && !shiftId) {
        // If no shiftId is provided for 'Masuk' status, use the generic lateness calculation
        lateMinutes = this.calculateLateness(now);
      }
      // If status is 'Tidak', lateMinutes remains 0, which is correct.

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
          late_minutes: lateMinutes, // Use the calculated lateMinutes
          shift_id: shiftId
        })
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceLog;

    } catch (error) {
      throw error;
    }
  },

  // Clock Out
  async clockOut(employeeId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Find the active 'Masuk' log for today
    const { data: log, error: searchError } = await supabase
      .from('attendance_logs')
      .select('*, shifts(*)') // join with shifts
      .eq('employee_id', employeeId)
      .eq('date', today)
      .eq('status', 'Masuk')
      .is('clock_out_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (searchError || !log) {
      throw new Error("Tidak ditemukan sesi absensi aktif untuk hari ini.");
    }

    const now = new Date();
    let clockOutTime = now;
    let overtimeMinutes = 0;

    // Logic: If past shift end time, calculate overtime.
    if (log.shifts) {
      // Construct shift end Date object for today
      const [endHour, endMinute, endSecond] = log.shifts.end_time.split(':').map(Number);
      const shiftEnd = new Date(now);
      shiftEnd.setHours(endHour, endMinute, endSecond || 0, 0);

      if (now > shiftEnd) {
        // Calculate overtime
        const diffMs = now.getTime() - shiftEnd.getTime();
        overtimeMinutes = Math.floor(diffMs / 60000);
        
        // We do NOT cap the clockOutTime anymore for records
        clockOutTime = now; 
      }
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({
        clock_out_at: clockOutTime.toISOString(),
        overtime_minutes: overtimeMinutes,
        overtime_status: overtimeMinutes > 0 ? 'pending' : 'approved' // Auto approve if 0? or just null? Let's say pending if > 0
      })
      .eq('id', log.id)
      .select()
      .single();

    if (error) throw error;
    return data as AttendanceLog;
  },

  // Get Pending Overtime Logs
  async getPendingOvertimeLogs() {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, employees(name), shifts(name, start_time, end_time)')
      .eq('overtime_status', 'pending')
      .gt('overtime_minutes', 0)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as AttendanceLog[];
  },

  // Approve Overtime
  async approveOvertime(logId: string, status: 'approved' | 'rejected') {
    const { data, error } = await supabase
      .from('attendance_logs')
      .update({ overtime_status: status })
      .eq('id', logId)
      .select()
      .single();

    if (error) throw error;
    return data as AttendanceLog;
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
  },
  // Identify user from photo (MOCK IMPLEMENTATION)
  // In a real app, this would send the photo to a Face Recognition API
  async identifyUser(photoBase64: string): Promise<Employee | null> {
    // SIMULATION: Just return the first employee found to demonstrate flow
    // Replace this logic with actual API call to AWS Rekognition / Azure Face



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