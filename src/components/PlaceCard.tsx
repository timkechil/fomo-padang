import Link from 'next/link';
import PosterVisual from './PosterVisual';
import type { PlaceView } from '@/lib/types';
import { fmtPrice } from '@/lib/format';
import { SPOT_LABEL } from '@/lib/constants';

export default function PlaceCard({ place: p }: { place: PlaceView }) {
  const hours = p.opening_hours?.label ?? 'Cek jam buka';
  const price = p.admission_type === 'free' ? 'Gratis' : fmtPrice('paid', p.admission_price);

  return (
    <Link href={`/place/${p.slug}`} className="pcard" aria-label={p.name}>
      <div className="pc-visual">
        <PosterVisual slug={p.slug} title={p.name} kicker="" main="" ghostSize="54px"
          posterUrl={p.cover_image_url} />
      </div>
      <div className="pc-body">
        <span className="pc-tag">
          {p.category?.name ?? SPOT_LABEL} · {p.district ?? 'Padang'}
        </span>
        <h3>{p.name}</h3>
        <span className="pc-meta">
          {hours} · {price}
          {p.status === 'temporarily_closed' ? ' · Tutup sementara' : ''}
        </span>
      </div>
    </Link>
  );
}
