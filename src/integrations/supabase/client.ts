import { createClient } from "@supabase/supabase-js";

// Connects to your EXISTING external Supabase project.
// Provide these via env vars (e.g. in .env / Lovable secrets):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY  (or VITE_SUPABASE_ANON_KEY)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!supabaseUrl || !supabaseKey) {
  // Surfaced clearly so the missing env vars are obvious during setup.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Add your external Supabase project env vars to enable auth and data.",
  );
}

export const supabase = createClient(supabaseUrl ?? "http://localhost", supabaseKey ?? "anon", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
