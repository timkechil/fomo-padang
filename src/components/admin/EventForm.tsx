'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import EventFields, { type EventDefaults } from './EventFields';
import { saveEventAction, type ActionState } from '@/server/admin-actions';
import type { CategoryRow, OrganizerRow } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Menyimpan…' : 'Simpan'}
    </button>
  );
}

export default function EventForm({
  defaults, categories, organizers, eventId, slug, saved,
}: {
  defaults: EventDefaults;
  categories: CategoryRow[];
  organizers: OrganizerRow[];
  eventId?: string;
  slug?: string;
  saved?: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveEventAction, {});

  return (
    <form action={action} className="formcard">
      {eventId ? <input type="hidden" name="event_id" value={eventId} /> : null}
      {slug ? <input type="hidden" name="current_slug" value={slug} /> : null}

      {saved && !state.message ? <div className="formnote ok">Perubahan tersimpan.</div> : null}
      {state.message ? <div className="formnote" role="alert">{state.message}</div> : null}

      <EventFields defaults={defaults} categories={categories} organizers={organizers}
        errors={state.errors} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        <SaveButton />
        {slug ? (
          <Link className="btn" href={`/event/${slug}`} target="_blank">Pratinjau publik</Link>
        ) : null}
        <Link className="btn" href="/admin/events">Kembali</Link>
      </div>
    </form>
  );
}
