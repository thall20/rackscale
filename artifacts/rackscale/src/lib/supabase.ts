import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[RackScale] Supabase environment variables are not configured.\n" +
    `  VITE_SUPABASE_URL     : ${supabaseUrl ? `set (${supabaseUrl.slice(0, 30)}...)` : "NOT SET ❌"}\n` +
    `  VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? `set (${supabaseAnonKey.slice(0, 10)}...)` : "NOT SET ❌"}`
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type { User, Session } from "@supabase/supabase-js";
