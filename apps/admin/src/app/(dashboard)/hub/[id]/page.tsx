import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmSubmit } from '@/components/confirm-submit';
import { formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { HUB_SERVICE_TYPE_LABELS } from '@kse/shared';

import { HubForm } from '@/features/hub/hub-form';
import { HubStatusBadge } from '@/features/hub/hub-status-badge';
import type { HubFormData } from '@/features/hub/types';
import {
  deleteHubListingAction,
  deleteHubOfferAction,
  saveHubOfferAction,
  setHubListingStatusAction,
  toggleHubVerifiedAction,
} from '@/features/hub/actions';

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

/** Edit a Student Hub listing + manage workflow, verification and offers. */
export default async function HubListingDetailPage({
  params,
}: PageProps<'/hub/[id]'>) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: listing, error }, { data: categories }, { data: offers }] =
    await Promise.all([
      admin.from('student_hub_listings').select('*').eq('id', id).single(),
      admin.from('student_hub_categories').select('*').order('sort_order'),
      admin.from('student_hub_offers').select('*').eq('listing_id', id).order('created_at'),
    ]);

  if (error || !listing) notFound();

  const formData: HubFormData = {
    id: listing.id,
    category_id: listing.category_id,
    name: listing.name,
    service_type: listing.service_type,
    summary: listing.summary ?? '',
    description: listing.description ?? '',
    status: listing.status,
    address: listing.address ?? '',
    area: listing.area ?? '',
    city: listing.city ?? 'Khulna',
    district: listing.district ?? '',
    latitude: listing.latitude != null ? String(listing.latitude) : '',
    longitude: listing.longitude != null ? String(listing.longitude) : '',
    phone: listing.phone ?? '',
    whatsapp: listing.whatsapp ?? '',
    email: listing.email ?? '',
    opening_hours: listing.opening_hours ?? '',
    opens_at: listing.opens_at ?? '',
    closes_at: listing.closes_at ?? '',
    price_note: listing.price_note ?? '',
    price_type: listing.price_type ?? '',
    services: listing.services ?? [],
    image_url: listing.image_url ?? '',
    image_urls: listing.image_urls ?? [],
    verified: listing.verified,
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/hub" className="text-sm text-zinc-500 transition hover:text-zinc-800">
              ← All listings
            </Link>
            <HubStatusBadge status={listing.status} />
            {listing.source === 'user_submission' ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                User submission
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {listing.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {HUB_SERVICE_TYPE_LABELS[listing.service_type as keyof typeof HUB_SERVICE_TYPE_LABELS]}
            {' · '}
            {[listing.area, listing.city].filter(Boolean).join(', ')}
            {listing.verified
              ? ` · ✓ verified ${listing.last_verified_at ? `(${formatDateTime(listing.last_verified_at)})` : ''}`
              : ' · unverified'}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <form action={toggleHubVerifiedAction}>
          <input type="hidden" name="id" value={listing.id} />
          <input type="hidden" name="verified" value={listing.verified ? 'off' : 'on'} />
          <ConfirmSubmit
            className={
              listing.verified
                ? 'h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100'
                : 'h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500'
            }
            label={listing.verified ? 'Remove verification' : '✓ Verify listing'}
            message={listing.verified ? 'Remove the verified badge from this listing?' : 'Mark this listing as verified?'}
          />
        </form>

        {listing.status !== 'published' ? (
          <form action={setHubListingStatusAction}>
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="status" value="published" />
            <ConfirmSubmit
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
              label="Publish"
              message="Publish this listing to the mobile app?"
            />
          </form>
        ) : (
          <form action={setHubListingStatusAction}>
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="status" value="suspended" />
            <ConfirmSubmit
              className="h-10 rounded-lg border border-orange-300 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              label="Suspend"
              message="Suspend this listing? It will disappear from the app until re-published."
            />
          </form>
        )}

        {listing.status === 'pending_review' ? (
          <>
            <form action={setHubListingStatusAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="status" value="rejected" />
              <input
                name="review_note"
                placeholder="Rejection note (sent to the student)"
                className={`${inputClass} w-64`}
              />
              <ConfirmSubmit
                className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                label="Reject"
                message="Reject this user submission? The student will be notified."
              />
            </form>
            <Link
              href="/hub/pending"
              className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              Review queue
            </Link>
          </>
        ) : null}

        <form action={setHubListingStatusAction}>
          <input type="hidden" name="id" value={listing.id} />
          <input type="hidden" name="status" value="archived" />
          <ConfirmSubmit
            className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
            label="Archive"
            message="Archive this listing?"
          />
        </form>

        <form action={deleteHubListingAction} className="ml-auto">
          <input type="hidden" name="id" value={listing.id} />
          <ConfirmSubmit
            className="h-10 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            label="Delete"
            message="Permanently delete this listing and its offers?"
          />
        </form>
      </div>

      {/* Offers (spec student-hub §15) */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">Student discount offers</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Expired offers stop appearing in the app automatically. Amount offers
          are entered in TAKA. The listing&apos;s discount badge syncs by trigger.
        </p>

        <div className="mt-4 space-y-3">
          {(offers ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              No offers yet — add one below.
            </p>
          ) : (
            (offers ?? []).map((offer) => {
              const expired =
                offer.valid_until != null && offer.valid_until < new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={offer.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {offer.title}
                      {!offer.is_active ? (
                        <span className="ml-2 text-xs text-zinc-400">inactive</span>
                      ) : null}
                      {expired ? (
                        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          expired {offer.valid_until}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {offer.discount_kind === 'percent'
                        ? `${offer.discount_value}% off`
                        : offer.discount_kind === 'amount' && offer.discount_value != null
                          ? `BDT ${(offer.discount_value / 100).toLocaleString('en-IN')} off`
                          : 'Special offer'}
                      {offer.applies_to ? ` · ${offer.applies_to}` : ''}
                      {offer.student_id_required ? ' · student ID required' : ''}
                      {offer.valid_until ? ` · until ${offer.valid_until}` : ''}
                    </p>
                  </div>
                  <form action={deleteHubOfferAction}>
                    <input type="hidden" name="id" value={offer.id} />
                    <input type="hidden" name="listing_id" value={listing.id} />
                    <ConfirmSubmit
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      label="Remove"
                      message="Remove this offer?"
                    />
                  </form>
                </div>
              );
            })
          )}
        </div>

        <form
          action={saveHubOfferAction}
          className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="listing_id" value={listing.id} />
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Offer title
            <input name="title" required placeholder="10% student discount" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Kind
            <select name="discount_kind" className={inputClass} defaultValue="percent">
              <option value="percent">Percent off</option>
              <option value="amount">Amount off (BDT)</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Value (percent or BDT)
            <input name="discount_value" inputMode="numeric" placeholder="10" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Applies to
            <input name="applies_to" placeholder="Full menu" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Valid from
            <input name="valid_from" type="date" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Valid until
            <input name="valid_until" type="date" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Terms
            <input name="terms" placeholder="Dine-in only" className={inputClass} />
          </label>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
              <input
                type="checkbox"
                name="student_id_required"
                defaultChecked
                className="h-4 w-4 rounded border-zinc-300"
              />
              Student ID
            </label>
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
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Add offer
            </button>
          </div>
        </form>
      </section>

      {/* Edit form */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Edit listing</h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <HubForm listing={formData} categories={categories ?? []} />
        </div>
      </section>
    </div>
  );
}
