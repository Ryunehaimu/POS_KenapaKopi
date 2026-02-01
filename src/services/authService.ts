import { supabase } from "../lib/supabase";

export const authService = {
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  async signOut() {
    return await supabase.auth.signOut();
  }
};
