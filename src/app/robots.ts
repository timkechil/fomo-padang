import type { MetadataRoute } from 'next';

import { siteUrl as resolveSiteUrl } from '@/lib/site-url';

const siteUrl = resolveSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/plan'] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
