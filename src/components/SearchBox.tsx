'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <form className="searchbar" onSubmit={submit} role="search">
      <input id="q" type="search" name="q" value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="Cari event, tempat, komunitas..." aria-label="Cari event, tempat, atau komunitas" />
      <button type="submit">Cari</button>
    </form>
  );
}
