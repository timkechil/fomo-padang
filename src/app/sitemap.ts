import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

import { siteUrl as resolveSiteUrl } from '@/lib/site-url';

const siteUrl = resolveSiteUrl();

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = ['', '/calendar', '/map', '/places', '/submit'].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'daily',
    priority: path === '' ? 1 : 0.7,
  }));

  try {
    const supabase = await createClient();
    const [{ data: events }, { data: places }] = await Promise.all([
      supabase.from('events').select('slug, updated_at').eq('status', 'published').limit(2000),
      supabase.from('places').select('slug, updated_at').eq('status', 'published').limit(500),
    ]);

    return [
      ...base,
      ...(events ?? []).map((e) => ({
        url: `${siteUrl}/event/${e.slug}`,
        lastModified: e.updated_at,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...(places ?? []).map((p) => ({
        url: `${siteUrl}/place/${p.slug}`,
        lastModified: p.updated_at,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return base;   // no database reachable at build time: still ship the static routes
  }
}
