import Link from 'next/link';
import type { ReactNode } from 'react';

export default function EmptyState({
  title, children, action,
}: { title: string; children?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action ? (
        <Link className="btn btn-primary" style={{ marginTop: 16 }} href={action.href}>{action.label}</Link>
      ) : null}
    </div>
  );
}
