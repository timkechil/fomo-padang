import type { Metadata } from 'next';
import MapExplorer from '@/components/MapExplorer';
import { getCategories, getMapPins } from '@/lib/queries';
import type { PublicFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Peta acara Padang',
  description: 'Lihat acara dan tempat di Padang langsung di peta.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;

  const filters: PublicFilters = {
    date: one('date') ?? 'semua',
    cat: one('cat') ?? 'semua',
    price: (one('price') as PublicFilters['price']) ?? 'all',
  };

  const [pins, categories] = await Promise.all([
    getMapPins({ ...filters, includePlaces: true }),
    getCategories('event'),
  ]);

  return <MapExplorer pins={pins} categories={categories} />;
}
