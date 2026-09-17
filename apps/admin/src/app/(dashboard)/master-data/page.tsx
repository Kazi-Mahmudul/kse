import { ConfirmSubmit } from '@/components/confirm-submit';
import { EntityForm } from '@/features/master-data/entity-form';
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
} from '@/features/master-data/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { OPPORTUNITY_TYPE_OPTIONS } from '@kse/shared';

interface NamedRow {
  id: string;
  name: string;
}

interface UniversityRow extends NamedRow {
  short_name: string | null;
  location: string | null;
}

interface DepartmentRow extends NamedRow {
  code: string | null;
  university: { name: string } | null;
}

interface CategoryRow extends NamedRow {
  opportunity_type: string | null;
  sort_order: number;
}

function Section({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      {children}
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {count} row{count === 1 ? '' : 's'}
      </p>
    </section>
  );
}

function RowList<T extends NamedRow>({
  rows,
  deleteAction,
  render,
}: {
  rows: T[];
  deleteAction: (formData: FormData) => Promise<void>;
  render: (row: T) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">Nothing yet — add the first row above.</p>;
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

/** Master data hub (spec §7): universities, departments, subjects, skills,
 *  opportunity categories and tags. Writes go through the service role —
 *  these tables have no client write policies by design. */
export default async function MasterDataPage() {
  const admin = createAdminClient();
  const [
    { data: universities },
    { data: departments },
    { data: subjects },
    { data: skills },
    { data: categories },
    { data: tags },
  ] = await Promise.all([
    admin.from('universities').select('id, name, short_name, location').order('name'),
    admin
      .from('departments')
      .select('id, name, code, university:universities(name)')
      .order('name'),
    admin.from('subjects').select('id, name').order('name'),
    admin.from('skills').select('id, name').order('name'),
    admin
      .from('opportunity_categories')
      .select('id, name, opportunity_type, sort_order')
      .order('sort_order')
      .order('name'),
    admin.from('tags').select('id, name').order('name'),
  ]);

  const universityRows = (universities ?? []) as unknown as UniversityRow[];
  const departmentRows = (departments ?? []) as unknown as DepartmentRow[];
  const subjectRows = (subjects ?? []) as unknown as NamedRow[];
  const skillRows = (skills ?? []) as unknown as NamedRow[];
  const categoryRows = (categories ?? []) as unknown as CategoryRow[];
  const tagRows = (tags ?? []) as unknown as NamedRow[];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Master data
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Reference rows shared across the app. Deleting a row that is still
          referenced (a university with profiles attached, a category on an
          opportunity) is refused by the database.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Universities"
          description="Feeds profile university pickers, notification targeting and community filters."
          count={universityRows.length}
        >
          <EntityForm
            action={createUniversityAction}
            submitLabel="Add university"
            fields={[
              { name: 'name', label: 'Name', placeholder: 'Khulna University of Engineering & Technology' },
              { name: 'short_name', label: 'Short name', placeholder: 'KUET' },
              { name: 'location', label: 'Location', placeholder: 'Khulna', wide: true },
            ]}
          />
          <RowList
            rows={universityRows}
            deleteAction={deleteUniversityAction}
            render={(row) =>
              `${row.name}${row.short_name ? ` (${row.short_name})` : ''}${row.location ? ` — ${row.location}` : ''}`
            }
          />
        </Section>

        <Section
          title="Departments"
          description="Attached to a university; shown on profiles."
          count={departmentRows.length}
        >
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
          <RowList
            rows={departmentRows}
            deleteAction={deleteDepartmentAction}
            render={(row) =>
              `${row.name}${row.university ? ` — ${row.university.name}` : ''}${row.code ? ` (${row.code})` : ''}`
            }
          />
        </Section>

        <Section
          title="Subjects"
          description="Tuition subjects tutors can pick."
          count={subjectRows.length}
        >
          <EntityForm
            action={createSubjectAction}
            submitLabel="Add subject"
            fields={[{ name: 'name', label: 'Name', placeholder: 'Mathematics' }]}
          />
          <RowList
            rows={subjectRows}
            deleteAction={deleteSubjectAction}
            render={(row) => row.name}
          />
        </Section>

        <Section
          title="Skills"
          description="Skills students add to their profiles."
          count={skillRows.length}
        >
          <EntityForm
            action={createSkillAction}
            submitLabel="Add skill"
            fields={[{ name: 'name', label: 'Name', placeholder: 'React Native' }]}
          />
          <RowList
            rows={skillRows}
            deleteAction={deleteSkillAction}
            render={(row) => row.name}
          />
        </Section>

        <Section
          title="Opportunity categories"
          description="Shown as a dropdown when creating opportunities."
          count={categoryRows.length}
        >
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
          <RowList
            rows={categoryRows}
            deleteAction={deleteCategoryAction}
            render={(row) =>
              `${row.name}${row.opportunity_type ? ` · ${row.opportunity_type}` : ''} · sort ${row.sort_order}`
            }
          />
        </Section>

        <Section
          title="Tags"
          description="Free-form tags on opportunities; stored lowercase."
          count={tagRows.length}
        >
          <EntityForm
            action={createTagAction}
            submitLabel="Add tag"
            fields={[{ name: 'name', label: 'Name', placeholder: 'women-in-tech' }]}
          />
          <RowList rows={tagRows} deleteAction={deleteTagAction} render={(row) => row.name} />
        </Section>
      </div>
    </div>
  );
}
