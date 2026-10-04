import { ConfirmSubmit } from '@/components/confirm-submit';
import { createAdminClient } from '@/lib/supabase/admin';
import { OPPORTUNITY_TYPE_OPTIONS } from '@kse/shared';

import { EntityForm } from './entity-form';
import {
  createCategoryAction,
  createDepartmentAction,
  createSkillAction,
  createSubjectAction,
  createTagAction,
  createUniversityAction,
  deleteCategoryAction,
  deleteDepartmentAction,
  deleteSkillAction,
  deleteSubjectAction,
  deleteTagAction,
  deleteUniversityAction,
} from './actions';

/**
 * Reference-row panels rendered inside the section that owns each entity
 * (the standalone Master Data page was removed): skills live with Users,
 * subjects with Tuition, opportunity categories/tags with Opportunities,
 * universities/departments with Education Institutions. Each panel fetches
 * its own rows so the host page doesn't change shape.
 */

interface NamedRow {
  id: string;
  name: string;
}

function ReferenceList<T extends NamedRow>({
  rows,
  deleteAction,
  render,
  emptyLabel,
}: {
  rows: T[];
  deleteAction: (formData: FormData) => Promise<void>;
  render: (row: T) => string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-400">
        {emptyLabel ?? 'Nothing yet — add the first row above.'}
      </p>
    );
  }
  return (
    <ul className="mt-2 divide-y divide-zinc-100">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 py-1.5 text-sm text-zinc-700"
        >
          <span className="min-w-0 truncate">{render(row)}</span>
          <form action={deleteAction} className="shrink-0">
            <input type="hidden" name="id" value={row.id} />
            <ConfirmSubmit
              label="✕"
              message={`Delete "${row.name}"? Rows referenced elsewhere will refuse.`}
              className="h-6 w-6 rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
            />
          </form>
        </li>
      ))}
    </ul>
  );
}

/** Skills students attach to their profiles — managed alongside user data. */
export async function SkillsPanel() {
  const admin = createAdminClient();
  const { data: skills } = await admin.from('skills').select('id, name').order('name');
  const rows = (skills ?? []) as unknown as NamedRow[];

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Skills</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Options students pick from when building their profiles.
      </p>
      <EntityForm
        action={createSkillAction}
        submitLabel="Add skill"
        fields={[{ name: 'name', label: 'Name', placeholder: 'React Native' }]}
      />
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {rows.length} row{rows.length === 1 ? '' : 's'}
      </p>
      <ReferenceList rows={rows} deleteAction={deleteSkillAction} render={(row) => row.name} />
    </section>
  );
}

/** Tuition subjects tutors can offer — managed with the tuition section. */
export async function SubjectsPanel() {
  const admin = createAdminClient();
  const { data: subjects } = await admin.from('subjects').select('id, name').order('name');
  const rows = (subjects ?? []) as unknown as NamedRow[];

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Subjects</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Subjects tutors pick when listing themselves. Used across tuition matching.
      </p>
      <EntityForm
        action={createSubjectAction}
        submitLabel="Add subject"
        fields={[{ name: 'name', label: 'Name', placeholder: 'Mathematics' }]}
      />
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {rows.length} row{rows.length === 1 ? '' : 's'}
      </p>
      <ReferenceList rows={rows} deleteAction={deleteSubjectAction} render={(row) => row.name} />
    </section>
  );
}

interface CategoryRow extends NamedRow {
  opportunity_type: string | null;
  sort_order: number;
}

