'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signInAction, type ActionState } from '@/server/admin-actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
      {pending ? 'Memeriksa…' : 'Masuk'}
    </button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(signInAction, {});

  return (
    <div className="formcard">
      <h1 className="blockhead">Tim FOMO</h1>
      <p className="sec-note" style={{ marginBottom: 14 }}>
        Area moderasi. Akun dibuat manual oleh admin — tidak ada pendaftaran publik.
      </p>

      {state.message ? <div className="formnote" role="alert">{state.message}</div> : null}

      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">Kata sandi</label>
          <input id="password" name="password" type="password"
            autoComplete="current-password" required />
        </div>
        <SubmitButton />
      </form>
    </div>
  );
}
