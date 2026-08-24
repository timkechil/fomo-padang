'use client';

import { useEffect, useState } from 'react';

export const TOAST_EVENT = 'fomo:toast';

export function toast(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

export default function ToastHost() {
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      setShow(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 2400);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => {
      window.removeEventListener(TOAST_EVENT, handler);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`toast${show ? ' show' : ''}`} role="status" aria-live="polite">{message}</div>
  );
}
