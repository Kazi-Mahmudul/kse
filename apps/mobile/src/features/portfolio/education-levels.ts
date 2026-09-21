import {
  EDUCATION_BOARD_OPTIONS,
  POSTGRAD_DEGREE_OPTIONS,
  STUDY_GROUP_OPTIONS,
  UNDERGRAD_DEGREE_OPTIONS,
} from '@kse/shared';
import type { EducationLevel } from '@kse/types';

import type { SelectOption as UiSelectOption } from '@/components/ui/select-field';

/**
 * Per-level field layout for the education form (Bangladesh education
 * system). One record per level decides which fields render, their labels
 * and their result defaults — the section component and the payload mapper
 * both read from here so a level's shape is defined exactly once.
 */

export interface EducationLevelSpec {
  /** Institution field label, using the Bangladesh term for the level. */
  institutionLabel: string;
  /** Board select (SSC/HSC require it; diploma's authority is optional). */
  boardLabel?: string;
  /** Whether the board sheet offers a "None" row (SSC/HSC boards are required). */
  boardOptional?: boolean;
  /** Science / Humanities / Business Studies / Other. */
  showGroup?: boolean;
  /** Degree-type select (BSc… for bachelor, MSc… for masters). */
  degreeOptions?: readonly UiSelectOption[];
  degreeLabel?: string;
  /** Program / course name input. */
  programLabel?: string;
  /** Department / major / technology input. */
  majorLabel?: string;
  showCampus?: boolean;
  /** Research area + thesis title + supervisor (MPhil/PhD). */
  showResearch?: boolean;
  /** Roll + registration numbers (private, owner-only rows). */
  showRoll?: boolean;
  /** Start-year + graduation-year range with an "ongoing" toggle;
   *  false = single passing-year field. */
  useRangeYears?: boolean;
  /** Preselected result type/scale for the level (user can change both). */
  defaultResultType?: '' | 'gpa' | 'cgpa' | 'other';
  defaultResultScale?: '' | '4.00' | '5.00';
  documentLabel: string;
}

export const BOARD_OPTIONS: readonly UiSelectOption[] = EDUCATION_BOARD_OPTIONS;
export const GROUP_OPTIONS: readonly UiSelectOption[] = STUDY_GROUP_OPTIONS;
export const UG_DEGREE_OPTIONS: readonly UiSelectOption[] = UNDERGRAD_DEGREE_OPTIONS;
export const PG_DEGREE_OPTIONS: readonly UiSelectOption[] = POSTGRAD_DEGREE_OPTIONS;

const MARKSHEET = 'Certificate / Marksheet';
const TRANSCRIPT = 'Certificate / Transcript';

export const EDUCATION_LEVEL_SPECS: Record<EducationLevel, EducationLevelSpec> = {
  primary_psc: {
    institutionLabel: 'School name',
    defaultResultType: 'gpa',
    defaultResultScale: '5.00',
    documentLabel: MARKSHEET,
  },
  jsc: {
    institutionLabel: 'School name',
    defaultResultType: 'gpa',
    defaultResultScale: '5.00',
    documentLabel: MARKSHEET,
  },
  ssc: {
    institutionLabel: 'School name',
    boardLabel: 'Board',
    showGroup: true,
    showRoll: true,
    defaultResultType: 'gpa',
    defaultResultScale: '5.00',
    documentLabel: MARKSHEET,
  },
  hsc: {
    institutionLabel: 'College name',
    boardLabel: 'Board',
    showGroup: true,
    showRoll: true,
    defaultResultType: 'gpa',
    defaultResultScale: '5.00',
    documentLabel: MARKSHEET,
  },
  diploma: {
    institutionLabel: 'Institute name',
    boardLabel: 'Board / Authority',
    boardOptional: true,
    programLabel: 'Diploma program',
    majorLabel: 'Technology / Department',
    useRangeYears: true,
    defaultResultType: 'cgpa',
    defaultResultScale: '4.00',
    documentLabel: MARKSHEET,
  },
  certificate_course: {
    institutionLabel: 'Institution',
    programLabel: 'Course name',
    defaultResultType: '',
    defaultResultScale: '',
    documentLabel: 'Course certificate',
  },
  bachelor: {
    institutionLabel: 'University',
    degreeOptions: UG_DEGREE_OPTIONS,
    degreeLabel: 'Degree type',
    programLabel: 'Program / Degree name',
    majorLabel: 'Department / Major',
    showCampus: true,
    useRangeYears: true,
    defaultResultType: 'cgpa',
    defaultResultScale: '4.00',
    documentLabel: TRANSCRIPT,
  },
  masters: {
    institutionLabel: 'University',
    degreeOptions: PG_DEGREE_OPTIONS,
    degreeLabel: 'Degree type',
    programLabel: 'Program name',
    majorLabel: 'Department / Major',
    showCampus: true,
    useRangeYears: true,
    defaultResultType: 'cgpa',
    defaultResultScale: '4.00',
    documentLabel: TRANSCRIPT,
  },
  mphil: {
    institutionLabel: 'University',
    showResearch: true,
    useRangeYears: true,
    defaultResultType: 'other',
    defaultResultScale: '',
    documentLabel: TRANSCRIPT,
  },
  phd: {
    institutionLabel: 'University',
    showResearch: true,
    useRangeYears: true,
    defaultResultType: 'other',
    defaultResultScale: '',
    documentLabel: TRANSCRIPT,
  },
  other: {
    institutionLabel: 'Institution',
    programLabel: 'Qualification name (optional)',
    defaultResultType: '',
    defaultResultScale: '',
    documentLabel: 'Certificate (optional)',
  },
};
