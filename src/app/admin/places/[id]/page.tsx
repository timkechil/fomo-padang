import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/supabase/auth';
import { getAdminPlace, getAdminReference } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import PlaceForm from '@/components/admin/PlaceForm';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EditPlacePage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;

  const [place, { categories }] = await Promise.all([getAdminPlace(id), getAdminReference()]);
  if (!place) notFound();

  return (
    <>
      <PageHead title={place.name} eyebrow="Edit tempat" crumb="Tempat" />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <PlaceForm place={place} saved={Boolean(sp.saved)}
            categories={categories.filter((c) => c.type === 'place')} />
        </div>
      </section>
    </>
  );
}
