import type {
  PortfolioAchievementItem,
  PortfolioCertificateItem,
  PortfolioEducationItem,
  PortfolioLinkItem,
  PortfolioProjectItem,
  PortfolioResearchItem,
  PortfolioResumeItem,
} from '@kse/types';

import { supabase } from '@/lib/supabase';

/**
 * Portfolio CRUD (spec §6, step 18). All tables are owner-only RLS so
 * authenticated reads on this client stay scoped to the current user's
 * own rows; inserts/updates enforce user_id = auth.uid() server-side.
 *
 * Certificate / marksheet uploads go to the private `certificates`
 * bucket (CLAUDE.md §15) and are viewed through short-lived signed URLs.
 * Resumes upload into the private PDF-only `resumes` bucket the same way.
 */

export class PortfolioError extends Error {}

function fail(context: string, error: { message: string } | null): never {
  if (error) throw new PortfolioError(`${context}: ${error.message}`);
  throw new PortfolioError(context);
}

/** Owner stamp for inserts — the tables have no auth.uid() default and the
 *  RLS insert policy requires user_id = auth.uid(), so every create MUST
 *  send the column explicitly or the write is rejected. */
async function requireUserId(context: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) fail(context, { message: 'You need to sign in first' });
  return user.id;
}

// ── File upload (private `certificates` bucket, CLAUDE.md §15) ──────────────

const DOCUMENT_BUCKET = 'certificates';
/** Private PDF-only bucket for resumes (see 20260906120011_storage_buckets.sql). */
export const RESUME_BUCKET = 'resumes';

export type PortfolioBucket = typeof DOCUMENT_BUCKET | typeof RESUME_BUCKET;

/**
 * Split a stored storage reference into bucket + object path. Uploads now
 * store bucket-qualified refs (`resumes/<uid>/x.pdf`); rows written before
 * that hold bare `<uid>/x.ext` paths, which belong to the certificates
 * bucket. (A uid can never collide with a bucket name.)
 */
