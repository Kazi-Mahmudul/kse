import type {
  AcademicLevel,
  CertificateType,
  DegreeLevel,
  EducationBoard,
  EducationInstitutionOwnership,
  EducationInstitutionType,
  EducationLevel,
  EducationResultScale,
  EducationResultType,
  EventType,
  FundingType,
  OpportunityInternshipType,
  OpportunityMode,
  OpportunityStatus,
  OpportunityType,
  PostgradDegreeType,
  ProjectType,
  StudyGroup,
  UndergradDegreeType,
  UserRole,
} from '@kse/types';
import {
  ACADEMIC_LEVELS,
  CERTIFICATE_TYPES,
  DEGREE_LEVELS,
  EDUCATION_BOARDS,
  EDUCATION_INSTITUTION_OWNERSHIPS,
  EDUCATION_INSTITUTION_TYPES,
  EDUCATION_LEVELS,
  EDUCATION_RESULT_SCALES,
  EDUCATION_RESULT_TYPES,
  EVENT_TYPES,
  FUNDING_TYPES,
  OPPORTUNITY_INTERNSHIP_TYPES,
  OPPORTUNITY_MODES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  POSTGRAD_DEGREE_TYPES,
  PROJECT_TYPES,
  STUDY_GROUPS,
  UNDERGRAD_DEGREE_TYPES,
} from '@kse/types';

export const APP_NAME = 'KSE';

/** Display labels for enum-like domains. Single source of truth avoids duplicate maps. */

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Internship',
  scholarship: 'Scholarship',
  workshop: 'Workshop',
  event: 'Event',
  mentorship: 'Mentorship',
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
  expired: 'Expired',
  archived: 'Archived',
};

export const OPPORTUNITY_MODE_LABELS: Record<OpportunityMode, string> = {
  remote: 'Remote',
  onsite: 'On-site',
  hybrid: 'Hybrid',
};

/** Internship-only engagement types (spec 06._internship_hub_kse). */
export const OPPORTUNITY_INTERNSHIP_TYPE_LABELS: Record<
  OpportunityInternshipType,
  string
> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  unpaid: 'Unpaid',
};

/** Scholarship-only fields (spec §6). */
export const DEGREE_LEVEL_LABELS: Record<DegreeLevel, string> = {
  undergraduate: 'Undergraduate',
  masters: 'Masters',
  phd: 'PhD',
  diploma: 'Diploma',
};

export const FUNDING_TYPE_LABELS: Record<FundingType, string> = {
  full: 'Full funding',
  partial: 'Partial funding',
  tuition_waiver: 'Tuition waiver',
  stipend: 'Stipend',
};

/** Event sub-types (spec 08._events_kse). */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  workshop: 'Workshop',
  seminar: 'Seminar',
  hackathon: 'Hackathon',
  meetup: 'Meetup',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  tutor: 'Tutor',
  mentor: 'Mentor',
  content_manager: 'Content Manager',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = {
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
  hsc: 'HSC',
  ssc: 'SSC',
  other: 'Other',
};

// ── Education (Bangladesh education system, user_education) ──────────────────

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  primary_psc: 'Primary / PSC',
  jsc: 'JSC',
  ssc: 'SSC',
  hsc: 'HSC',
  diploma: 'Diploma / Polytechnic',
  certificate_course: 'Certificate Course',
  bachelor: 'Bachelor / Undergraduate',
  masters: "Master's / Postgraduate",
  mphil: 'MPhil',
  phd: 'PhD',
  other: 'Other',
};

export const EDUCATION_BOARD_LABELS: Record<EducationBoard, string> = {
  dhaka: 'Dhaka',
  chattogram: 'Chattogram',
  rajshahi: 'Rajshahi',
  cumilla: 'Cumilla',
  jashore: 'Jashore',
  barishal: 'Barishal',
  sylhet: 'Sylhet',
  dinajpur: 'Dinajpur',
  mymensingh: 'Mymensingh',
  madrasah: 'Madrasah',
  technical: 'Technical',
  other: 'Other',
};

