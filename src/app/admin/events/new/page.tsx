import { requireStaff } from '@/lib/supabase/auth';
import { getAdminReference } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import EventForm from '@/components/admin/EventForm';
import { todayWIB } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  await requireStaff();
  const { categories, organizers } = await getAdminReference();

  return (
    <>
      <PageHead title="Event baru" eyebrow="Input manual" crumb="Event" />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <EventForm categories={categories} organizers={organizers}
            defaults={{ start_date: todayWIB(), price_type: 'free', status: 'draft' }} />
        </div>
      </section>
    </>
  );
}
