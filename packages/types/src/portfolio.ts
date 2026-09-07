/** Skill proficiency levels (user_skills.level). */
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export interface PortfolioProjectItem {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  techStack: string[];
  startedOn: string | null;
  completedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioCertificateItem {
  id: string;
  title: string;
  issuer: string | null;
  issuedOn: string | null;
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
  projects: PortfolioProjectItem[];
  certificates: PortfolioCertificateItem[];
  achievements: PortfolioAchievementItem[];
  research: PortfolioResearchItem[];
  resumes: PortfolioResumeItem[];
  links: PortfolioLinkItem[];
}
