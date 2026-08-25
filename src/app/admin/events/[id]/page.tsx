import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/supabase/auth';
import { getAdminEvent, getAdminReference } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import EventForm from '@/components/admin/EventForm';
import DangerZone from '@/components/admin/DangerZone';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EditEventPage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const session = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;

  const [result, reference] = await Promise.all([getAdminEvent(id), getAdminReference()]);
  if (!result) notFound();

  const { event, categoryIds } = result;

  return (
    <>
      <PageHead title={event.title} eyebrow="Edit event" crumb="Event" />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <EventForm eventId={event.id} slug={event.slug} saved={Boolean(sp.saved)}
            categories={reference.categories} organizers={reference.organizers}
            defaults={{ ...event, category_ids: categoryIds }} />

          {session.profile.role === 'admin' ? (
            <DangerZone eventId={event.id} eventTitle={event.title} />
          ) : null}
        </div>
      </section>
    </>
  );
}
