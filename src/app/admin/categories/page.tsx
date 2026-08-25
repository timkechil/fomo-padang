import { requireStaff } from '@/lib/supabase/auth';
import { getAdminReference, countCategoryUsage } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import CategoryManager from '@/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await requireStaff();
  const [{ categories }, usage] = await Promise.all([
    getAdminReference(),
    countCategoryUsage(),
  ]);

  return (
    <>
      <PageHead title="Kategori" eyebrow="Event & tempat" />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <CategoryManager categories={categories} usage={Object.fromEntries(usage)} />
        </div>
      </section>
    </>
  );
}
