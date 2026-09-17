/** Shared action-state shape for the master-data create forms. */
export interface MasterDataActionState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export const initialMasterDataActionState: MasterDataActionState = {
  error: null,
  fieldErrors: {},
};
