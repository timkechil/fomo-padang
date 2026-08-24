export default function Marquee({ line }: { line: string }) {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        <span>{line}</span>
        <span>{line}</span>
      </div>
    </div>
  );
}
