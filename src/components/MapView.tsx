'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { MAP_CENTER } from '@/lib/constants';
import { fmtPrice, fmtShort, fmtTime } from '@/lib/format';
import type { MapPin } from '@/lib/types';

/**
 * Leaflet + OpenStreetMap, same marker language as the prototype.
 * Coordinates now come from Supabase (`getMapPins`), not a JSON blob.
 */
export default function MapView({
  pins, height = '100%', center = MAP_CENTER, zoom = 12, scrollWheel = true, focusId,
}: {
  pins: MapPin[];
  height?: string | number;
  center?: [number, number];
  zoom?: number;
  scrollWheel?: boolean;
  focusId?: string | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !ref.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { scrollWheelZoom: scrollWheel, zoomControl: true })
          .setView(center, zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap',
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      pins.forEach((p) => {
        const icon = L.divIcon({
          className: '', iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
          html: `<div class="fomo-marker" style="background:${p.category_color}"><span></span></div>`,
        });
        const marker = L.marker([p.latitude, p.longitude], { icon, title: p.title })
          .addTo(map)
          .bindPopup(popupHTML(p));
        marker.on('popupopen', () => {
          const el = document.querySelector<HTMLButtonElement>(`[data-pop="${p.kind}-${p.slug}"]`);
          el?.addEventListener('click', () => router.push(`/${p.kind}/${p.slug}`), { once: true });
        });
        markersRef.current[p.id] = marker;
      });

      setTimeout(() => map.invalidateSize(), 120);
    })();

    return () => { cancelled = true; };
  }, [pins, center, zoom, scrollWheel, router]);

  useEffect(() => {
    if (!focusId) return;
    const m = markersRef.current[focusId];
    if (m && mapRef.current) {
      mapRef.current.setView(m.getLatLng(), 15, { animate: true });
      m.openPopup();
    }
  }, [focusId]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  return <div ref={ref} style={{ height, width: '100%' }} role="application"
    aria-label="Peta acara dan tempat di Padang" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function popupHTML(p: MapPin) {
  const isEvent = p.kind === 'event';
  const meta = isEvent
    ? `${p.start_date ? fmtShort(p.start_date) : ''}${p.start_time ? ` · ${fmtTime(p.start_time)} WIB` : ''}`
    : 'Buka kapan aja';
  const visual = p.poster_url
    ? `<img src="${escapeHtml(p.poster_url)}" alt="" style="width:100%;height:100%;object-fit:cover">`
    : `<div style="position:absolute;inset:0;background:${p.category_color}"></div>`;

  return `
  <div class="popcard">
    <div class="pop-visual">${visual}</div>
    <div class="pop-body">
      <span class="card-cat" style="color:${p.category_color}">${escapeHtml(p.category_name ?? '')}</span>
      <h4>${escapeHtml(p.title)}</h4>
      <p class="pop-meta">
        ${escapeHtml(meta)}<br>
        ${escapeHtml(p.venue_name ?? '')}<br>
        <strong style="color:var(--ink)">${fmtPrice(p.price_type, p.price_amount)}</strong>
      </p>
      <button class="btn btn-primary btn-sm" style="margin-top:9px;width:100%"
        data-pop="${p.kind}-${escapeHtml(p.slug)}">Lihat Detail</button>
    </div>
  </div>`;
}