/** Opportunity categories + free-form tags — managed with opportunities. */
export async function CategoriesTagsPanel() {
  const admin = createAdminClient();
  const [{ data: categories }, { data: tags }] = await Promise.all([
    admin
      .from('opportunity_categories')
      .select('id, name, opportunity_type, sort_order')
      .order('sort_order')
      .order('name'),
    admin.from('tags').select('id, name').order('name'),
  ]);
  const categoryRows = (categories ?? []) as unknown as CategoryRow[];
  const tagRows = (tags ?? []) as unknown as NamedRow[];

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Opportunity categories</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Shown as a dropdown when creating opportunities.
        </p>
        <EntityForm
          action={createCategoryAction}
          submitLabel="Add category"
          fields={[
            { name: 'name', label: 'Name', placeholder: 'Engineering' },
            {
              name: 'opportunity_type',
              label: 'Type (optional)',
              type: 'select',
              options: [
                { value: '', label: 'All types' },
                ...OPPORTUNITY_TYPE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ],
            },
            { name: 'sort_order', label: 'Sort order', type: 'number', placeholder: '0' },
          ]}
        />
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
          {categoryRows.length} row{categoryRows.length === 1 ? '' : 's'}
        </p>
        <ReferenceList
          rows={categoryRows}
          deleteAction={deleteCategoryAction}
          render={(row) =>
            `${row.name}${row.opportunity_type ? ` · ${row.opportunity_type}` : ''} · sort ${row.sort_order}`
          }
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Tags</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Free-form tags on opportunities; stored lowercase. Opportunities create new tags
          automatically when you type them in the form.
        </p>
        <EntityForm
          action={createTagAction}
          submitLabel="Add tag"
          fields={[{ name: 'name', label: 'Name', placeholder: 'women-in-tech' }]}
        />
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
          {tagRows.length} row{tagRows.length === 1 ? '' : 's'}
        </p>
        <ReferenceList rows={tagRows} deleteAction={deleteTagAction} render={(row) => row.name} />
      </section>
    </div>
  );
}

interface UniversityRow extends NamedRow {
  short_name: string | null;
  location: string | null;
}

interface DepartmentRow extends NamedRow {
  code: string | null;
  university: { name: string } | null;
}

/**
 * Legacy `universities` / `departments` pickers (profile university field,
 * notification targeting, community filters). Kept alongside the modern
 * education_institutions directory so both systems stay manageable.
 */
export async function UniversitiesPanel() {
  const admin = createAdminClient();
  const [{ data: universities }, { data: departments }] = await Promise.all([
    admin.from('universities').select('id, name, short_name, location').order('name'),
    admin
      .from('departments')
      .select('id, name, code, university:universities(name)')
      .order('name'),
  ]);
  const universityRows = (universities ?? []) as unknown as UniversityRow[];
  const departmentRows = (departments ?? []) as unknown as DepartmentRow[];

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Universities</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Feeds profile university pickers, notification targeting and community filters.
        </p>
        <EntityForm
          action={createUniversityAction}
          submitLabel="Add university"
          fields={[
            {
              name: 'name',
              label: 'Name',
              placeholder: 'Khulna University of Engineering & Technology',
            },
            { name: 'short_name', label: 'Short name', placeholder: 'KUET' },
            { name: 'location', label: 'Location', placeholder: 'Khulna', wide: true },
          ]}
        />
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
          {universityRows.length} row{universityRows.length === 1 ? '' : 's'}
        </p>
        <ReferenceList
          rows={universityRows}
          deleteAction={deleteUniversityAction}
          render={(row) =>
            `${row.name}${row.short_name ? ` (${row.short_name})` : ''}${row.location ? ` — ${row.location}` : ''}`
          }
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Departments</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Attached to a university; shown on profiles.</p>
        <EntityForm
          action={createDepartmentAction}
          submitLabel="Add department"
          fields={[
            { name: 'name', label: 'Name', placeholder: 'Computer Science & Engineering' },
            {
              name: 'university_id',
              label: 'University',
              type: 'select',
              options: [
                { value: '', label: 'Choose a university…' },
                ...universityRows.map((row) => ({ value: row.id, label: row.name })),
              ],
            },
            { name: 'code', label: 'Code', placeholder: 'CSE', wide: true },
          ]}
        />
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
          {departmentRows.length} row{departmentRows.length === 1 ? '' : 's'}
        </p>
        <ReferenceList
          rows={departmentRows}
          deleteAction={deleteDepartmentAction}
          render={(row) =>
            `${row.name}${row.university ? ` — ${row.university.name}` : ''}${row.code ? ` (${row.code})` : ''}`
          }
        />
      </section>
    </div>
  );
}
