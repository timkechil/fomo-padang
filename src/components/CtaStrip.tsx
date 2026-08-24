import Link from 'next/link';
import Icon from './Icon';

export default function CtaStrip() {
  return (
    <section className="cta-strip">
      <div className="wrap" style={{ display: 'flex', gap: 26, justifyContent: 'space-between',
        alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <h2>Ada event yang belum masuk FOMO?</h2>
          <p style={{ marginTop: 12, fontWeight: 600, maxWidth: '44ch' }}>
            Kasih tahu kami. Kamu kirim infonya, tim FOMO yang cek sebelum tayang. Nggak perlu bikin akun.
          </p>
        </div>
        <Link className="btn btn-ink" href="/submit"><Icon name="send" size={16} /> Kasih Info Event</Link>
      </div>
    </section>
  );
}
