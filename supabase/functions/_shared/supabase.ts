import { createClient } from "@supabase/supabase-js";

import { publishableKey, secretKey, supabaseUrl } from "./env.ts";

/** Client with the secret key: bypasses RLS. Only for server-side RPCs granted to service_role. */
export function adminClient() {
  return createClient(supabaseUrl(), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client that acts as the caller (their JWT), so `auth.uid()` inside the RPC is the real user. */
export function userClient(authHeader: string) {
  return createClient(supabaseUrl(), publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
}
