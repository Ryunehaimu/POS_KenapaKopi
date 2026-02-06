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
  status: 'Masuk' | 'Tidak' | 'Izin' | 'Sakit' | 'Alpha';
  date: string;
  attendance_photo_url: string;
  clock_out_photo_url?: string;
  late_minutes?: number;
  shift_id?: string;
  clock_out_at?: string;
  overtime_minutes?: number;
  overtime_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  employees?: Employee; // Joined
  shifts?: any; // Joined
  notes?: string;
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
      let lateMinutes = 0;
      let shift: any = null;

      // 1. Fetch Shift if provided (Hoist this to reuse for Date Logic)
      if (shiftId) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', shiftId)
          .single();
        
        if (error || !data) throw new Error("Data shift tidak valid atau tidak ditemukan.");
        shift = data;
      }

      // 2. Shift Validation and Lateness
      if (status === 'Masuk' && shift) {
        const [startHour, startMinute] = shift.start_time.split(':').map(Number);
        const [endHour, endMinute] = shift.end_time.split(':').map(Number);

        let shiftStart = new Date(now);
        shiftStart.setHours(startHour, startMinute, 0, 0);

        let shiftEnd = new Date(now);
        shiftEnd.setHours(endHour, endMinute, 0, 0);

        // Overnight Check for Validation Window
        if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
           const currentHours = now.getHours();
           const currentMinutes = now.getMinutes();

           if (currentHours < endHour || (currentHours === endHour && currentMinutes < endMinute)) {
             shiftStart.setDate(shiftStart.getDate() - 1);
           } else {
             shiftEnd.setDate(shiftEnd.getDate() + 1);
           }
        }

        const allowedStart = new Date(shiftStart.getTime() - 30 * 60000); // 30 mins before

        if (now < allowedStart) {
           const diffMs = allowedStart.getTime() - now.getTime();
           const diffMins = Math.ceil(diffMs / 60000);
           throw new Error(`Belum waktunya absen. Absen dibuka 30 menit sebelum shift (${diffMins} menit lagi).`);
        }

        if (now > shiftEnd) {
           throw new Error("Waktu shift sudah berakhir. Anda tidak dapat melakukan absen masuk.");
        }

        // Lateness
        if (now > shiftStart) {
           const diffMs = now.getTime() - shiftStart.getTime();
           const diffMins = Math.floor(diffMs / 60000);
           if (diffMins > 0) {
             lateMinutes = Math.ceil(diffMins / 30) * 30;
           }
        }
      } else if (status === 'Masuk' && !shiftId) {
         lateMinutes = this.calculateLateness(now);
      }

      // 3. Determine Operational Date (WIB Aware)
      const localDate = new Date();
      const offset = localDate.getTimezoneOffset() * 60000;
      let logDateStr = (new Date(localDate.getTime() - offset)).toISOString().slice(0, 10);

      // Adjust date for overnight shifts
      if (shift) {
        const [startHour, startMinute] = shift.start_time.split(':').map(Number);
        const [endHour, endMinute] = shift.end_time.split(':').map(Number);

        if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
             const currentHours = localDate.getHours();
             const currentMinutes = localDate.getMinutes();
             if (currentHours < endHour || (currentHours === endHour && currentMinutes < endMinute)) {
                 const yesterday = new Date(localDate);
                 yesterday.setDate(yesterday.getDate() - 1);
                 const yOffset = yesterday.getTimezoneOffset() * 60000;
                 logDateStr = (new Date(yesterday.getTime() - yOffset)).toISOString().slice(0, 10);
            }
        }
      }

      // 4. DUPLICATION CHECK (User Request)
      // Check if employee already has a log for this DATE
      if (status === 'Masuk') {
          const { data: existingLog } = await supabase
            .from('attendance_logs')
            .select('*, shifts(name)')
            .eq('employee_id', employeeId)
            .eq('date', logDateStr)
            .single();
            
          if (existingLog) {
             const shiftName = existingLog.shifts?.name || 'Shift Lain';
             const time = new Date(existingLog.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
             throw new Error(`Kamu sudah absen di ${shiftName} jam ${time}`);
          }
      }

      // 5. Upload Photo
      const timestamp = new Date().getTime();
      const fileName = `${employeeId}_${status}_${timestamp}.jpg`;
      const photoUrl = await this.uploadPhoto(photoBase64, fileName);

      // 6. Insert Log
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert({
          employee_id: employeeId,
          status,
          attendance_photo_url: photoUrl,
          date: logDateStr,
          late_minutes: lateMinutes,
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
  async clockOut(employeeId: string, photoBase64: string) {
    // 1. Determine "Today's" Date (Operational Date)
    // We need to find the active 'Masuk' log.
    // Standard approach: Look for a log where date = Today OR date = Yesterday (if overnight shift)
    
    // We'll search for the latest 'Masuk' log that hasn't clocked out yet.
    // This is safer than relying on "date=today" because of the overnight shift issue (Date 01:00 AM vs Log Date Yesterday)
    const { data: log, error: searchError } = await supabase
      .from('attendance_logs')
      .select('*, shifts(*)') // join with shifts
      .eq('employee_id', employeeId)
      .eq('status', 'Masuk')
      .is('clock_out_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (searchError || !log) {
      throw new Error("Tidak ditemukan sesi absensi aktif. Anda mungkin belum absen masuk.");
    }

    // 2. Upload Photo
    const timestamp = new Date().getTime();
    const fileName = `${employeeId}_pulang_${timestamp}.jpg`;
    const photoUrl = await this.uploadPhoto(photoBase64, fileName);

    const now = new Date();
    let overtimeMinutes = 0;

    // 3. Calculate Overtime
    if (log.shifts) {
      // Construct shift end time relative to the log's created_at or just the current time?
      // We need to reconstruct the "Shift End Timestamp" based on the "Log Date".
      // Log Date is YYYY-MM-DD.
      
      const logDate = new Date(log.date); // This assumes the Log Date is correct (e.g. Yesterday for overnight)
      const [endHour, endMinute, endSecond] = log.shifts.end_time.split(':').map(Number);
      const [startHour, startMinute] = log.shifts.start_time.split(':').map(Number);
      
      let shiftEnd = new Date(logDate);
      shiftEnd.setHours(endHour, endMinute, endSecond || 0, 0);

      // Handle Overnight Shift
      if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }

      // STRICT VALIDATION: Prevent Early Clock Out
      // User request: "ketika blm jam selesai shift nya tidak bisa absen keluar"
      if (now < shiftEnd) {
          const diffMs = shiftEnd.getTime() - now.getTime();
          const diffMins = Math.ceil(diffMs / 60000);
          throw new Error(`Belum waktunya pulang. Shift berakhir pukul ${log.shifts.end_time} (${diffMins} menit lagi).`);
      }

      if (now > shiftEnd) {
        // Calculate overtime
        const diffMs = now.getTime() - shiftEnd.getTime();
        overtimeMinutes = Math.floor(diffMs / 60000);
      }
    }

    // 4. Update Log
    const { data, error } = await supabase
      .from('attendance_logs')
      .update({
        clock_out_at: now.toISOString(),
        clock_out_photo_url: photoUrl,
        overtime_minutes: overtimeMinutes,
        overtime_status: overtimeMinutes > 0 ? 'pending' : 'approved' 
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
  },

  // --- Incomplete Checkout Handling (Captain/Owner) ---

  async getIncompleteLogs() {
      // Fetch status='Masuk' WHERE clock_out_at IS NULL
      // Ordering by date ascending (oldest first) to clear backlog
      const { data, error } = await supabase
          .from('attendance_logs')
          .select('*, employees(name), shifts(name, start_time, end_time)')
          .eq('status', 'Masuk')
          .is('clock_out_at', null)
          .order('date', { ascending: true });

      if (error) throw error;
      
      const logs = data as AttendanceLog[];
      const now = new Date();

      // Filter: Only show logs where "Shift has Ended"
      return logs.filter(log => {
          // If no shift data, show it (safest default, or maybe they really forgot)
          if (!log.shifts) return true;

          const logDate = new Date(log.date);
          const [startHour, startMinute] = log.shifts.start_time.split(':').map(Number);
          const [endHour, endMinute] = log.shifts.end_time.split(':').map(Number);

          let shiftEnd = new Date(logDate);
          shiftEnd.setHours(endHour, endMinute, 0, 0);

          // Handle Overnight: If End < Start, the shift ends on the NEXT day relative to Log Date
          if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
              shiftEnd.setDate(shiftEnd.getDate() + 1);
          }
          
          // Debugging log (optional)
          // console.log(`Log ${log.id}: ShiftEnd=${shiftEnd.toLocaleString()}, Now=${now.toLocaleString()}`);

          // Return TRUE if Now > ShiftEnd (Means they forgot to checkout)
          return now > shiftEnd;
      });
  },

  async resolveIncompleteLog(
      logId: string, 
      resolutionType: 'normal' | 'manual' | 'overtime',
      manualTime?: string, // ISO String or Time String? ISO better for clock_out_at
      notes?: string
  ) {
      // manualTime should be the FULL ISO String of the clock out time.
      // If resolutionType is 'normal', we might need to calculate shift end again, but better passed from UI or recalculated here.
      
      // Let's rely on the UI/caller to provide the correct "clockOutTime" (ISO)
      
      const updates: any = {
          clock_out_at: manualTime,
          notes: notes
      };

      // If Overtime logic is needed, the UI should probably calculate standard overtime minutes
      // OR we calculate it here if manualTime > shiftEnd.
      // For simplicity, let's recalculate overtime if manualTime is provided.
      
      if (manualTime) {
          const { data: log } = await supabase.from('attendance_logs').select('*, shifts(*)').eq('id', logId).single();
          if (log && log.shifts) {
              const clockOutDate = new Date(manualTime);
              
              const logDate = new Date(log.date);
              const [startHour, startMinute] = log.shifts.start_time.split(':').map(Number);
              const [endHour, endMinute] = log.shifts.end_time.split(':').map(Number);
              
              let shiftEnd = new Date(logDate);
              shiftEnd.setHours(endHour, endMinute, 0, 0);
              
              if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
                  shiftEnd.setDate(shiftEnd.getDate() + 1);
              }

              if (clockOutDate > shiftEnd) {
                   const diffMs = clockOutDate.getTime() - shiftEnd.getTime();
                   updates.overtime_minutes = Math.floor(diffMs / 60000);
                   if(updates.overtime_minutes > 0) {
                       updates.overtime_status = 'pending'; // Captain needs to approve separate overtime? Or auto-approve since Captain is doing this?
                       // User request: "Captain bakal memilih... overtime" -> Implies approval.
                       updates.overtime_status = 'approved'; // Since Captain forces it.
                   }
              }
          }
      }

      const { data, error } = await supabase
          .from('attendance_logs')
          .update(updates)
          .eq('id', logId)
          .select()
          .single();

      if (error) throw error;
      return data as AttendanceLog;
  }
};