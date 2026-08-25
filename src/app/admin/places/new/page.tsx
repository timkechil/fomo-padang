import { requireStaff } from '@/lib/supabase/auth';
import { getAdminReference } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import PlaceForm from '@/components/admin/PlaceForm';

export const dynamic = 'force-dynamic';

export default async function NewPlacePage() {
  await requireStaff();
  const { categories } = await getAdminReference();

  return (
    <>
      <PageHead title="Tempat baru" eyebrow="Tempat" crumb="Tempat" />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <PlaceForm categories={categories.filter((c) => c.type === 'place')} />
        </div>
      </section>
    </>
  );
}
