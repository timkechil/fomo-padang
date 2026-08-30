import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/supabase/auth';
import { getPlaceSubmission, getAdminReference } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import ReviewPlaceSubmission from '@/components/admin/ReviewPlaceSubmission';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function ReviewPlacePage({ params }: { params: Params }) {
  await requireStaff();
  const { id } = await params;

  const [submission, reference] = await Promise.all([getPlaceSubmission(id), getAdminReference()]);
  if (!submission) notFound();

  return (
    <>
      <PageHead title={submission.place_name} eyebrow={`Review ${submission.submission_code}`}
        crumb="Rekomendasi tempat" />
      <ReviewPlaceSubmission submission={submission}
        categories={reference.categories.filter((c) => c.type === 'place')} />
    </>
  );
}
