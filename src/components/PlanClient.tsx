'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toast';
import {
  clearPlan, getPlan, groupPlan, movePlanItem, PLAN_EVENT, removeFromPlan, updateNote,
  type PlanItem,
} from '@/lib/plan';
import { fmtLong } from '@/lib/format';

export default function PlanClient() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setItems(getPlan());
    sync();
    setReady(true);
    window.addEventListener(PLAN_EVENT, sync);
    return () => window.removeEventListener(PLAN_EVENT, sync);
  }, []);

  const groups = groupPlan(items);
  const days = Object.keys(groups).sort();

  function planText() {
    let out = '';
    for (const d of days) {
      out += `${fmtLong(d)}\n`;
      for (const p of groups[d]) {
        out += `${p.time ? `${p.time} — ` : '• '}${p.title}${p.note ? ` (${p.note})` : ''}\n`;
      }
      out += '\n';
    }
    return `${out}via FOMO Padang — fomopadang.id`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(planText());
      toast('Rencana disalin. Tinggal tempel ke chat.');
    } catch {
      toast('Belum bisa menyalin di browser ini.');
    }
  }

  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Rencana ${days[0] ? fmtLong(days[0]) : 'FOMO Padang'}`,
          items: items.map((p, i) => ({
            kind: p.kind, slug: p.slug, day_date: p.date,
            time_label: p.time ?? '', note: p.note, position: i,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'gagal');
      const url = `${window.location.origin}/plan/${json.share_id}`;
      setShareUrl(url);
      try {
        if (navigator.share) await navigator.share({ title: 'Rencana FOMO Padang', url });
        else { await navigator.clipboard.writeText(url); toast('Tautan rencana disalin.'); }
      } catch { /* user dismissed the share sheet */ }
    } catch {
      toast('Yah, tautannya belum bisa dibuat. Coba lagi sebentar ya.');
    } finally {
      setSharing(false);
    }
  }

  if (!ready) return null;

  if (!items.length) {
    return (
      <div className="empty">
        <h3>Rencana kamu masih kosong</h3>
        <p>Buka acara mana pun, tekan <strong>Tambah ke Rencana</strong>, dan susun harimu di sini.</p>
        <Link className="btn btn-primary" style={{ marginTop: 16 }} href="/">Mulai dari Explore</Link>
      </div>
    );
  }

  return (
    <>
      <div className="sec-head">
        <h2 className="sec-title">{items.length} aktivitas tersimpan</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={copy}><Icon name="copy" size={16} /> Salin Rencana</button>
          <button className="btn" onClick={share} disabled={sharing}>
            <Icon name="share" size={16} /> {sharing ? 'Membuat tautan…' : 'Bagikan'}
          </button>
          <button className="btn" onClick={() => { clearPlan(); toast('Rencana dikosongkan'); }}>
            Kosongkan
          </button>
        </div>
      </div>

      {shareUrl ? (
        <div className="formnote ok">
          Tautan rencana kamu: <a href={shareUrl} style={{ textDecoration: 'underline' }}>{shareUrl}</a>
        </div>
      ) : null}

      {days.map((d) => (
        <div className="planday" key={d}>
          <div className="planday-head">
            <span>{fmtLong(d)}</span>
            <span>{groups[d].length} aktivitas</span>
          </div>
          {groups[d].map((p, idx) => (
            <div className="planitem" key={p.id}>
              <span className="pi-time">{p.time || '—'}</span>
              <div className="pi-main">
                <h4><Link href={`/${p.kind}/${p.slug}`}>{p.title}</Link></h4>
                <p>{[p.venue, p.district].filter(Boolean).join(' · ')}</p>
                <input className="note" defaultValue={p.note}
                  placeholder="Catatan buat kamu sendiri — misal: ketemu Rian di gate 2"
                  onChange={(e) => updateNote(p.id, e.target.value)} />
              </div>
              <div className="pi-tools">
                <button className="tool" aria-label="Naikkan urutan" disabled={idx === 0}
                  onClick={() => movePlanItem(p.id, -1)}><Icon name="up" size={14} /></button>
                <button className="tool" aria-label="Turunkan urutan" disabled={idx === groups[d].length - 1}
                  onClick={() => movePlanItem(p.id, 1)}><Icon name="down" size={14} /></button>
                <button className="tool del" aria-label="Hapus dari rencana"
                  onClick={() => { removeFromPlan(p.id); toast('Dihapus dari rencana kamu'); }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="sidebox" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Pratinjau teks yang disalin
        </h3>
        <pre style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 13.5, whiteSpace: 'pre-wrap',
          margin: 0, color: 'var(--ink-soft)' }}>{planText()}</pre>
        <p className="sec-note" style={{ marginTop: 10 }}>
          Rencana ini tersimpan di perangkat kamu. Tombol Bagikan membuat salinan publik yang bisa
          dibuka siapa pun lewat tautan.
        </p>
      </div>
    </>
  );
}
