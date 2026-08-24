'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DISTRICT_CENTER } from '@/lib/constants';

/** If the visitor allows location we pick their kecamatan; otherwise the
 *  chips stay exactly as they were. Never blocks rendering. */
export default function GeoNearby({ current }: { current: string }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (window.sessionStorage.getItem('fomo.geo-asked')) return;
    window.sessionStorage.setItem('fomo.geo-asked', '1');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = Object.entries(DISTRICT_CENTER)
          .map(([name, c]) => ({ name, d: haversine([latitude, longitude], c) }))
          .sort((a, b) => a.d - b.d)[0];
        if (nearest && nearest.name !== current) {
          router.replace(`/?near=${encodeURIComponent(nearest.name)}`, { scroll: false });
        }
      },
      () => {},
      { timeout: 6000, maximumAge: 600000 },
    );
  }, [current, router]);

  return null;
}

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
