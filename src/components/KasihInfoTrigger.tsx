'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/**
 * V1.4 §2 — one universal contribution entry point.
 *
 * "Kasih Info" used to go straight to the event form, so people who wanted to
 * recommend a place had to find the Tempat tab first. It now opens a small
 * chooser and routes to the existing forms — /submit and /submit-place are
 * untouched, as is everything inside them.
 *
 * Purely local UI: no Supabase call, no route change, no history entry until a
 * choice is made, so opening it is instant.
 */

const OPTIONS = [
  {
    href: '/submit',
    label: 'Event',
    desc: 'Acara, kegiatan, workshop, konser, komunitas, dan lainnya.',
    icon: 'calendar',
  },
  {
    href: '/submit-place',
    label: 'Tempat',
    desc: 'Tempat makan, nongkrong, spot lokal, toko oleh-oleh, dan lainnya.',
    icon: 'store',
  },
] as const;

export default function KasihInfoTrigger({
  variant = 'fab',
}: { variant?: 'fab' | 'nav' }) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstOptionRef = useRef<HTMLAnchorElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    firstOptionRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      // Keep focus inside the dialog while it is open.
      const focusables = sheetRef.current?.querySelectorAll<HTMLElement>('a[href], button');
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    // Lock the background without letting the page jump.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <>
      {variant === 'fab' ? (
        <button ref={triggerRef} type="button" className="fab"
          aria-haspopup="dialog" aria-expanded={open}
          onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} /> Kasih Info
        </button>
      ) : (
        <button ref={triggerRef} type="button" className="navcta"
          aria-haspopup="dialog" aria-expanded={open}
          onClick={() => setOpen(true)}>
          Kasih Info
        </button>
      )}

      {open ? (
        <div className="sheet-backdrop" onClick={close}>
          <div
            ref={sheetRef}
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kasihinfo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <h2 id="kasihinfo-title">Kasih Info Apa?</h2>
                <p>Pilih info yang mau kamu tambahkan.</p>
              </div>
              <button type="button" className="sheet-close" onClick={close} aria-label="Tutup">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="sheet-options">
              {OPTIONS.map((o, i) => (
                <Link
                  key={o.href}
                  href={o.href}
                  className="sheet-option"
                  ref={i === 0 ? firstOptionRef : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="so-icon"><Icon name={o.icon} size={20} /></span>
                  <span className="so-text">
                    <span className="so-label">{o.label}</span>
                    <span className="so-desc">{o.desc}</span>
                  </span>
                  <span className="so-arrow"><Icon name="arrow" size={16} /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
