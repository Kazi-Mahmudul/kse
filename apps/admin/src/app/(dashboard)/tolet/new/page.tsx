import Link from 'next/link';

import { ToletForm } from '@/features/tolet/tolet-form';

/** Admin "New Bachelor To-Let" page. */
export default function NewToletPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/tolet" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Bachelor To-Let
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          New Bachelor To-Let listing
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Save as pending review while writing, then publish when it is ready
          (spec §21).
        </p>
      </div>

      <ToletForm />
    </div>
  );
}
