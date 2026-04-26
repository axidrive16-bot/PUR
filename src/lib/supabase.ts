import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "";
const SUPABASE_ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? "";

/** True si les variables d'environnement Supabase sont présentes */
export const SUPABASE_AVAILABLE = !!(SUPABASE_URL && SUPABASE_ANON);

let _supabase:      SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!SUPABASE_AVAILABLE) {
      // Placeholder qui ne lancera pas d'erreur à l'import — les appels échoueront côté réseau
      _supabase = createSupabaseClient(
        "https://placeholder.supabase.co",
        "placeholder-anon-key"
      );
    } else {
      _supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON);
    }
  }
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = SUPABASE_URL || "https://placeholder.supabase.co";
    const key = SUPABASE_SERVICE || "placeholder-service-key";
    _supabaseAdmin = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// Proxies lazy — ne créent le client qu'au premier accès
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
