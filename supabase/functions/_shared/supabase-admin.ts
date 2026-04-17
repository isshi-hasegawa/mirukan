import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type SupabaseAdminClient = SupabaseClient;

function createSupabaseAdminClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseAdminClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let cachedClient: SupabaseAdminClient | null = null;

export function getSupabaseAdminClient(): SupabaseAdminClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  cachedClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);

  return cachedClient;
}
