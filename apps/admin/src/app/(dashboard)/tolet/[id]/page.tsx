import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmSubmit } from '@/components/confirm-submit';
import { StatusBadge } from '@/components/status-badge';
import {
  deleteToletListingAction,
  setToletAvailabilityAction,
  setToletStatusAction,
  toggleToletVerifiedAction,
} from '@/features/tolet/actions';
import { ToletForm } from '@/features/tolet/tolet-form';
import type { ToletFormData } from '@/features/tolet/types';
import { formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { TOLET_LISTING_STATUS_LABELS, TOLET_LISTING_STATUS_OPTIONS } from '@kse/shared';
import type { Opportunity } from '@kse/types';

const QUICK_STATUS = [
  { status: 'published', label: 'Publish now', className: 'bg-emerald-600 text-white hover:bg-emerald-500' },
  { status: 'pending_review', label: 'Send to review', className: 'bg-amber-500 text-white hover:bg-amber-400' },
  { status: 'draft', label: 'Move to draft', className: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100' },
  { status: 'archived', label: 'Archive', className: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100' },
  { status: 'rejected', label: 'Reject', className: 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100' },
] as const;

/** Admin edit Bachelor To-Let listing (spec bachelor-to-let §Admin). */
export default async function EditToletPage({
  params,
}: PageProps<'/tolet/[id]'>) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .eq('type', 'tolet')
    .single();

  if (error || !data) {
    notFound();
  }

  const listing = data as Opportunity;
  const formData: ToletFormData = {
    id: listing.id,
    type: 'tolet',
    title: listing.title,
    organization_name: listing.organization_name ?? '',
    summary: listing.summary ?? '',
    description: listing.description ?? '',
    image_url: listing.image_url ?? '',
    image_urls: listing.image_urls ?? [],
    location: listing.location ?? '',
    city: listing.city ?? '',
    area: listing.area ?? '',
    room_type: (listing.room_type ?? '') as ToletFormData['room_type'],
    gender_preference: (listing.gender_preference ?? '') as ToletFormData['gender_preference'],
    rent_amount: listing.rent_amount === null ? '' : String(listing.rent_amount),
    rent_currency: listing.rent_currency ?? '',
    total_rooms: listing.total_rooms === null ? '' : String(listing.total_rooms),
    available_rooms: listing.available_rooms === null ? '' : String(listing.available_rooms),
    floor: listing.floor === null ? '' : String(listing.floor),
    bachelor_friendly: listing.bachelor_friendly,
    utilities_included: listing.utilities_included,
    available_from: listing.available_from ?? '',
    landlord_phone: listing.landlord_phone ?? '',
    whatsapp: listing.whatsapp ?? '',
    contact_email: listing.contact_email ?? '',
    application_url: listing.application_url ?? '',
    listing_status: listing.listing_status,
    status: listing.status,
    verified: listing.verified,
    source_name: listing.source_name ?? '',
    source_url: listing.source_url ?? '',
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/tolet" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Bachelor To-Let
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {listing.title}
          </h1>
          <StatusBadge status={listing.status} />
          {listing.verified ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Verified
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {[listing.area, listing.city].filter(Boolean).join(', ')} · updated{' '}
          {formatDateTime(listing.updated_at)}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {QUICK_STATUS.filter((action) => action.status !== listing.status).map(
          (action) => (
            <form key={action.status} action={setToletStatusAction}>
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="status" value={action.status} />
              <button
                type="submit"
                className={`h-9 rounded-lg px-4 text-sm font-medium transition ${action.className}`}
              >
                {action.label}
              </button>
            </form>
          ),
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Verify listing</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Verified listings show the ✓ Verified badge in the mobile app.
          </p>
          <form action={toggleToletVerifiedAction} className="mt-3">
            <input type="hidden" name="id" value={listing.id} />
            <input
              type="hidden"
              name="verified"
              value={listing.verified ? '' : 'on'}
            />
            <button
              type="submit"
              className={`h-9 rounded-lg px-4 text-sm font-medium transition ${
                listing.verified
                  ? 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {listing.verified ? 'Unverify' : 'Mark verified'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Room availability</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Current:{' '}
            <strong>
              {TOLET_LISTING_STATUS_LABELS[listing.listing_status]}
            </strong>
          </p>
          <form action={setToletAvailabilityAction} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={listing.id} />
            <select
              name="listing_status"
              defaultValue={listing.listing_status}
              className="h-9 flex-1 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
            >
              {TOLET_LISTING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Update
            </button>
          </form>
        </div>
      </div>

      <ToletForm listing={formData} />

      <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-800">Danger zone</h2>
        <p className="mt-1 text-sm text-red-600">
          Deleting removes the listing permanently. Use Archive instead if the
          student may want to re-list later.
        </p>
        <form action={deleteToletListingAction} className="mt-3">
          <input type="hidden" name="id" value={listing.id} />
          <ConfirmSubmit
            label="Delete listing"
            message={`Delete "${listing.title}" permanently?`}
            className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500"
          />
        </form>
      </div>
    </div>
  );
}