export const STUDY_GROUP_LABELS: Record<StudyGroup, string> = {
  science: 'Science',
  humanities: 'Humanities',
  business_studies: 'Business Studies',
  other: 'Other',
};

export const UNDERGRAD_DEGREE_LABELS: Record<UndergradDegreeType, string> = {
  bsc: 'BSc',
  bba: 'BBA',
  ba: 'BA',
  bss: 'BSS',
  bcom: 'BCom',
  llb: 'LLB',
  beng: 'BEng',
  other: 'Other',
};

export const POSTGRAD_DEGREE_LABELS: Record<PostgradDegreeType, string> = {
  msc: 'MSc',
  mba: 'MBA',
  ma: 'MA',
  mss: 'MSS',
  mcom: 'MCom',
  llm: 'LLM',
  meng: 'MEng',
  other: 'Other',
};

export const EDUCATION_RESULT_TYPE_LABELS: Record<EducationResultType, string> = {
  gpa: 'GPA',
  cgpa: 'CGPA',
  percentage: 'Percentage',
  division: 'Division',
  other: 'Other',
};

export const EDUCATION_RESULT_SCALE_LABELS: Record<EducationResultScale, string> = {
  '4.00': '4.00 (university CGPA)',
  '5.00': '5.00 (SSC/HSC GPA)',
  '100': '100 (percentage)',
};

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  academic: 'Academic Certificate',
  course: 'Course Certificate',
  professional: 'Professional Certificate',
  training: 'Training',
  workshop: 'Workshop',
  seminar_conference: 'Seminar / Conference',
  competition: 'Competition',
  olympiad: 'Olympiad',
  hackathon: 'Hackathon',
  programming_it: 'Programming / IT',
  language: 'Language',
  leadership: 'Leadership',
  volunteering: 'Volunteering',
  sports: 'Sports',
  debate: 'Debate',
  cultural: 'Cultural Activity',
  entrepreneurship: 'Entrepreneurship',
  internship_training: 'Internship / Industrial Training',
  research: 'Research',
  other: 'Other',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  academic: 'Academic Project',
  final_year: 'Final Year Project',
  thesis_research: 'Thesis / Research',
  software_it: 'Software / IT',
  engineering: 'Engineering',
  science_lab: 'Science / Laboratory',
  business: 'Business',
  marketing: 'Marketing',
  entrepreneurship: 'Entrepreneurship',
  design_architecture: 'Design / Architecture',
  media_creative: 'Media / Creative',
  social_community: 'Social / Community',
  competition: 'Competition',
  internship: 'Internship',
  diploma: 'Diploma / Polytechnic',
  personal: 'Personal Project',
  other: 'Other',
};

export const EDUCATION_LEVEL_OPTIONS = EDUCATION_LEVELS.map((value) => ({
  value,
  label: EDUCATION_LEVEL_LABELS[value],
}));

export const EDUCATION_BOARD_OPTIONS = EDUCATION_BOARDS.map((value) => ({
  value,
  label: EDUCATION_BOARD_LABELS[value],
}));

export const STUDY_GROUP_OPTIONS = STUDY_GROUPS.map((value) => ({
  value,
  label: STUDY_GROUP_LABELS[value],
}));

export const UNDERGRAD_DEGREE_OPTIONS = UNDERGRAD_DEGREE_TYPES.map((value) => ({
  value,
  label: UNDERGRAD_DEGREE_LABELS[value],
}));

export const POSTGRAD_DEGREE_OPTIONS = POSTGRAD_DEGREE_TYPES.map((value) => ({
  value,
  label: POSTGRAD_DEGREE_LABELS[value],
}));

export const EDUCATION_RESULT_TYPE_OPTIONS = EDUCATION_RESULT_TYPES.map((value) => ({
  value,
  label: EDUCATION_RESULT_TYPE_LABELS[value],
}));

export const EDUCATION_RESULT_SCALE_OPTIONS = EDUCATION_RESULT_SCALES.map((value) => ({
  value,
  label: EDUCATION_RESULT_SCALE_LABELS[value],
}));

export const CERTIFICATE_TYPE_OPTIONS = CERTIFICATE_TYPES.map((value) => ({
  value,
  label: CERTIFICATE_TYPE_LABELS[value],
}));

