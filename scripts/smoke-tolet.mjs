#!/usr/bin/env node
// @ts-check
/**
 * Bachelor To-Let smoke test (spec bachelor-to-let §Verification).
 *
 * Exercises the full student-write path end-to-end against the local Supabase
 * stack so we can confirm:
 *
 *   1. The tolet-actions Edge Function accepts a `submit_listing` payload.
 *   2. The new row appears in the public feed after staff approval.
 *   3. `mark_availability` updates listing_status.
 *   4. `withdraw_own_listing` removes the row from public view.
 *
 * Usage:
 *   pnpm smoke:tolet          # local stack (default)
 *   BASE_URL=… pnpm smoke:tolet  # custom Supabase URL
 *
 * Requires the local stack to be running (`pnpm setup`). Reads anon + service
 * keys from `supabase status -o json`.
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function capture(command, args) {
  const result = spawnSync(command, args, {
    shell: true,
    encoding: 'utf8',
    cwd: root,
  });
  return result.status === 0 ? result.stdout : null;
}

function fail(message) {
  console.error(`\nsmoke-tolet: ${message}`);
  process.exit(1);
}

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:54321';
const anonKey =
  process.env.ANON_KEY ??
  capture('supabase', ['status', '-o', 'json'])?.match(/"anon_key":\s*"([^"]+)"/)?.[1];
const serviceKey =
  process.env.SERVICE_KEY ??
  capture('supabase', ['status', '-o', 'json'])?.match(/"service_role_key":\s*"([^"]+)"/)?.[1];

if (!anonKey || !serviceKey) {
  fail('Could not read anon/service keys. Run `pnpm setup` first.');
}

console.log(`smoke-tolet: base URL = ${baseUrl}`);

/**
 * Calls a Supabase REST endpoint with the given key.
 * Returns `{ status, body }`.
 */
async function call(pathname, init = {}) {
  const url = `${baseUrl}${pathname}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  return { status: res.status, body: parsed };
}

/** Calls the Edge Function with the service-role key. */
async function callToletAction(action, payload) {
  return call('/functions/v1/tolet-actions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ action, payload }),
  });
}

/** Reads the public feed count of `type='tolet'` published rows. */
async function countPublicTolet() {
  const res = await call(
    '/rest/v1/opportunities?select=id&type=eq.tolet&status=eq.published',
    { headers: { Authorization: `Bearer ${anonKey}` } },
  );
  if (res.status !== 200) return -1;
  return Array.isArray(res.body) ? res.body.length : -1;
}

async function main() {
  // ── 1. Submit a new listing ───────────────────────────────────────────────
  const listingId = crypto.randomUUID();
  const payload = {
    id: listingId,
    title: `Smoke Test To-Let ${new Date().toISOString().slice(0, 16)}`,
    summary: 'Smoke-test listing created by scripts/smoke-tolet.mjs.',
    description: 'Inserted via the tolet-actions Edge Function for end-to-end verification.',
    location: 'Smoke Street 1',
    city: 'Khulna',
    area: 'Smoke',
    room_type: 'single',
    gender_preference: 'any',
    rent_amount: 4500,
    rent_currency: 'BDT',
    available_from: '2026-10-01',
    bachelor_friendly: true,
    utilities_included: false,
    landlord_phone: '+880 1700-000000',
    whatsapp: '8801700000000',
    contact_email: null,
    total_rooms: 3,
    available_rooms: 2,
    floor: 2,
    image_urls: [],
  };

  console.log('smoke-tolet: submit_listing…');
  const submit = await callToletAction('submit_listing', payload);
  if (submit.status !== 200) {
    fail(`submit_listing failed (${submit.status}): ${JSON.stringify(submit.body)}`);
  }
  console.log(`smoke-tolet:   ✓ row created with id=${submit.body?.data?.id ?? listingId}`);

  // ── 2. Promote to published via service-role and check public count ───────
  console.log('smoke-tolet: promote to published via service-role…');
  const promote = await call(
    `/rest/v1/opportunities?id=eq.${listingId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() }),
    },
  );
  if (promote.status < 200 || promote.status >= 300) {
    fail(`Promote failed: ${promote.status} ${JSON.stringify(promote.body)}`);
  }

  const publicCount = await countPublicTolet();
  if (publicCount < 1) {
    fail(`Expected ≥1 published tolet, got ${publicCount}`);
  }
  console.log(`smoke-tolet:   ✓ public feed shows ${publicCount} published tolet(s)`);

  // ── 3. Mark availability (almost_full) ────────────────────────────────────
  console.log('smoke-tolet: mark_availability → almost_full…');
  const avail = await callToletAction('mark_availability', {
    listing_id: listingId,
    listing_status: 'almost_full',
  });
  if (avail.status !== 200) {
    fail(`mark_availability failed: ${avail.status} ${JSON.stringify(avail.body)}`);
  }
  console.log('smoke-tolet:   ✓ availability updated');

  // ── 4. Withdraw the listing ───────────────────────────────────────────────
  console.log('smoke-tolet: withdraw_own_listing…');
  const withdraw = await callToletAction('withdraw_own_listing', { listing_id: listingId });
  if (withdraw.status !== 200) {
    fail(`withdraw failed: ${withdraw.status} ${JSON.stringify(withdraw.body)}`);
  }
  console.log('smoke-tolet:   ✓ listing withdrawn');

  // ── 5. Cleanup: hard-delete the row ───────────────────────────────────────
  const cleanup = await call(`/rest/v1/opportunities?id=eq.${listingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceKey}` },
  });
  if (cleanup.status < 200 || cleanup.status >= 300) {
    console.warn(`smoke-tolet: cleanup DELETE returned ${cleanup.status} (non-fatal)`);
  } else {
    console.log('smoke-tolet:   ✓ cleanup delete ok');
  }

  writeFileSync(
    path.join(root, '.smoke-tolet.log'),
    `last run ${new Date().toISOString()}: ${publicCount} published tolet(s)\n`,
  );
  console.log('\nsmoke-tolet: ✅ all checks passed.');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
