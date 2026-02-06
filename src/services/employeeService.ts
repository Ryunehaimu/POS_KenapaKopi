import { supabase } from "../lib/supabase";
import { decode } from "base64-arraybuffer";

export interface Employee {
    id: string;
    name: string;
    photo_url?: string;
    created_at: string;
    attendance_logs?: AttendanceLog[];
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  status: 'Masuk' | 'Tidak' | 'Izin' | 'Sakit' | 'Alpha';
  date: string;
  attendance_photo_url?: string;
  clock_out_photo_url?: string;
  late_minutes?: number;
  clock_out_at?: string;
  overtime_minutes?: number;
  overtime_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  employees?: Employee;
  shifts?: {
    name: string;
    start_time: string;
    end_time: string;
  }; 
  notes?: string;
}

export const employeeService = {
    // --- Employee CRUD ---

    // Helper: Get local date string YYYY-MM-DD
    getLocalDateString(date: Date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    async getEmployees(search?: string, page: number = 1, limit: number = 10) {
        let query = supabase
            .from("employees")
            .select("*", { count: 'exact' })
            .order("name", { ascending: true });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;
        return { data: (data || []) as Employee[], count };
    },

    async getEmployeeById(id: string) {
        // Join with attendance logs, ordered by date desc
        const { data, error } = await supabase
            .from("employees")
            .select("*, attendance_logs(*)")
            .eq("id", id)
            .single();

        if (error) throw error;

        // Sort logs manually if needed or via query modifiers if Supabase supports nested ordering easily
        if (data.attendance_logs) {
            data.attendance_logs.sort((a: AttendanceLog, b: AttendanceLog) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
        }

        return data as Employee;
    },

    async createEmployee(name: string, photo_url?: string) {
        const { data, error } = await supabase
            .from("employees")
            .insert([{ name, photo_url }])
            .select()
            .single();

        if (error) throw error;
        return data as Employee;
    },

    async updateEmployee(id: string, updates: { name?: string; photo_url?: string }) {
        const { data, error } = await supabase
            .from("employees")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return data as Employee;
    },

    async deleteEmployee(id: string) {
        const { error } = await supabase.from("employees").delete().eq("id", id);
        if (error) throw error;
        return true;
    },

    // --- Attendance ---

    async getTodayAttendance() {
        const today = this.getLocalDateString();
        const { data, error } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("date", today);

        if (error) throw error;
        return data as AttendanceLog[];
    },

    // Helper to calculate late info (shared for consistency)
    calculateLateness(logTime: string | Date) {
        const d = new Date(logTime);
        const hour = d.getHours();

        // Shift Targets
        // < 12:00 -> Target 09:00
        // >= 12:00 -> Target 15:00
        const targetHour = hour >= 12 ? 15 : 9;

        const target = new Date(d);
        target.setHours(targetHour, 0, 0, 0);

        let lateMinutes = 0;
        let effectiveTime = new Date(d);

        if (d > target) {
            const diffMs = d.getTime() - target.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins > 0) {
                // Rounding Rule: Minimum 30 mins, Steps of 30 mins
                // Ceil(diff / 30) * 30
                lateMinutes = Math.ceil(diffMins / 30) * 30;

                // Effective Time = Target + LateMinutes
                effectiveTime = new Date(target.getTime() + lateMinutes * 60000);
            }
        }

        return { lateMinutes, effectiveTime, targetHour };
    },

    async logAttendance(employeeId: string, status: 'Masuk' | 'Tidak', photoBase64: string) {
        // Calculate Lateness
        const now = new Date();
        const { lateMinutes } = this.calculateLateness(now);
        const today = this.getLocalDateString(now);

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
                date: today,
                late_minutes: lateMinutes
            })
            .select()
            .single();

        if (error) throw error;
        return data as AttendanceLog;
    },

    async getEmployeeAttendanceByMonth(employeeId: string, month: number, year: number) {
        // Construct start and end dates for the month
        // month is 1-12
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data: logs, error } = await supabase
            .from("attendance_logs")
            .select("*, shifts(name, start_time, end_time)")
            .eq("employee_id", employeeId)
            .gte("date", startDateStr)
            .lt("date", endDateStr)
            .order("date", { ascending: false });

        if (error) throw error;

        // Process logs into a map for easy lookup
        const logMap = new Map<string, AttendanceLog>();
        logs?.forEach((log) => {
            logMap.set(log.date, log as AttendanceLog);
        });

        // Generate all dates for the month
        const results: AttendanceLog[] = [];
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(nextYear, nextMonth - 1, 0); // Last day of month

        const now = new Date();
        const todayStr = this.getLocalDateString(now);
        const currentHour = now.getHours();
        const CLOSING_HOUR = 22; // 10 PM

        // Iterate from last day to first day (descending order)
        for (let d = endDate; d >= startDate; d.setDate(d.getDate() - 1)) {
            // Create a new date object to avoid reference issues
            const dateObj = new Date(d);
            // Use local time components to avoid UTC shift
            const yearStr = dateObj.getFullYear();
            const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dayStr = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

            // If we have a log, use it
            if (logMap.has(dateStr)) {
                results.push(logMap.get(dateStr)!);
            } else {
                // Check if we should mark as Alpha
                // Condition: Date is in the past OR (Date is Today AND Time > Closing Time)
                // Also ensure we don't mark future dates

                let isAlpha = false;

                if (dateStr < todayStr) {
                    isAlpha = true;
                } else if (dateStr === todayStr) {
                    if (currentHour >= CLOSING_HOUR) {
                        isAlpha = true;
                    }
                }

                if (isAlpha) {
                    results.push({
                        id: `alpha-${dateStr}`,
                        employee_id: employeeId,
                        status: 'Alpha',
                        date: dateStr,
                        // Use pseudo status time 23:59:59
                        created_at: `${dateStr}T23:59:59`,
                        // No photo for Alpha
                    });
                }
            }
        }

        return results;
    },

    async uploadPhoto(base64Image: string, fileName: string): Promise<string> {
        const filePath = `logs/${fileName}`;
        const { data, error } = await supabase.storage
            .from('daily_attendance')
            .upload(filePath, decode(base64Image), { contentType: 'image/jpeg', upsert: true });

        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('daily_attendance').getPublicUrl(filePath);
        return publicUrl;
    },

    async markAttendance(employeeId: string, status: string, date: string) {
        // Check if exists for this date
        const { data: existing } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("employee_id", employeeId)
            .eq("date", date)
            .single();

        if (existing) {
            // Update
            const { data, error } = await supabase
                .from("attendance_logs")
                .update({ status })
                .eq("id", existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            // Insert
            const { data, error } = await supabase
                .from("attendance_logs")
                .insert([{ employee_id: employeeId, status, date }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async getAttendanceStats() {
        const today = this.getLocalDateString();

        const { count: totalEmployees, error: empError } = await supabase
            .from("employees")
            .select("*", { count: 'exact', head: true });

        if (empError) throw empError;

        // Get today's logs with late_minutes if available, or calc on fly
        const { data: logs, error: logError } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("date", today);

        if (logError) throw logError;

        const present = logs?.filter(l => l.status === 'Masuk').length || 0;

        // Count late. Use stored late_minutes if > 0, OR calc on fly if undefined (for robustness)
        const late = logs?.filter(l => {
            if (l.status !== 'Masuk') return false;
            if (l.late_minutes && l.late_minutes > 0) return true;
            // Fallback calc
            const { lateMinutes } = this.calculateLateness(l.created_at);
            return lateMinutes > 0;
        }).length || 0;

        const permission = logs?.filter(l => ['Izin', 'Sakit'].includes(l.status)).length || 0;

        return {
            total: totalEmployees || 0,
            present,
            late,
            permission
        };
    },

    async updateAttendanceStatus(employeeId: string, date: string, status: string, notes?: string) {
        // Check if log exists
        const { data: existing } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("employee_id", employeeId)
            .eq("date", date)
            .single();

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from("attendance_logs")
                .update({ status, notes })
                .eq("id", existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Insert new (was synthetic Alpha)
            const { data, error } = await supabase
                .from("attendance_logs")
                .insert({
                    employee_id: employeeId,
                    status,
                    notes,
                    date,
                    late_minutes: 0 // Authorized absence is not "late"
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    async uploadProfilePhoto(uri: string) {
        try {
            const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
            const fileName = `emp_${Date.now()}.${ext}`;
            const filePath = `${fileName}`;

            let fileBody;
            if (uri.startsWith('data:')) {
                const base64Str = uri.split(',')[1];
                fileBody = decode(base64Str);
            } else {
                const response = await fetch(uri);
                const blob = await response.blob();
                const reader = new FileReader();
                fileBody = await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            resolve(decode(reader.result.split(',')[1]));
                        } else {
                            reject(new Error('Failed to convert blob to base64'));
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            const { error } = await supabase.storage
                .from('avatars') // Assuming bucket name
                .upload(filePath, fileBody as ArrayBuffer, {
                    contentType: `image/${ext}`,
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            return publicUrl;
        } catch (error) {
            console.error("Upload Error:", error);
            throw error;
        }
    }
};
