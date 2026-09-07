'use client';

import { useActionState } from 'react';

import { signInAction } from '@/features/auth/actions';
import { initialAuthActionState } from '@/features/auth/types';

/** Email + password form; submits straight to the sign-in server action. */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAction, initialAuthActionState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="admin@kse.local"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
