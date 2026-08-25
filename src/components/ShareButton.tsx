'use client';

import Icon from './Icon';
import { toast } from './Toast';
import { canonicalUrl } from '@/lib/site-url';

/**
 * Shares the canonical URL for a specific record rather than
 * `window.location.href`, which can carry filter query params or a soft-
 * navigation URL and previously produced links that 404'd for the recipient.
 */
export default function ShareButton({
  title, text, path,
}: { title: string; text?: string; path: string }) {
  async function share() {
    const url = canonicalUrl(path);

    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? `${title} — via FOMO Padang`, url });
        return;
      } catch (err) {
        // User dismissed the sheet: that is not an error, and must not fall
        // through to a "copied" toast they did not ask for.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast('Link berhasil disalin');
    } catch {
      toast('Salin tautannya dari address bar ya.');
    }
  }

  return (
    <button className="btn" type="button" onClick={share}>
      <Icon name="share" size={16} /> Bagikan
    </button>
  );
}
