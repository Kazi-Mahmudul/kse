/**
 * State shape used by the create-form action for education institutions.
 *
 * Kept in its own module so the `'use server'` actions file can ship only
 * async-function exports — Next 16 rejects any non-async export from a
 * `use server` file (including a const object), so the initial state and
 * the type live next to the action but outside the server boundary.
 */

export interface EducationInstitutionActionState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export const initialEducationInstitutionActionState: EducationInstitutionActionState = {
  error: null,
  fieldErrors: {},
};
