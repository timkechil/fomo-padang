import { redirect } from 'next/navigation';
import { createClient } from './server';
import type { ProfileRow, StaffRole } from '@/lib/types';

export interface StaffSession {
  userId: string;
  email: string | null;
  profile: ProfileRow;
}

/** Returns the staff session, or null for visitors and signed-in non-staff. */
export async function getStaffSession(): Promise<StaffSession | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;
  const role = (profile as ProfileRow).role;
  if (role !== 'admin' && role !== 'editor') return null;

  return { userId: user.id, email: user.email ?? null, profile: profile as ProfileRow };
}

/** Guard for every /admin page and every admin server action. */
export async function requireStaff(minimumRole: StaffRole = 'editor'): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect('/admin/login');
  if (minimumRole === 'admin' && session.profile.role !== 'admin') redirect('/admin');
  return session;
}
