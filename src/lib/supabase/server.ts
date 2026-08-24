import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieList = { name: string; value: string; options?: CookieOptions }[];

/**
 * Server client bound to the visitor's cookies.
 * Anonymous visitors get the anon role; signed-in staff get their own identity.
 * RLS does the rest — this client is never privileged.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieList) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component: the middleware refreshes the session instead
          }
        },
      },
    },
  );
}