export const PROJECT_TYPE_OPTIONS = PROJECT_TYPES.map((value) => ({
  value,
  label: PROJECT_TYPE_LABELS[value],
}));

/** Iterating enum options in UI (filters, admin selects). */
export const OPPORTUNITY_TYPE_OPTIONS = OPPORTUNITY_TYPES.map((value) => ({
  value,
  label: OPPORTUNITY_TYPE_LABELS[value],
}));

export const OPPORTUNITY_MODE_OPTIONS = OPPORTUNITY_MODES.map((value) => ({
  value,
  label: OPPORTUNITY_MODE_LABELS[value],
}));

export const OPPORTUNITY_INTERNSHIP_TYPE_OPTIONS = OPPORTUNITY_INTERNSHIP_TYPES.map(
  (value) => ({
    value,
    label: OPPORTUNITY_INTERNSHIP_TYPE_LABELS[value],
  }),
);

export const OPPORTUNITY_STATUS_OPTIONS = OPPORTUNITY_STATUSES.map((value) => ({
  value,
  label: OPPORTUNITY_STATUS_LABELS[value],
}));

export const DEGREE_LEVEL_OPTIONS = DEGREE_LEVELS.map((value) => ({
  value,
  label: DEGREE_LEVEL_LABELS[value],
}));

export const FUNDING_TYPE_OPTIONS = FUNDING_TYPES.map((value) => ({
  value,
  label: FUNDING_TYPE_LABELS[value],
}));

export const EVENT_TYPE_OPTIONS = EVENT_TYPES.map((value) => ({
  value,
  label: EVENT_TYPE_LABELS[value],
}));

export const ACADEMIC_LEVEL_OPTIONS = ACADEMIC_LEVELS.map((value) => ({
  value,
  label: ACADEMIC_LEVEL_LABELS[value],
}));

/** Bottom navigation tabs (CLAUDE.md §32). */
export const BOTTOM_TABS = ['home', 'explore', 'action', 'community', 'profile'] as const;

/** Storage buckets (CLAUDE.md §15). */
export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  organizationLogos: 'organization-logos',
  opportunityImages: 'opportunity-images',
  certificates: 'certificates',
  resumes: 'resumes',
  communityMedia: 'community-media',
} as const;

export const NOTIFICATION_TYPE_LABELS: Record<
  import('@kse/types').NotificationType,
  string
> = {
  deadline_reminder: 'Deadline reminder',
  new_opportunity: 'New opportunity',
  event_upcoming: 'Upcoming event',
  community_announcement: 'Community announcement',
  platform_announcement: 'Platform announcement',
  custom: 'Other',
};

import type { NotificationType } from '@kse/types';
export const NOTIFICATION_TYPE_OPTIONS: { value: NotificationType; label: string }[] =
  Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({
    value: value as NotificationType,
    label,
  }));

// ── Education institutions (public.education_institutions) ──────────────────

export const EDUCATION_INSTITUTION_TYPE_LABELS: Record<EducationInstitutionType, string> = {
  university: 'University',
  medical_college: 'Medical College',
  college: 'College',
  school: 'School',
  madrasa: 'Madrasa',
  igv_school: 'IGV School',
  technical_school: 'Technical School',
  english_medium: 'English Medium School',
  arts_college: 'Arts College',
  polytechnic: 'Polytechnic Institute',
  military_school: 'Military School',
};

export const EDUCATION_INSTITUTION_OWNERSHIP_LABELS: Record<
  EducationInstitutionOwnership,
  string
> = {
  public: 'Public',
  private: 'Private',
  other: 'Other',
};

export const EDUCATION_INSTITUTION_TYPE_OPTIONS = EDUCATION_INSTITUTION_TYPES.map((value) => ({
  value,
  label: EDUCATION_INSTITUTION_TYPE_LABELS[value],
}));

export const EDUCATION_INSTITUTION_OWNERSHIP_OPTIONS = EDUCATION_INSTITUTION_OWNERSHIPS.map(
  (value) => ({ value, label: EDUCATION_INSTITUTION_OWNERSHIP_LABELS[value] }),
);
