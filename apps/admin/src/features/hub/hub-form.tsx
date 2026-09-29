'use client';

import { useActionState, useState } from 'react';

import { initialHubActionState, type HubFormData } from './types';
import { saveHubListingAction } from './actions';
import {
  HUB_LISTING_STATUS_LABELS,
  HUB_PRICE_TYPE_LABELS,
  HUB_SERVICE_TYPE_LABELS,
} from '@kse/shared';
import type { HubCategory } from '@kse/types';

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const textareaClass =
  'min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const labelClass = 'flex flex-col gap-1.5';
const fieldLabel = 'text-sm font-medium text-zinc-700';
const fieldError = 'mt-1 text-xs text-red-600';

/**
 * Student Hub admin create/edit form (spec student-hub §19).
 * Uncontrolled inputs + useActionState, mirroring the To-Let form.
 */
export function HubForm({
  listing,
  categories,
}: {
  listing?: HubFormData;
  categories: HubCategory[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveHubListingAction,
    initialHubActionState,
  );

  const [servicesText, setServicesText] = useState(
    (listing?.services ?? []).join('\n'),
  );
  const [imageUrlsText, setImageUrlsText] = useState(
    (listing?.image_urls ?? []).join('\n'),
  );

  const err = (field: string) =>
    state.fieldErrors[field] ? (
      <p className={fieldError}>{state.fieldErrors[field]}</p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {listing && <input type="hidden" name="id" value={listing.id} />}
      <input type="hidden" name="services" value={servicesText} />
      <input type="hidden" name="image_urls" value={imageUrlsText} />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Basic</legend>
        <label className={labelClass}>
          <span className={fieldLabel}>Name</span>
          <input name="name" defaultValue={listing?.name ?? ''} required className={inputClass} />
          {err('name')}
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Category</span>
          <select
            name="category_id"
            defaultValue={listing?.category_id ?? ''}
            required
            className={inputClass}
          >
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {err('category_id')}
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Service type</span>
          <select
            name="service_type"
            defaultValue={listing?.service_type ?? 'other'}
            className={inputClass}
          >
            {Object.entries(HUB_SERVICE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {err('service_type')}
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Short summary</span>
          <textarea
            name="summary"
            defaultValue={listing?.summary ?? ''}
            className={textareaClass}
          />
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Description</span>
          <textarea
            name="description"
            defaultValue={listing?.description ?? ''}
            className={textareaClass}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Location</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            <span className={fieldLabel}>City</span>
            <input name="city" defaultValue={listing?.city ?? 'Khulna'} required className={inputClass} />
            {err('city')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Area</span>
            <input name="area" defaultValue={listing?.area ?? ''} className={inputClass} />
            {err('area')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>District</span>
            <input name="district" defaultValue={listing?.district ?? ''} className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          <span className={fieldLabel}>Street address</span>
          <input name="address" defaultValue={listing?.address ?? ''} className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Latitude (optional)</span>
            <input
              name="latitude"
              defaultValue={listing?.latitude ?? ''}
              inputMode="decimal"
              placeholder="22.8456"
              className={inputClass}
            />
            {err('latitude')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Longitude (optional)</span>
            <input
              name="longitude"
              defaultValue={listing?.longitude ?? ''}
              inputMode="decimal"
              placeholder="89.5403"
              className={inputClass}
            />
            {err('longitude')}
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Contact & hours</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Phone</span>
            <input name="phone" defaultValue={listing?.phone ?? ''} className={inputClass} />
            {err('phone')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>WhatsApp</span>
            <input name="whatsapp" defaultValue={listing?.whatsapp ?? ''} className={inputClass} />
            {err('whatsapp')}
          </label>
        </div>
        <label className={labelClass}>
          <span className={fieldLabel}>Email</span>
          <input name="email" type="email" defaultValue={listing?.email ?? ''} className={inputClass} />
          {err('email')}
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Opening hours (display text)</span>
          <input
            name="opening_hours"
            defaultValue={listing?.opening_hours ?? ''}
            placeholder="e.g. Sat–Thu 9:00–21:00"
            className={inputClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Opens at (for the Open now filter)</span>
            <input
              name="opens_at"
              type="time"
              defaultValue={listing?.opens_at ?? ''}
              className={inputClass}
            />
            {err('opens_at')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Closes at</span>
            <input
              name="closes_at"
              type="time"
              defaultValue={listing?.closes_at ?? ''}
              className={inputClass}
            />
            {err('closes_at')}
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Pricing & services</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Price note</span>
            <input
              name="price_note"
              defaultValue={listing?.price_note ?? ''}
              placeholder="e.g. Wash from BDT 30/kg"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Price type</span>
            <select
              name="price_type"
              defaultValue={listing?.price_type ?? ''}
              className={inputClass}
            >
              <option value="">—</option>
              {Object.entries(HUB_PRICE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={labelClass}>
          <span className={fieldLabel}>
            Services (one per line) — {servicesText.split('\n').filter((s) => s.trim()).length} added
          </span>
          <textarea
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
            className={textareaClass}
            placeholder={'Wash\nDry cleaning\nPickup & delivery'}
          />
          {err('services')}
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Photos</legend>
        <label className={labelClass}>
          <span className={fieldLabel}>Hero image URL</span>
          <input name="image_url" defaultValue={listing?.image_url ?? ''} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Photo URLs (one per line, max 8)</span>
          <textarea
            value={imageUrlsText}
            onChange={(e) => setImageUrlsText(e.target.value)}
            className={textareaClass}
          />
          {err('image_urls')}
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Workflow</legend>
        <label className={labelClass}>
          <span className={fieldLabel}>Status</span>
          <select name="status" defaultValue={listing?.status ?? 'draft'} className={inputClass}>
            {Object.entries(HUB_LISTING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            name="verified"
            defaultChecked={listing?.verified ?? false}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Verified (✓ shown in the app; sets verified_by/verified_at)
        </label>
      </fieldset>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save listing'}
        </button>
      </div>
    </form>
  );
}
