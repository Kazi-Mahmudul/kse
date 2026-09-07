/** Shared shape for auth form actions (useActionState state). */
export interface AuthActionState {
  error: string | null;
}

export const initialAuthActionState: AuthActionState = { error: null };
