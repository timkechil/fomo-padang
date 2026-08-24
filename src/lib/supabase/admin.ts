import 'server-only';

import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS.
 *
 * Import rules:
 *   - only inside route handlers, server actions, and scripts;
 *   - never from a component that can be rendered on the client.
 * The `server-only` import above turns a mistake into a build error rather
 * than a leaked key.
 *
 * Currently used for exactly two things:
 *   1. inserting anonymous community submissions after server-side validation
 *   2. the seed script
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'fomo-padang-server' } },
  });
}
