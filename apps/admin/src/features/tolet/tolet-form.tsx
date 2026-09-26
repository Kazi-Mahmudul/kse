'use client';

import { useActionState, useState } from 'react';

import {
  initialToletActionState,
  type ToletFormData,
} from './types';
import {
  saveToletListingAction,
} from './actions';
import {
  OPPORTUNITY_STATUS_OPTIONS,
  TOLET_GENDER_PREFERENCE_OPTIONS,
  TOLET_LISTING_STATUS_OPTIONS,
  TOLET_ROOM_TYPE_OPTIONS,
} from '@kse/shared';

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const textareaClass =
  'min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const labelClass = 'flex flex-col gap-1.5';
const fieldLabel = 'text-sm font-medium text-zinc-700';
const fieldError = 'mt-1 text-xs text-red-600';

/**
 * Bachelor To-Let admin create/edit form.
 *
 * Mirrors the opportunity form: uncontrolled inputs, `useActionState` for
 * progressive-enhancement-friendly field error rendering.
 *
 * Tabs of fields:
 *   - Basic: title, summary, description, organization_name, source_*
 *   - Listing: location, city, area, room_type, gender_preference, rent
 *   - Rooms: total_rooms, available_rooms, floor, available_from, bachelor /
 *     utilities toggles, listing_status
 *   - Contact: landlord_phone, whatsapp, contact_email, application_url
 *   - Photos: image_urls textarea + single image upload
 *   - Workflow: status + verified
 */
export function ToletForm({ listing }: { listing?: ToletFormData }) {
  const [state, formAction, isPending] = useActionState(
    saveToletListingAction,
    initialToletActionState,
  );

  // The textarea value for `image_urls` is mirrored to React state so the
  // visible count matches the form payload. Initial value is the joined list.
  const [imageUrlText, setImageUrlText] = useState(
    (listing?.image_urls ?? []).join('\n'),
  );

  const err = (field: string) =>
    state.fieldErrors[field] ? (
      <p className={fieldError}>{state.fieldErrors[field]}</p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {listing && <input type="hidden" name="id" value={listing.id} />}
      <input
        type="hidden"
        name="image_urls"
        value={imageUrlText}
      />

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
          <span className={fieldLabel}>Title</span>
          <input
            name="title"
            defaultValue={listing?.title ?? ''}
            required
            className={inputClass}
          />
          {err('title')}
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Organization / landlord name</span>
          <input
            name="organization_name"
            defaultValue={listing?.organization_name ?? ''}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Short summary</span>
          <textarea
            name="summary"
            defaultValue={listing?.summary ?? ''}
            className={textareaClass}
          />
          {err('summary')}
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Description</span>
          <textarea
            name="description"
            defaultValue={listing?.description ?? ''}
            className={textareaClass}
          />
          {err('description')}
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Listing</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Location</span>
            <input
              name="location"
              defaultValue={listing?.location ?? ''}
              required
              className={inputClass}
            />
            {err('location')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>City</span>
            <input
              name="city"
              defaultValue={listing?.city ?? ''}
              required
              className={inputClass}
            />
            {err('city')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Area</span>
            <input
              name="area"
              defaultValue={listing?.area ?? ''}
              className={inputClass}
            />
            {err('area')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Room type</span>
            <select
              name="room_type"
              defaultValue={listing?.room_type ?? ''}
              className={inputClass}
            >
              <option value="">— None —</option>
              {TOLET_ROOM_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {err('room_type')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Tenant preference</span>
            <select
              name="gender_preference"
              defaultValue={listing?.gender_preference ?? ''}
              className={inputClass}
            >
              <option value="">— None —</option>
              {TOLET_GENDER_PREFERENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Listing status</span>
            <select
              name="listing_status"
              defaultValue={listing?.listing_status ?? 'available'}
              className={inputClass}
            >
              {TOLET_LISTING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className={labelClass}>
            <span className={fieldLabel}>Rent amount</span>
            <input
              name="rent_amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={listing?.rent_amount ?? ''}
              className={inputClass}
            />
            {err('rent_amount')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Rent currency</span>
            <input
              name="rent_currency"
              defaultValue={listing?.rent_currency ?? 'BDT'}
              className={inputClass}
            />
            {err('rent_currency')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Available from</span>
            <input
              name="available_from"
              type="date"
              defaultValue={listing?.available_from ?? ''}
              className={inputClass}
            />
            {err('available_from')}
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Rooms</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className={labelClass}>
            <span className={fieldLabel}>Total rooms</span>
            <input
              name="total_rooms"
              type="number"
              min="1"
              defaultValue={listing?.total_rooms ?? ''}
              className={inputClass}
            />
            {err('total_rooms')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Available rooms</span>
            <input
              name="available_rooms"
              type="number"
              min="0"
              defaultValue={listing?.available_rooms ?? ''}
              className={inputClass}
            />
            {err('available_rooms')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Floor</span>
            <input
              name="floor"
              type="number"
              defaultValue={listing?.floor ?? ''}
              className={inputClass}
            />
            {err('floor')}
          </label>
        </div>
        <div className="flex flex-wrap gap-6">
          <ToggleField
            name="bachelor_friendly"
            label="Bachelor friendly"
            defaultChecked={listing?.bachelor_friendly ?? true}
          />
          <ToggleField
            name="utilities_included"
            label="Utilities included"
            defaultChecked={listing?.utilities_included ?? false}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Contact</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Phone</span>
            <input
              name="landlord_phone"
              defaultValue={listing?.landlord_phone ?? ''}
              required
              className={inputClass}
            />
            {err('landlord_phone')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>WhatsApp</span>
            <input
              name="whatsapp"
              defaultValue={listing?.whatsapp ?? ''}
              className={inputClass}
            />
            {err('whatsapp')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Email</span>
            <input
              name="contact_email"
              type="email"
              defaultValue={listing?.contact_email ?? ''}
              className={inputClass}
            />
            {err('contact_email')}
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Application URL</span>
            <input
              name="application_url"
              type="url"
              defaultValue={listing?.application_url ?? ''}
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Photos</legend>
        <label className={labelClass}>
          <span className={fieldLabel}>Image URLs (one per line)</span>
          <textarea
            value={imageUrlText}
            onChange={(e) => setImageUrlText(e.target.value)}
            placeholder="https://…/photo-1.jpg"
            className={textareaClass}
          />
          {err('image_urls')}
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Upload a new cover image</span>
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-zinc-700"
          />
        </label>
        <label className={labelClass}>
          <span className={fieldLabel}>Existing image URL (single cover)</span>
          <input
            name="image_url"
            defaultValue={listing?.image_url ?? ''}
            className={inputClass}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Source</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Source name</span>
            <input
              name="source_name"
              defaultValue={listing?.source_name ?? ''}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={fieldLabel}>Source URL</span>
            <input
              name="source_url"
              type="url"
              defaultValue={listing?.source_url ?? ''}
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={fieldLabel}>Workflow</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span className={fieldLabel}>Status</span>
            <select
              name="status"
              defaultValue={listing?.status ?? 'pending_review'}
              className={inputClass}
            >
              {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {err('status')}
          </label>
          <ToggleField
            name="verified"
            label="Verified"
            defaultChecked={listing?.verified ?? false}
          />
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : listing ? 'Save changes' : 'Create listing'}
        </button>
      </div>
    </form>
  );
}

function ToggleField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}
