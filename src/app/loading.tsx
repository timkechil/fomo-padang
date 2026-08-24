import { CardGridSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <p className="eyebrow">Padang</p>
          <h1>Lagi ada apa<br />di <em>Padang?</em></h1>
          <p className="sub">Cari acara, tempat, dan aktivitas yang bisa kamu lakukan hari ini.</p>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="sec-head"><h2 className="sec-title">Hari Ini di Padang</h2></div>
          <CardGridSkeleton count={4} />
        </div>
      </section>
    </>
  );
}
