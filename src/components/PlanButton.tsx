'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toast';
import { isInPlan, togglePlan, PLAN_EVENT, type PlanItem } from '@/lib/plan';

export default function PlanButton({
  item, variant = 'icon', className,
}: { item: PlanItem; variant?: 'icon' | 'button' | 'block'; className?: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(isInPlan(item.id));
    sync();
    window.addEventListener(PLAN_EVENT, sync);
    return () => window.removeEventListener(PLAN_EVENT, sync);
  }, [item.id]);

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = togglePlan(item);
    toast(result === 'added' ? 'Masuk ke rencana kamu 👀' : 'Dihapus dari rencana kamu');
  }

  if (variant === 'icon') {
    return (
      <button type="button" className={`plan-add${on ? ' on' : ''}`} onClick={handle}
        aria-pressed={on}
        aria-label={on ? 'Hapus dari rencana' : 'Tambah ke rencana'}
        title={on ? 'Sudah di rencana kamu' : 'Tambah ke rencana'}>
        <Icon name={on ? 'check' : 'plus'} size={15} />
      </button>
    );
  }

  return (
    <button type="button" onClick={handle} aria-pressed={on}
      className={className ?? `btn btn-primary${variant === 'block' ? ' btn-block' : ''}`}>
      <Icon name={on ? 'check' : 'plus'} size={16} />
      {on ? 'Sudah di rencana' : 'Tambah ke Rencana'}
    </button>
  );
}
