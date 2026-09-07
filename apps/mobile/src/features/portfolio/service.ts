import type {
  PortfolioAchievementItem,
  PortfolioCertificateItem,
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
 * Resume file upload + signed URLs are deferred to the storage step.
 * For now `user_resumes.file_url` is an external (public) link the
 * student hosts themselves (Drive, Notion, a profile site).
 */

export class PortfolioError extends Error {}

function fail(context: string, error: { message: string } | null): never {
  if (error) throw new PortfolioError(`${context}: ${error.message}`);
  throw new PortfolioError(context);
}

// ── Projects ────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  tech_stack: string[];
  started_on: string | null;
  completed_on: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): PortfolioProjectItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
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
    .select('id, title, description, url, tech_stack, started_on, completed_on, created_at, updated_at')
    .order('started_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load projects', error);
  return ((data ?? []) as unknown as ProjectRow[]).map(rowToProject);
}

export interface ProjectUpsert {
  title: string;
  description: string | null;
  url: string | null;
  tech_stack: string[];
  started_on: string | null;
  completed_on: string | null;
}

export async function createProject(input: ProjectUpsert): Promise<PortfolioProjectItem> {
  const { data, error } = await supabase
    .from('user_projects')
    .insert(input)
    .select(
      'id, title, description, url, tech_stack, started_on, completed_on, created_at, updated_at',
    )
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
    .select(
      'id, title, description, url, tech_stack, started_on, completed_on, created_at, updated_at',
    )
    .single();
  if (error || !data) fail('Could not update the project', error);
  return rowToProject(data as unknown as ProjectRow);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('user_projects').delete().eq('id', id);
  if (error) fail('Could not delete the project', error);
}

// ── Certificates ────────────────────────────────────────────────────────────

interface CertificateRow {
  id: string;
  title: string;
  issuer: string | null;
  issued_on: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCertificate(row: CertificateRow): PortfolioCertificateItem {
  return {
    id: row.id,
    title: row.title,
    issuer: row.issuer,
    issuedOn: row.issued_on,
    fileUrl: row.file_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyCertificates(): Promise<PortfolioCertificateItem[]> {
  const { data, error } = await supabase
    .from('user_certificates')
    .select('id, title, issuer, issued_on, file_url, created_at, updated_at')
    .order('issued_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load certificates', error);
  return ((data ?? []) as unknown as CertificateRow[]).map(rowToCertificate);
}

export interface CertificateUpsert {
  title: string;
  issuer: string | null;
  issued_on: string | null;
  file_url: string | null;
}

export async function createCertificate(
  input: CertificateUpsert,
): Promise<PortfolioCertificateItem> {
  const { data, error } = await supabase
    .from('user_certificates')
    .insert(input)
    .select('id, title, issuer, issued_on, file_url, created_at, updated_at')
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
    .select('id, title, issuer, issued_on, file_url, created_at, updated_at')
    .single();
  if (error || !data) fail('Could not update the certificate', error);
  return rowToCertificate(data as unknown as CertificateRow);
}

export async function deleteCertificate(id: string): Promise<void> {
  const { error } = await supabase.from('user_certificates').delete().eq('id', id);
  if (error) fail('Could not delete the certificate', error);
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
  const { data, error } = await supabase
    .from('user_achievements')
    .insert(input)
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
  const { data, error } = await supabase
    .from('user_research')
    .insert(input)
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

interface ResumeRow {
  id: string;
  file_url: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

function rowToResume(row: ResumeRow): PortfolioResumeItem {
  return {
    id: row.id,
    fileUrl: row.file_url,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyResumes(): Promise<PortfolioResumeItem[]> {
  const { data, error } = await supabase
    .from('user_resumes')
    .select('id, file_url, is_primary, created_at, updated_at')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) fail('Could not load resumes', error);
  return ((data ?? []) as unknown as ResumeRow[]).map(rowToResume);
}

export interface ResumeUpsert {
  file_url: string;
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
  if (input.is_primary) {
    await clearExistingPrimary();
  }
  const { data, error } = await supabase
    .from('user_resumes')
    .insert(input)
    .select('id, file_url, is_primary, created_at, updated_at')
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
    .select('id, file_url, is_primary, created_at, updated_at')
    .single();
  if (error || !data) fail('Could not update the resume', error);
  return rowToResume(data as unknown as ResumeRow);
}

export async function deleteResume(id: string): Promise<void> {
  const { error } = await supabase.from('user_resumes').delete().eq('id', id);
  if (error) fail('Could not delete the resume', error);
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
  const { data, error } = await supabase
    .from('user_portfolio_links')
    .insert(input)
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
