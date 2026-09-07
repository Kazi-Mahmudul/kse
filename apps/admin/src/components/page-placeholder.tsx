/** Placeholder for admin sections landing in later roadmap steps. */
export function PagePlaceholder({
  title,
  description,
  step,
}: {
  title: string;
  description: string;
  step: number;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
        <p className="text-sm text-zinc-600">{description}</p>
        <p className="mt-2 text-xs text-zinc-400">Planned for roadmap step {step}.</p>
      </div>
    </div>
  );
}
