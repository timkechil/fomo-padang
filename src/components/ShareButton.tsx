'use client';

import Icon from './Icon';
import { toast } from './Toast';

export default function ShareButton({ title, text }: { title: string; text?: string }) {
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: text ?? `${title} — via FOMO Padang`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Tautan disalin. Tinggal tempel di WhatsApp.');
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
