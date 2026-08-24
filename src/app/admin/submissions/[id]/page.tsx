import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/supabase/auth';
import { getSubmission, getAdminReference } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import ReviewSubmission from '@/components/admin/ReviewSubmission';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function ReviewPage({ params }: { params: Params }) {
  await requireStaff();
  const { id } = await params;

  const [submission, reference] = await Promise.all([getSubmission(id), getAdminReference()]);
  if (!submission) notFound();

  return (
    <>
      <PageHead title={submission.event_name} eyebrow={`Review ${submission.submission_code}`}
        crumb="Kiriman komunitas" />
      <ReviewSubmission submission={submission} categories={reference.categories}
        organizers={reference.organizers} />
    </>
  );
}
