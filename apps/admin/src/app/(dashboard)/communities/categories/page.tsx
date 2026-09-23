import { createAdminClient } from '@/lib/supabase/admin';
import {
  CategoryForm,
  DeleteCategoryButton,
} from '@/features/communities/categories-form';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  communities: { id: string }[];
}

/**
 * Community categories (spec §Community structure) — master-data style CRUD.
 * Deleting a category keeps communities (category_id becomes null).
 */
export default async function CommunityCategoriesPage() {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('community_categories')
    .select('id, name, slug, sort_order, communities(id)')
    .order('sort_order');

  const categories = (rows ?? []) as unknown as CategoryRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Community categories
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        University, Department, Career, Skills and Interest ship by default.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Add category</h2>
            <CategoryForm />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            {error ? (
              <p className="p-6 text-sm text-red-600">
                Could not load categories: {error.message}
              </p>
            ) : categories.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500">
                No categories yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Communities</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {category.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">/{category.slug}</td>
                      <td className="px-4 py-3 text-zinc-500">{category.sort_order}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {category.communities.length}
                      </td>
                      <td className="px-4 py-3">
                        <DeleteCategoryButton categoryId={category.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
