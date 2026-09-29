import { ConfirmSubmit } from '@/components/confirm-submit';
import { createAdminClient } from '@/lib/supabase/admin';

import { moveHubCategoryAction, saveHubCategoryAction } from '@/features/hub/actions';

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

/**
 * Category management (spec student-hub §18): create, edit, reorder,
 * enable/disable — the mobile app renders whatever categories exist.
 */
export default async function HubCategoriesPage() {
  const admin = createAdminClient();
  const { data: categories } = await admin
    .from('student_hub_categories')
    .select('*')
    .order('sort_order');

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Student Hub categories
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Categories drive the mobile hub screen — nothing is hardcoded in the app.
        Icons are Ionicons names rendered with a safe fallback.
      </p>

      <div className="mt-6 space-y-4">
        {(categories ?? []).map((c) => (
          <form
            key={c.id}
            action={saveHubCategoryAction}
            className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input type="hidden" name="id" value={c.id} />
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Name
              <input name="name" defaultValue={c.name} required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Slug
              <input name="slug" defaultValue={c.slug} required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Icon (Ionicons)
              <input name="icon" defaultValue={c.icon} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Sort order
              <input
                name="sort_order"
                defaultValue={c.sort_order}
                inputMode="numeric"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 sm:col-span-2">
              Description
              <input name="description" defaultValue={c.description ?? ''} className={inputClass} />
            </label>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  name="features"
                  value="book_exchange"
                  defaultChecked={c.features?.includes('book_exchange')}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Book Exchange link
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  name="features"
                  value="research_partners"
                  defaultChecked={c.features?.includes('research_partners')}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Research Partners link
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={c.is_active}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Active
              </label>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Save
              </button>
            </div>
          </form>
        ))}

        {/* Reorder controls */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <span className="text-sm font-medium text-zinc-600">Reorder:</span>
          {(categories ?? []).map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <span className="text-xs text-zinc-500">{c.name}</span>
              <form action={moveHubCategoryAction} className="flex gap-0.5">
                <input type="hidden" name="id" value={c.id} />
                <button
                  name="delta"
                  value={-1}
                  className="rounded border border-zinc-300 bg-white px-1.5 text-xs"
                  aria-label={`Move ${c.name} up`}
                >
                  ↑
                </button>
                <button
                  name="delta"
                  value={1}
                  className="rounded border border-zinc-300 bg-white px-1.5 text-xs"
                  aria-label={`Move ${c.name} down`}
                >
                  ↓
                </button>
              </form>
            </span>
          ))}
        </div>

        {/* New category */}
        <form
          action={saveHubCategoryAction}
          className="grid gap-3 rounded-xl border border-dashed border-zinc-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            New name
            <input name="name" required placeholder="e.g. Health" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Slug
            <input name="slug" required placeholder="health" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Icon (Ionicons)
            <input name="icon" defaultValue="grid-outline" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Sort order
            <input name="sort_order" defaultValue={99} inputMode="numeric" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 sm:col-span-2">
            Description
            <input name="description" placeholder="Short subtitle shown on the card" className={inputClass} />
          </label>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="h-4 w-4 rounded border-zinc-300"
              />
              Active
            </label>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <ConfirmSubmit
              className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
              label="Create category"
              message="Create this category?"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
