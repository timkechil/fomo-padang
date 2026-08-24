import { THEMES, themeFor } from '@/lib/poster';

/**
 * Event/place visual. If the team uploaded a real poster we show it;
 * otherwise we fall back to the generative typographic poster from the
 * original identity, keyed off the slug so it is stable.
 */
export default function PosterVisual({
  slug, title, kicker, main, ghostSize = '92px', posterUrl,
}: {
  slug: string;
  title: string;
  kicker?: string;
  main?: string;
  ghostSize?: string;
  posterUrl?: string | null;
}) {
  if (posterUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="poster-img" src={posterUrl} alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        <div className="poster-type" style={{ color: '#fff' }}>
          {kicker ? <span className="pt-kicker">{kicker}</span> : null}
          {main !== '' && (main || title) ? <span className="pt-main">{main ?? title}</span> : null}
        </div>
      </>
    );
  }

  const t = THEMES[themeFor(slug)];
  const words = title.split(' ');
  const ghost = (words.find((w) => w.length > 4) ?? words[0] ?? 'FOMO').toUpperCase();

  return (
    <>
      <div className="poster-img" style={{ background: t.bg }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: '-6%', top: '14%', fontFamily: 'var(--ff-display)',
            fontSize: ghostSize, lineHeight: .8, color: t.ghost, transform: 'rotate(-9deg)',
            whiteSpace: 'nowrap', letterSpacing: '-.02em',
          }}>{ghost}</div>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg,rgba(0,0,0,0) 42%,rgba(0,0,0,.42) 100%)',
          }} />
        </div>
      </div>
      <div className="poster-type" style={{ color: t.fg }}>
        {kicker ? <span className="pt-kicker">{kicker}</span> : null}
        {main !== '' && (main || title) ? <span className="pt-main">{main ?? title}</span> : null}
      </div>
    </>
  );
}
