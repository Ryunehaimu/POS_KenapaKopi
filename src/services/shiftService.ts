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
        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
