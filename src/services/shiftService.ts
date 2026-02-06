import { supabase } from "../lib/supabase";

export interface Shift {
    id: string;
    name: string;
    start_time: string; // "HH:mm:ss"
    end_time: string;   // "HH:mm:ss"
}

export const shiftService = {
    async getShifts() {
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('is_deleted', false)
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data as Shift[];
    },

    async createShift(name: string, start_time: string, end_time: string) {
        const { data, error } = await supabase
            .from('shifts')
            .insert([{ name, start_time, end_time }])
            .select()
            .single();

        if (error) throw error;
        return data as Shift;
    },

    async updateShift(id: string, updates: Partial<Shift>) {
        const { data, error } = await supabase
            .from('shifts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Shift;
    },

    async deleteShift(id: string) {
        // Check if shift is used in attendance_logs TODAY
        // User logic: "If used today, cannot delete. If used yesterday but not today, can delete."
        
        // 1. Get Today's Date (Local/Operational)
        // Matches the logic in attendanceService for 'date' column
        const localDate = new Date();
        const offset = localDate.getTimezoneOffset() * 60000;
        const today = (new Date(localDate.getTime() - offset)).toISOString().slice(0, 10);

        const { count, error: countError } = await supabase
            .from('attendance_logs')
            .select('*', { count: 'exact', head: true })
            .eq('shift_id', id)
            .eq('date', today);

        if (countError) throw countError;

        if (count && count > 0) {
            throw new Error("Shift tidak dapat dihapus karena sedang dipakai hari ini.");
        }

        // Soft Delete: Mark as deleted instead of removing row
        const { error } = await supabase
            .from('shifts')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
