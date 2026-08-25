import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieList = { name: string; value: string; options?: CookieOptions }[];

/**
 * Refreshes the Supabase session cookie on every request and gates /admin.
 * The gate here is a convenience redirect — the real authorization lives in
 * RLS policies and in requireStaff() on each page and action.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // NEXT_PUBLIC_* values are inlined at build time. If a deployment is built
  // without them, createServerClient throws — and because this middleware
  // matches every route, that would turn a config mistake into a site-wide 500.
  // Degrade instead: public pages still render, and /admin still fails closed.
  if (!url || !anonKey) {
    const path = request.nextUrl.pathname;
    if (path.startsWith('/admin') && path !== '/admin/login') {
      const to = request.nextUrl.clone();
      to.pathname = '/admin/login';
      to.searchParams.set('next', path);
      return NextResponse.redirect(to);
    }
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieList) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith('/admin') && path !== '/admin/login';

  if (isAdminArea && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (path === '/admin/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
