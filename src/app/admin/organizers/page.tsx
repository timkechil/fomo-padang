import { requireStaff } from '@/lib/supabase/auth';
import { getAdminReference, countOrganizerEvents } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import OrganizerManager from '@/components/admin/OrganizerManager';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizersPage() {
  await requireStaff();
  const [{ organizers }, counts] = await Promise.all([
    getAdminReference(),
    countOrganizerEvents(),
  ]);

  return (
    <>
      <PageHead title="Penyelenggara" eyebrow="Komunitas, brand, instansi" />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <OrganizerManager
            organizers={organizers}
            counts={Object.fromEntries(counts)} />
        </div>
      </section>
    </>
  );
}
