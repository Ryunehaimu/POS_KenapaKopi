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
    status: 'Masuk' | 'Izin' | 'Sakit' | 'Alpha' | 'Tidak';
    date: string; // YYYY-MM-DD
    created_at: string;
}

export const employeeService = {
    // --- Employee CRUD ---

    async getEmployees() {
        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .order("name", { ascending: true });

        if (error) throw error;
        return data as Employee[];
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
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("date", today);

        if (error) throw error;
        return data as AttendanceLog[];
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
        const today = new Date().toISOString().split('T')[0];

        // Get all active employees count
        const { count: totalEmployees, error: empError } = await supabase
            .from("employees")
            .select("*", { count: 'exact', head: true });

        if (empError) throw empError;

        // Get today's logs
        const { data: logs, error: logError } = await supabase
            .from("attendance_logs")
            .select("status")
            .eq("date", today);

        if (logError) throw logError;

        const present = logs?.filter(l => l.status === 'Masuk').length || 0;
        const late = logs?.filter(l => l.status === 'Terlambat').length || 0; // Assuming 'Terlambat' is a status, or part of logic
        const permission = logs?.filter(l => ['Izin', 'Sakit'].includes(l.status)).length || 0;

        return {
            total: totalEmployees || 0,
            present,
            late,
            permission
        };
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
