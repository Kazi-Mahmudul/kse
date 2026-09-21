/** Skill proficiency levels (user_skills.level). */
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

// ── Education (Bangladesh education system, user_education) ──────────────────

/** Academic qualification levels (user_education.level). */
export const EDUCATION_LEVELS = [
  'primary_psc',
  'jsc',
  'ssc',
  'hsc',
  'diploma',
  'certificate_course',
  'bachelor',
  'masters',
  'mphil',
  'phd',
  'other',
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/**
 * Bangladesh education boards for board-based qualifications (SSC/HSC and
 * technical diplomas). Madrasah and Technical are education systems rather
 * than geographic boards, but students know them as their "board".
 */
export const EDUCATION_BOARDS = [
  'dhaka',
  'chattogram',
  'rajshahi',
  'cumilla',
  'jashore',
  'barishal',
  'sylhet',
  'dinajpur',
  'mymensingh',
  'madrasah',
  'technical',
  'other',
] as const;
export type EducationBoard = (typeof EDUCATION_BOARDS)[number];

/** SSC/HSC study groups. */
export const STUDY_GROUPS = ['science', 'humanities', 'business_studies', 'other'] as const;
export type StudyGroup = (typeof STUDY_GROUPS)[number];

/** Undergraduate degree types (user_education.degree_type, level = bachelor). */
export const UNDERGRAD_DEGREE_TYPES = [
  'bsc',
  'bba',
  'ba',
  'bss',
  'bcom',
  'llb',
  'beng',
  'other',
] as const;
export type UndergradDegreeType = (typeof UNDERGRAD_DEGREE_TYPES)[number];

/** Postgraduate degree types (user_education.degree_type, level = masters). */
export const POSTGRAD_DEGREE_TYPES = [
  'msc',
  'mba',
  'ma',
  'mss',
  'mcom',
  'llm',
  'meng',
  'other',
] as const;
export type PostgradDegreeType = (typeof POSTGRAD_DEGREE_TYPES)[number];

/** How a result is expressed (user_education.result_type). */
export const EDUCATION_RESULT_TYPES = ['gpa', 'cgpa', 'percentage', 'division', 'other'] as const;
export type EducationResultType = (typeof EDUCATION_RESULT_TYPES)[number];

/** Result scales as select values; stored in DB as numeric (4.00/5.00/100). */
export const EDUCATION_RESULT_SCALES = ['4.00', '5.00', '100'] as const;
export type EducationResultScale = (typeof EDUCATION_RESULT_SCALES)[number];

// ── Certificates (user_certificates) ─────────────────────────────────────────

/**
 * Certificate categories for non-academic credentials: courses, training,
 * competitions, workshops… (Academic qualifications live in user_education.)
 */
export const CERTIFICATE_TYPES = [
  'academic',
  'course',
  'professional',
  'training',
  'workshop',
  'seminar_conference',
  'competition',
  'olympiad',
  'hackathon',
  'programming_it',
  'language',
  'leadership',
  'volunteering',
  'sports',
  'debate',
  'cultural',
  'entrepreneurship',
  'internship_training',
  'research',
  'other',
] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

// ── Projects (user_projects) ──────────────────────────────────────────────────

/**
 * Project categories covering every student background — university, school,
 * diploma/polytechnic, lab, business, design, media, social — not just
 * software. Links are never required: a project can be showcased with
 * description, role, images and documents alone.
 */
export const PROJECT_TYPES = [
  'academic',
  'final_year',
  'thesis_research',
  'software_it',
  'engineering',
  'science_lab',
  'business',
  'marketing',
  'entrepreneurship',
  'design_architecture',
  'media_creative',
  'social_community',
  'competition',
  'internship',
  'diploma',
  'personal',
  'other',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface PortfolioProjectItem {
  id: string;
  title: string;
  /** null on rows saved before project_type existed. */
  projectType: ProjectType | null;
  description: string | null;
  details: string | null;
  role: string | null;
  organization: string | null;
  courseName: string | null;
  isTeam: boolean;
  teamMembers: string[];
  url: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  coverUrl: string | null;
  documentUrl: string | null;
  techStack: string[];
  startedOn: string | null;
  completedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One academic qualification row (user_education). Level-dependent fields are
 * nullable — SSC/HSC use board/group/roll, degrees use program/major, research
 * degrees use researchArea/thesisTitle. `passingYear` holds the expected
 * graduation year while `isOngoing` is true. Roll/registration numbers are
 * owner-only (RLS) and must never be shown on a public profile view.
 */
export interface PortfolioEducationItem {
  id: string;
  level: EducationLevel;
  institution: string;
  board: string | null;
  country: string;
  studyGroup: string | null;
  rollNumber: string | null;
  registrationNumber: string | null;
  degreeType: string | null;
  programName: string | null;
  major: string | null;
  campus: string | null;
  researchArea: string | null;
  thesisTitle: string | null;
  supervisor: string | null;
  startYear: number | null;
  passingYear: number | null;
  isOngoing: boolean;
  resultType: string | null;
  result: string | null;
  resultScale: number | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioCertificateItem {
  id: string;
  title: string;
  certificateType: string | null;
  issuer: string | null;
  programName: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  verificationUrl: string | null;
  description: string | null;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioAchievementItem {
  id: string;
  title: string;
  description: string | null;
  achievedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioResearchItem {
  id: string;
  title: string;
  abstract: string | null;
  role: string | null;
  collaborators: string[];
  url: string | null;
  publishedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioResumeItem {
  id: string;
  fileUrl: string;
  /** Display filename of the uploaded PDF (null for external links). */
  fileName: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioLinkItem {
  id: string;
  label: string;
  url: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * One-shot bundle for the portfolio hub screen. Each list is owned by the
 * current viewer (RLS enforces this server-side; we expose nothing private).
 */
export interface PortfolioBundle {
  education: PortfolioEducationItem[];
  projects: PortfolioProjectItem[];
  certificates: PortfolioCertificateItem[];
  achievements: PortfolioAchievementItem[];
  research: PortfolioResearchItem[];
  resumes: PortfolioResumeItem[];
  links: PortfolioLinkItem[];
}
