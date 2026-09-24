export * from './constants';
export * from './deadline';
// Re-export scholarship status / level labels so mobile + admin screens
// can read them via @kse/shared alongside the option arrays.
export {
  SCHOLARSHIP_APPLICATION_STATUSES,
  SCHOLARSHIP_APPLICATION_STATUS_LABELS,
  SCHOLARSHIP_MATCH_LEVELS,
  SCHOLARSHIP_MATCH_LEVEL_LABELS,
} from '@kse/types';
