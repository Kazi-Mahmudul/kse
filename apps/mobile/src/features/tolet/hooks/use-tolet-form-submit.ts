import { useCallback, useState } from 'react';

import { toletSubmissionPayloadSchema } from '@kse/validation';

import { submitListing, uploadListingImage } from '../service';

import type { ToletSubmissionPayload } from '@kse/types';

interface SubmitOptions {
  /** Local URIs picked from the device gallery (one or more). */
  imageUris?: string[];
}

/**
 * Bridge between the post form's RHF values and the Edge-Function payload.
 *
 * The form collects `localImageUri[]` (device-picked). On submit we:
 *   1. Upload each to the `tolet-listings` storage bucket (raw ArrayBuffer
 *      — avoids RN's broken Blob MIME typing).
 *   2. Collect the public URLs.
 *   3. Pass the merged payload to `submitListing()` (Edge Function).
 *
 * The Edge Function validates the payload a second time with the same Zod
 * schema — this is the source of truth.
 *
 * The hook surfaces `isSubmitting` so the form can disable itself and the
 * parent can show a spinner.
 */
export function useToletFormSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (
      values: ToletSubmissionPayload,
      options: SubmitOptions = {},
    ): Promise<{ id: string }> => {
      setIsSubmitting(true);
      try {
        const uploadedUrls: string[] = [];
        const uris = options.imageUris ?? values.image_urls ?? [];
        for (let i = 0; i < uris.length; i += 1) {
          const uri = uris[i]!;
          // Already-uploaded URLs (https://) come back from the form when
          // the user edits an existing draft. Re-upload only local file URIs.
          if (uri.startsWith('https://') || uri.startsWith('http://')) {
            uploadedUrls.push(uri);
            continue;
          }
          // Best-effort MIME guess; the storage policy accepts any of jpg/png/webp.
          const mimeType = uri.endsWith('.png')
            ? 'image/png'
            : uri.endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg';
          const url = await uploadListingImage(uri, mimeType);
          uploadedUrls.push(url);
        }

        const payload: ToletSubmissionPayload = {
          ...values,
          image_urls: uploadedUrls,
        };
        const parsed = toletSubmissionPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          throw new Error(first?.message ?? 'Invalid form data');
        }

        return await submitListing(parsed.data as unknown as Record<string, unknown>);
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { submit, isSubmitting };
}
