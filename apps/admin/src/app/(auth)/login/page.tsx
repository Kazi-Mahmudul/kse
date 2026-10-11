import type { Metadata } from 'next';

import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in — Shujog Admin',
};

export default function LoginPage() {
  return (
    <main className="w-full max-w-sm">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
          <img src="/logo.png" alt="Shujog" className="size-11 rounded-xl" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Shujog Admin
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Sign in to the content management portal
            </p>
          </div>
        </div>

        <LoginForm />
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400">
        Staff accounts only. Students use the Shujog mobile app.
      </p>
    </main>
  );
}