function splitStorageRef(fileUrl: string): { bucket: PortfolioBucket; path: string } {
  const [first, ...rest] = fileUrl.split('/');
  if (rest.length > 0 && first === RESUME_BUCKET) {
    return { bucket: RESUME_BUCKET, path: rest.join('/') };
  }
  return { bucket: DOCUMENT_BUCKET, path: fileUrl };
}
/** Client-side mirrors of the bucket limits (10 MB) and CLAUDE.md §15 image cap. */
export const FILE_LIMITS = {
  imageMaxBytes: 5 * 1024 * 1024,
  pdfMaxBytes: 10 * 1024 * 1024,
} as const;

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** Unique object-name suffix without a crypto dependency (see avatar upload). */
let uploadCounter = 0;
function uniqueSuffix(): string {
  uploadCounter += 1;
  return `${Date.now().toString(36)}-${uploadCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export interface PortfolioDocumentInput {
  localUri: string;
  mimeType: string;
  /** Destination bucket — defaults to `certificates`; resumes use `resumes`. */
  bucket?: PortfolioBucket;
}

/**
 * Upload a picked certificate/marksheet/resume into its private bucket under
 * `<userId>/<unique>.<ext>` (the bucket's RLS requires the first path segment
 * to be auth.uid()). Returns the bucket-qualified storage path
 * (`<bucket>/<userId>/<unique>.<ext>`), which is what gets stored in
 * `user_certificates.file_url` / `user_education.document_url` /
 * `user_resumes.file_url` — distinguishable from external links because it
 * has no https scheme.
 * Raw-ArrayBuffer body for the same MIME-override reason as the avatar upload.
 */
export async function uploadPortfolioDocument(
  input: PortfolioDocumentInput,
): Promise<string> {
  const userId = await requireUserId('Could not upload the file');
  const ext = EXT_BY_MIME[input.mimeType];
  if (!ext) fail('Could not upload the file', { message: 'Unsupported file type' });

  const bucket = input.bucket ?? DOCUMENT_BUCKET;
  const path = `${userId}/${uniqueSuffix()}.${ext}`;
  const response = await fetch(input.localUri);
  const bytes = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: input.mimeType });
  if (error) {
    fail(
      'Could not upload the file',
      error.message ? { message: error.message } : null,
    );
  }
  return `${bucket}/${path}`;
}

/** True when a stored file reference points into Supabase Storage. */
export function isStoragePath(fileUrl: string | null | undefined): boolean {
  return Boolean(fileUrl) && !/^https?:\/\//iu.test(fileUrl as string);
}

/**
 * Resolve a stored file reference into something openable: storage paths
 * become a 1-hour signed URL (owner-only via the bucket's select policy),
 * external links pass through untouched.
 */
export async function resolveViewableFileUrl(
  fileUrl: string | null | undefined,
): Promise<string | null> {
  if (!fileUrl) return null;
  if (!isStoragePath(fileUrl)) return fileUrl;
  const { bucket, path } = splitStorageRef(fileUrl);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error || !data) {
    fail('Could not open the file', error ? { message: error.message } : null);
  }
  return data.signedUrl;
}

/** Delete a previously uploaded document (ignored for external links). */
export async function deletePortfolioDocument(
  fileUrl: string | null | undefined,
): Promise<void> {
  if (!isStoragePath(fileUrl)) return;
  const { bucket, path } = splitStorageRef(fileUrl as string);
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) fail('Could not remove the old file', { message: error.message });
}

// ── Education ────────────────────────────────────────────────────────────────

const EDUCATION_COLUMNS =
  'id, level, institution, board, country, study_group, roll_number, registration_number, degree_type, program_name, major, campus, research_area, thesis_title, supervisor, start_year, passing_year, is_ongoing, result_type, result, result_scale, document_url, created_at, updated_at';

interface EducationRow {
  id: string;
  level: PortfolioEducationItem['level'];
  institution: string;
  board: string | null;
  country: string;
  study_group: string | null;
  roll_number: string | null;
  registration_number: string | null;
  degree_type: string | null;
  program_name: string | null;
  major: string | null;
  campus: string | null;
  research_area: string | null;
  thesis_title: string | null;
  supervisor: string | null;
  start_year: number | null;
  passing_year: number | null;
  is_ongoing: boolean;
  result_type: string | null;
  result: string | null;
  result_scale: number | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEducation(row: EducationRow): PortfolioEducationItem {
  return {
    id: row.id,
    level: row.level,
    institution: row.institution,
    board: row.board,
    country: row.country,
    studyGroup: row.study_group,
    rollNumber: row.roll_number,
    registrationNumber: row.registration_number,
    degreeType: row.degree_type,
    programName: row.program_name,
    major: row.major,
    campus: row.campus,
    researchArea: row.research_area,
    thesisTitle: row.thesis_title,
    supervisor: row.supervisor,
    startYear: row.start_year,
    passingYear: row.passing_year,
    isOngoing: row.is_ongoing,
    resultType: row.result_type,
    result: row.result,
    resultScale: row.result_scale,
    documentUrl: row.document_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyEducation(): Promise<PortfolioEducationItem[]> {
  const { data, error } = await supabase
    .from('user_education')
    .select(EDUCATION_COLUMNS)
    // Ongoing (no passing year yet) first, then most recent first — the
    // chronological order the portfolio displays qualifications in.
    .order('passing_year', { ascending: false, nullsFirst: true })
    .order('start_year', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load education', error);
  return ((data ?? []) as unknown as EducationRow[]).map(rowToEducation);
}

export interface EducationUpsert {
  level: PortfolioEducationItem['level'];
  institution: string;
  board: string | null;
  study_group: string | null;
  degree_type: string | null;
  program_name: string | null;
  major: string | null;
  campus: string | null;
  research_area: string | null;
  thesis_title: string | null;
  supervisor: string | null;
  roll_number: string | null;
  registration_number: string | null;
  start_year: number | null;
  passing_year: number | null;
  is_ongoing: boolean;
  result_type: string | null;
  result: string | null;
  result_scale: number | null;
  document_url: string | null;
}

export async function createEducation(
  input: EducationUpsert,
): Promise<PortfolioEducationItem> {
  const userId = await requireUserId('Could not save the education entry');
  const { data, error } = await supabase
    .from('user_education')
    .insert({ ...input, user_id: userId })
    .select(EDUCATION_COLUMNS)
    .single();
  if (error || !data) fail('Could not save the education entry', error);
  return rowToEducation(data as unknown as EducationRow);
}

export async function updateEducation(
  id: string,
  input: EducationUpsert,
): Promise<PortfolioEducationItem> {
  const { data, error } = await supabase
    .from('user_education')
    .update(input)
    .eq('id', id)
    .select(EDUCATION_COLUMNS)
    .single();
  if (error || !data) fail('Could not update the education entry', error);
  return rowToEducation(data as unknown as EducationRow);
}

export async function deleteEducation(id: string): Promise<void> {
  // Best-effort marksheet cleanup (same reason as deleteCertificate).
  const { data } = await supabase
    .from('user_education')
    .select('document_url')
    .eq('id', id)
    .maybeSingle();
  const documentUrl = (data as { document_url: string | null } | null)?.document_url;
  const { error } = await supabase.from('user_education').delete().eq('id', id);
  if (error) fail('Could not delete the education entry', error);
  if (isStoragePath(documentUrl)) await deletePortfolioDocument(documentUrl);
}

// ── Projects ────────────────────────────────────────────────────────────────

const PROJECT_COLUMNS =
  'id, title, project_type, description, details, role, organization, course_name, is_team, team_members, tech_stack, url, repo_url, demo_url, cover_url, document_url, started_on, completed_on, created_at, updated_at';

interface ProjectRow {
  id: string;
  title: string;
  project_type: PortfolioProjectItem['projectType'];
  description: string | null;
  details: string | null;
  role: string | null;
  organization: string | null;
  course_name: string | null;
  is_team: boolean;
  team_members: string[] | null;
  tech_stack: string[] | null;
  url: string | null;
  repo_url: string | null;
  demo_url: string | null;
  cover_url: string | null;
  document_url: string | null;
  started_on: string | null;
  completed_on: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): PortfolioProjectItem {
  return {
    id: row.id,
    title: row.title,
    projectType: row.project_type,
    description: row.description,
    details: row.details,
    role: row.role,
    organization: row.organization,
    courseName: row.course_name,
    isTeam: row.is_team,
    teamMembers: row.team_members ?? [],
    url: row.url,
    repoUrl: row.repo_url,
    demoUrl: row.demo_url,
    coverUrl: row.cover_url,
    documentUrl: row.document_url,
    techStack: row.tech_stack ?? [],
    startedOn: row.started_on,
    completedOn: row.completed_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyProjects(): Promise<PortfolioProjectItem[]> {
  const { data, error } = await supabase
    .from('user_projects')
    .select(PROJECT_COLUMNS)
    .order('started_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load projects', error);
  return ((data ?? []) as unknown as ProjectRow[]).map(rowToProject);
}

export interface ProjectUpsert {
  title: string;
  project_type: PortfolioProjectItem['projectType'];
  description: string | null;
  details: string | null;
  role: string | null;
  organization: string | null;
  course_name: string | null;
  is_team: boolean;
  team_members: string[];
  tech_stack: string[];
  url: string | null;
  repo_url: string | null;
  demo_url: string | null;
  cover_url: string | null;
  document_url: string | null;
  started_on: string | null;
  completed_on: string | null;
}

export async function createProject(input: ProjectUpsert): Promise<PortfolioProjectItem> {
  const userId = await requireUserId('Could not save the project');
  const { data, error } = await supabase
    .from('user_projects')
    .insert({ ...input, user_id: userId })
    .select(PROJECT_COLUMNS)
    .single();
  if (error || !data) fail('Could not save the project', error);
  return rowToProject(data as unknown as ProjectRow);
}

export async function updateProject(
  id: string,
  input: ProjectUpsert,
): Promise<PortfolioProjectItem> {
  const { data, error } = await supabase
    .from('user_projects')
    .update(input)
    .eq('id', id)
    .select(PROJECT_COLUMNS)
    .single();
  if (error || !data) fail('Could not update the project', error);
  return rowToProject(data as unknown as ProjectRow);
}

export async function deleteProject(id: string): Promise<void> {
  // Best-effort cleanup of uploaded cover/document so deleted rows don't
  // orphan objects in the private bucket (same reason as deleteCertificate).
  const { data } = await supabase
    .from('user_projects')
    .select('cover_url, document_url')
    .eq('id', id)
    .maybeSingle();
  const row = data as { cover_url: string | null; document_url: string | null } | null;
  const { error } = await supabase.from('user_projects').delete().eq('id', id);
  if (error) fail('Could not delete the project', error);
  for (const fileUrl of [row?.cover_url, row?.document_url]) {
    if (isStoragePath(fileUrl)) await deletePortfolioDocument(fileUrl);
  }
}

// ── Certificates ────────────────────────────────────────────────────────────

const CERTIFICATE_COLUMNS =
  'id, title, certificate_type, issuer, program_name, issued_on, expires_on, credential_id, credential_url, verification_url, description, file_url, created_at, updated_at';

interface CertificateRow {
  id: string;
  title: string;
  certificate_type: string | null;
  issuer: string | null;
  program_name: string | null;
  issued_on: string | null;
  expires_on: string | null;
  credential_id: string | null;
  credential_url: string | null;
  verification_url: string | null;
  description: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCertificate(row: CertificateRow): PortfolioCertificateItem {
  return {
    id: row.id,
    title: row.title,
    certificateType: row.certificate_type,
    issuer: row.issuer,
    programName: row.program_name,
    issuedOn: row.issued_on,
    expiresOn: row.expires_on,
    credentialId: row.credential_id,
    credentialUrl: row.credential_url,
    verificationUrl: row.verification_url,
    description: row.description,
    fileUrl: row.file_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyCertificates(): Promise<PortfolioCertificateItem[]> {
  const { data, error } = await supabase
    .from('user_certificates')
    .select(CERTIFICATE_COLUMNS)
    .order('issued_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load certificates', error);
  return ((data ?? []) as unknown as CertificateRow[]).map(rowToCertificate);
}

export interface CertificateUpsert {
  title: string;
  certificate_type: string | null;
  issuer: string | null;
  program_name: string | null;
  issued_on: string | null;
  expires_on: string | null;
  credential_id: string | null;
  credential_url: string | null;
  verification_url: string | null;
  description: string | null;
  file_url: string | null;
}

export async function createCertificate(
  input: CertificateUpsert,
): Promise<PortfolioCertificateItem> {
  const userId = await requireUserId('Could not save the certificate');
  const { data, error } = await supabase
    .from('user_certificates')
    .insert({ ...input, user_id: userId })
    .select(CERTIFICATE_COLUMNS)
    .single();
  if (error || !data) fail('Could not save the certificate', error);
  return rowToCertificate(data as unknown as CertificateRow);
}

export async function updateCertificate(
  id: string,
  input: CertificateUpsert,
): Promise<PortfolioCertificateItem> {
  const { data, error } = await supabase
    .from('user_certificates')
    .update(input)
    .eq('id', id)
    .select(CERTIFICATE_COLUMNS)
    .single();
  if (error || !data) fail('Could not update the certificate', error);
  return rowToCertificate(data as unknown as CertificateRow);
}

export async function deleteCertificate(id: string): Promise<void> {
  // Best-effort storage cleanup: remove an uploaded file so deleted rows
  // don't leave orphaned objects in the private bucket.
  const { data } = await supabase
    .from('user_certificates')
    .select('file_url')
    .eq('id', id)
    .maybeSingle();
  const fileUrl = (data as { file_url: string | null } | null)?.file_url;
  const { error } = await supabase.from('user_certificates').delete().eq('id', id);
  if (error) fail('Could not delete the certificate', error);
  if (isStoragePath(fileUrl)) await deletePortfolioDocument(fileUrl);
}

// ── Achievements ────────────────────────────────────────────────────────────

interface AchievementRow {
  id: string;
  title: string;
  description: string | null;
  achieved_on: string | null;
  created_at: string;
  updated_at: string;
}

function rowToAchievement(row: AchievementRow): PortfolioAchievementItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    achievedOn: row.achieved_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyAchievements(): Promise<PortfolioAchievementItem[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('id, title, description, achieved_on, created_at, updated_at')
    .order('achieved_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load achievements', error);
  return ((data ?? []) as unknown as AchievementRow[]).map(rowToAchievement);
}

export interface AchievementUpsert {
  title: string;
  description: string | null;
  achieved_on: string | null;
}

export async function createAchievement(
  input: AchievementUpsert,
): Promise<PortfolioAchievementItem> {
  const userId = await requireUserId('Could not save the achievement');
  const { data, error } = await supabase
    .from('user_achievements')
    .insert({ ...input, user_id: userId })
    .select('id, title, description, achieved_on, created_at, updated_at')
    .single();
  if (error || !data) fail('Could not save the achievement', error);
  return rowToAchievement(data as unknown as AchievementRow);
}

export async function updateAchievement(
  id: string,
  input: AchievementUpsert,
): Promise<PortfolioAchievementItem> {
  const { data, error } = await supabase
    .from('user_achievements')
    .update(input)
    .eq('id', id)
    .select('id, title, description, achieved_on, created_at, updated_at')
    .single();
  if (error || !data) fail('Could not update the achievement', error);
  return rowToAchievement(data as unknown as AchievementRow);
}

export async function deleteAchievement(id: string): Promise<void> {
  const { error } = await supabase.from('user_achievements').delete().eq('id', id);
  if (error) fail('Could not delete the achievement', error);
}

// ── Research ────────────────────────────────────────────────────────────────

interface ResearchRow {
  id: string;
  title: string;
  abstract: string | null;
  role: string | null;
  collaborators: string[];
  url: string | null;
  published_on: string | null;
  created_at: string;
  updated_at: string;
}

function rowToResearch(row: ResearchRow): PortfolioResearchItem {
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    role: row.role,
    collaborators: row.collaborators ?? [],
    url: row.url,
    publishedOn: row.published_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyResearch(): Promise<PortfolioResearchItem[]> {
  const { data, error } = await supabase
    .from('user_research')
    .select(
      'id, title, abstract, role, collaborators, url, published_on, created_at, updated_at',
    )
    .order('published_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load research', error);
  return ((data ?? []) as unknown as ResearchRow[]).map(rowToResearch);
}

export interface ResearchUpsert {
  title: string;
  abstract: string | null;
  role: string | null;
  collaborators: string[];
  url: string | null;
  published_on: string | null;
}

export async function createResearch(
  input: ResearchUpsert,
): Promise<PortfolioResearchItem> {
  const userId = await requireUserId('Could not save the research entry');
  const { data, error } = await supabase
    .from('user_research')
    .insert({ ...input, user_id: userId })
    .select(
      'id, title, abstract, role, collaborators, url, published_on, created_at, updated_at',
    )
    .single();
  if (error || !data) fail('Could not save the research entry', error);
  return rowToResearch(data as unknown as ResearchRow);
}

export async function updateResearch(
  id: string,
  input: ResearchUpsert,
): Promise<PortfolioResearchItem> {
  const { data, error } = await supabase
    .from('user_research')
    .update(input)
    .eq('id', id)
    .select(
      'id, title, abstract, role, collaborators, url, published_on, created_at, updated_at',
    )
    .single();
  if (error || !data) fail('Could not update the research entry', error);
  return rowToResearch(data as unknown as ResearchRow);
}

export async function deleteResearch(id: string): Promise<void> {
  const { error } = await supabase.from('user_research').delete().eq('id', id);
  if (error) fail('Could not delete the research entry', error);
}

// ── Resumes ────────────────────────────────────────────────────────────────

const RESUME_COLUMNS = 'id, file_url, file_name, is_primary, created_at, updated_at';

interface ResumeRow {
  id: string;
  file_url: string;
  file_name: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

function rowToResume(row: ResumeRow): PortfolioResumeItem {
  return {
    id: row.id,
    fileUrl: row.file_url,
    fileName: row.file_name,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyResumes(): Promise<PortfolioResumeItem[]> {
  const { data, error } = await supabase
    .from('user_resumes')
    .select(RESUME_COLUMNS)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load resumes', error);
  return ((data ?? []) as unknown as ResumeRow[]).map(rowToResume);
}

export interface ResumeUpsert {
  file_url: string;
  file_name: string | null;
  is_primary: boolean;
}

/**
 * Promote a resume to primary: one transaction via two updates so we
 * never end up with two primary rows (the UI guarantee + service guard).
 */
async function clearExistingPrimary(): Promise<void> {
  const { error } = await supabase
    .from('user_resumes')
    .update({ is_primary: false })
    .eq('is_primary', true);
  if (error) fail('Could not clear the previous primary resume', error);
}

export async function createResume(
  input: ResumeUpsert,
): Promise<PortfolioResumeItem> {
  const userId = await requireUserId('Could not save the resume');
  if (input.is_primary) {
    await clearExistingPrimary();
  }
  const { data, error } = await supabase
    .from('user_resumes')
    .insert({ ...input, user_id: userId })
    .select(RESUME_COLUMNS)
    .single();
  if (error || !data) fail('Could not save the resume', error);
  return rowToResume(data as unknown as ResumeRow);
}

export async function updateResume(
  id: string,
  input: ResumeUpsert,
): Promise<PortfolioResumeItem> {
  if (input.is_primary) {
    await clearExistingPrimary();
  }
  const { data, error } = await supabase
    .from('user_resumes')
    .update(input)
    .eq('id', id)
    .select(RESUME_COLUMNS)
    .single();
  if (error || !data) fail('Could not update the resume', error);
  return rowToResume(data as unknown as ResumeRow);
}

export async function deleteResume(id: string): Promise<void> {
  // Best-effort storage cleanup so a deleted resume doesn't leave an
  // orphaned PDF in the private bucket (same reason as deleteCertificate).
  const { data } = await supabase
    .from('user_resumes')
    .select('file_url')
    .eq('id', id)
    .maybeSingle();
  const fileUrl = (data as { file_url: string | null } | null)?.file_url;
  const { error } = await supabase.from('user_resumes').delete().eq('id', id);
  if (error) fail('Could not delete the resume', error);
  if (isStoragePath(fileUrl)) await deletePortfolioDocument(fileUrl);
}

// ── Portfolio links ─────────────────────────────────────────────────────────

interface LinkRow {
  id: string;
  label: string;
  url: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function rowToLink(row: LinkRow): PortfolioLinkItem {
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyPortfolioLinks(): Promise<PortfolioLinkItem[]> {
  const { data, error } = await supabase
    .from('user_portfolio_links')
    .select('id, label, url, position, created_at, updated_at')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) fail('Could not load portfolio links', error);
  return ((data ?? []) as unknown as LinkRow[]).map(rowToLink);
}

export interface PortfolioLinkUpsert {
  label: string;
  url: string;
}

export async function createPortfolioLink(
  input: PortfolioLinkUpsert,
): Promise<PortfolioLinkItem> {
  const userId = await requireUserId('Could not save the portfolio link');
  const { data, error } = await supabase
    .from('user_portfolio_links')
    .insert({ ...input, user_id: userId })
    .select('id, label, url, position, created_at, updated_at')
    .single();
  if (error || !data) fail('Could not save the portfolio link', error);
  return rowToLink(data as unknown as LinkRow);
}

export async function updatePortfolioLink(
  id: string,
  input: PortfolioLinkUpsert,
): Promise<PortfolioLinkItem> {
  const { data, error } = await supabase
    .from('user_portfolio_links')
    .update(input)
    .eq('id', id)
    .select('id, label, url, position, created_at, updated_at')
    .single();
  if (error || !data) fail('Could not update the portfolio link', error);
  return rowToLink(data as unknown as LinkRow);
}

export async function deletePortfolioLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_portfolio_links')
    .delete()
    .eq('id', id);
  if (error) fail('Could not delete the portfolio link', error);
}
