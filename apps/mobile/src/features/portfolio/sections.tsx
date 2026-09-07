import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  projectFormSchema,
  certificateFormSchema,
  achievementFormSchema,
  researchFormSchema,
  resumeFormSchema,
  portfolioLinkFormSchema,
  blankToNull,
  type ProjectFormValues,
  type CertificateFormValues,
  type AchievementFormValues,
  type ResearchFormValues,
  type ResumeFormValues,
  type PortfolioLinkFormValues,
} from '@kse/validation';
import type {
  PortfolioAchievementItem,
  PortfolioCertificateItem,
  PortfolioLinkItem,
  PortfolioProjectItem,
  PortfolioResearchItem,
  PortfolioResumeItem,
} from '@kse/types';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import {
  RHFInput,
  RHFToggle,
  RHFChipList,
  ErrorBanner,
} from '@/features/portfolio/forms';
import {
  AchievementCard,
  CertificateCard,
  PortfolioLinkCard,
  ProjectCard,
  ResearchCard,
  ResumeCard,
} from '@/features/portfolio/items';

interface ModeShellProps {
  mode: 'idle' | 'add' | { editingId: string };
  onAdd(): void;
  onCancel(): void;
  title: string;
  count: number;
  emptyIcon: string;
  emptyTitle: string;
  emptyMessage: string;
  isSaving: boolean;
  onSubmit(): void;
  saveLabel: string;
  children: React.ReactNode;
}

function ModeShell({
  mode,
  onAdd,
  onCancel,
  title,
  count,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  isSaving,
  onSubmit,
  saveLabel,
  children,
}: ModeShellProps) {
  const isFormOpen = mode !== 'idle';
  return (
    <View>
      <SectionHeader
        title={`${title} (${count})`}
        actionLabel={isFormOpen ? 'Cancel' : 'Add'}
        onAction={isFormOpen ? onCancel : onAdd}
      />

      {isFormOpen ? (
        <Card>
          {children}
          <View style={styles.submitRow}>
            <PrimaryButton
              label={isSaving ? 'Saving…' : saveLabel}
              onPress={onSubmit}
              loading={isSaving}
              style={styles.submitButton}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={onCancel}
              style={styles.submitButton}
            />
          </View>
        </Card>
      ) : (
        <>
          {children}
          {count === 0 && (
            <EmptyState
              icon={emptyIcon as never}
              title={emptyTitle}
              message={emptyMessage}
            />
          )}
        </>
      )}
    </View>
  );
}

// ── Projects ────────────────────────────────────────────────────────────────

interface ProjectsSectionProps {
  items: PortfolioProjectItem[];
  isSaving: boolean;
  create(values: ProjectFormValues): Promise<void>;
  update(id: string, values: ProjectFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
}

export function ProjectsSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
}: ProjectsSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: projectToFormValues(editing),
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ title: '', description: '', url: '', tech_stack: [], started_on: '', completed_on: '' });
    setMode('add');
  };

  const startEdit = (item: PortfolioProjectItem) => {
    setEditingId(item.id);
    form.reset(projectToFormValues(item));
    setMode('add');
  };

  const cancel = () => {
    form.reset({ title: '', description: '', url: '', tech_stack: [], started_on: '', completed_on: '' });
    setEditingId(null);
    setMode('idle');
  };

  const submit = form.handleSubmit(async (values) => {
    const payload = blankToNull(values) as ProjectFormValues;
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    cancel();
  });

  return (
    <ModeShell
      mode={mode}
      onAdd={startAdd}
      onCancel={cancel}
      title="Projects"
      count={items.length}
      emptyIcon="cube-outline"
      emptyTitle="No projects yet"
      emptyMessage="Showcase things you've built. Each entry can include a description, URL and tech stack."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add project'}
    >
      {mode !== 'idle' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput control={form.control} name="title" label="Title" placeholder="What did you build?" />
          <RHFInput control={form.control} name="description" label="Description" placeholder="Short summary (optional)" multiline />
          <RHFInput control={form.control} name="url" label="URL" placeholder="https://github.com/…" keyboardType="url" />
          <RHFChipList control={form.control} name="tech_stack" label="Tech stack" placeholder="React Native, GraphQL…" />
          <View style={styles.row}>
            <View style={styles.col}>
              <RHFInput control={form.control} name="started_on" label="Start date" placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.col}>
              <RHFInput control={form.control} name="completed_on" label="End date" placeholder="YYYY-MM-DD" />
            </View>
          </View>
        </View>
      )}
      {mode === 'idle' && items.length > 0 && (
        <View style={styles.list}>
          {items.map((project) => (
            <ProjectCard
              key={project.id}
              item={project}
              onEdit={() => startEdit(project)}
              onDelete={() => {
                void remove(project.id);
              }}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

function projectToFormValues(item: PortfolioProjectItem | null): ProjectFormValues {
  if (!item) return { title: '', description: '', url: '', tech_stack: [], started_on: '', completed_on: '' };
  return {
    title: item.title,
    description: item.description ?? '',
    url: item.url ?? '',
    tech_stack: item.techStack,
    started_on: item.startedOn ?? '',
    completed_on: item.completedOn ?? '',
  };
}

// ── Certificates ────────────────────────────────────────────────────────────

interface CertificatesSectionProps {
  items: PortfolioCertificateItem[];
  isSaving: boolean;
  create(values: CertificateFormValues): Promise<void>;
  update(id: string, values: CertificateFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
}

export function CertificatesSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
}: CertificatesSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: { title: '', issuer: '', issued_on: '', file_url: '' },
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ title: '', issuer: '', issued_on: '', file_url: '' });
    setMode('add');
  };
  const startEdit = (item: PortfolioCertificateItem) => {
    setEditingId(item.id);
    form.reset(certificateToFormValues(item));
    setMode('add');
  };
  const cancel = () => {
    form.reset({ title: '', issuer: '', issued_on: '', file_url: '' });
    setEditingId(null);
    setMode('idle');
  };
  const submit = form.handleSubmit(async (values) => {
    const payload = blankToNull(values) as CertificateFormValues;
    if (editing) await update(editing.id, payload);
    else await create(payload);
    cancel();
  });

  return (
    <ModeShell
      mode={mode === 'idle' ? 'idle' : 'add'}
      onAdd={startAdd}
      onCancel={cancel}
      title="Certificates"
      count={items.length}
      emptyIcon="ribbon-outline"
      emptyTitle="No certificates yet"
      emptyMessage="Add the certificates and credentials you've earned."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add certificate'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput control={form.control} name="title" label="Title" />
          <RHFInput control={form.control} name="issuer" label="Issuing organization" placeholder="Coursera, KUET, IEEE…" />
          <RHFInput control={form.control} name="issued_on" label="Issued on" placeholder="YYYY-MM-DD" />
          <RHFInput control={form.control} name="file_url" label="File URL (optional)" placeholder="https://…" keyboardType="url" />
        </View>
      )}
      {mode === 'idle' && items.length > 0 && (
        <View style={styles.list}>
          {items.map((cert) => (
            <CertificateCard
              key={cert.id}
              item={cert}
              onEdit={() => startEdit(cert)}
              onDelete={() => {
                void remove(cert.id);
              }}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

function certificateToFormValues(item: PortfolioCertificateItem): CertificateFormValues {
  return {
    title: item.title,
    issuer: item.issuer ?? '',
    issued_on: item.issuedOn ?? '',
    file_url: item.fileUrl ?? '',
  };
}

// ── Achievements ────────────────────────────────────────────────────────────

interface AchievementsSectionProps {
  items: PortfolioAchievementItem[];
  isSaving: boolean;
  create(values: AchievementFormValues): Promise<void>;
  update(id: string, values: AchievementFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
}

export function AchievementsSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
}: AchievementsSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementFormSchema),
    defaultValues: { title: '', description: '', achieved_on: '' },
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ title: '', description: '', achieved_on: '' });
    setMode('add');
  };
  const startEdit = (item: PortfolioAchievementItem) => {
    setEditingId(item.id);
    form.reset(achievementToFormValues(item));
    setMode('add');
  };
  const cancel = () => {
    form.reset({ title: '', description: '', achieved_on: '' });
    setEditingId(null);
    setMode('idle');
  };
  const submit = form.handleSubmit(async (values) => {
    const payload = blankToNull(values) as AchievementFormValues;
    if (editing) await update(editing.id, payload);
    else await create(payload);
    cancel();
  });

  return (
    <ModeShell
      mode={mode === 'idle' ? 'idle' : 'add'}
      onAdd={startAdd}
      onCancel={cancel}
      title="Achievements"
      count={items.length}
      emptyIcon="trophy-outline"
      emptyTitle="No achievements yet"
      emptyMessage="Add awards, milestones or recognitions."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add achievement'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput control={form.control} name="title" label="Achievement" />
          <RHFInput control={form.control} name="description" label="Description" multiline />
          <RHFInput control={form.control} name="achieved_on" label="Achieved on" placeholder="YYYY-MM-DD" />
        </View>
      )}
      {mode === 'idle' && items.length > 0 && (
        <View style={styles.list}>
          {items.map((a) => (
            <AchievementCard
              key={a.id}
              item={a}
              onEdit={() => startEdit(a)}
              onDelete={() => {
                void remove(a.id);
              }}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

function achievementToFormValues(item: PortfolioAchievementItem): AchievementFormValues {
  return {
    title: item.title,
    description: item.description ?? '',
    achieved_on: item.achievedOn ?? '',
  };
}

// ── Research ───────────────────────────────────────────────────────────────

interface ResearchSectionProps {
  items: PortfolioResearchItem[];
  isSaving: boolean;
  create(values: ResearchFormValues): Promise<void>;
  update(id: string, values: ResearchFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
}

export function ResearchSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
}: ResearchSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<ResearchFormValues>({
    resolver: zodResolver(researchFormSchema),
    defaultValues: {
      title: '',
      abstract: '',
      role: '',
      collaborators: [],
      url: '',
      published_on: '',
    },
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ title: '', abstract: '', role: '', collaborators: [], url: '', published_on: '' });
    setMode('add');
  };
  const startEdit = (item: PortfolioResearchItem) => {
    setEditingId(item.id);
    form.reset(researchToFormValues(item));
    setMode('add');
  };
  const cancel = () => {
    form.reset({ title: '', abstract: '', role: '', collaborators: [], url: '', published_on: '' });
    setEditingId(null);
    setMode('idle');
  };
  const submit = form.handleSubmit(async (values) => {
    const payload = blankToNull(values) as ResearchFormValues;
    if (editing) await update(editing.id, payload);
    else await create(payload);
    cancel();
  });

  return (
    <ModeShell
      mode={mode === 'idle' ? 'idle' : 'add'}
      onAdd={startAdd}
      onCancel={cancel}
      title="Research"
      count={items.length}
      emptyIcon="flask-outline"
      emptyTitle="No research yet"
      emptyMessage="Add published papers, theses or active research projects."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add research'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput control={form.control} name="title" label="Title" />
          <RHFInput control={form.control} name="abstract" label="Abstract" multiline />
          <RHFInput control={form.control} name="role" label="Your role" placeholder="First author, supervisor…" />
          <RHFChipList control={form.control} name="collaborators" label="Collaborators" />
          <RHFInput control={form.control} name="url" label="URL" placeholder="https://doi.org/…" keyboardType="url" />
          <RHFInput control={form.control} name="published_on" label="Published on" placeholder="YYYY-MM-DD" />
        </View>
      )}
      {mode === 'idle' && items.length > 0 && (
        <View style={styles.list}>
          {items.map((r) => (
            <ResearchCard
              key={r.id}
              item={r}
              onEdit={() => startEdit(r)}
              onDelete={() => {
                void remove(r.id);
              }}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

function researchToFormValues(item: PortfolioResearchItem): ResearchFormValues {
  return {
    title: item.title,
    abstract: item.abstract ?? '',
    role: item.role ?? '',
    collaborators: item.collaborators,
    url: item.url ?? '',
    published_on: item.publishedOn ?? '',
  };
}

// ── Resumes ────────────────────────────────────────────────────────────────

interface ResumesSectionProps {
  items: PortfolioResumeItem[];
  isSaving: boolean;
  create(values: ResumeFormValues): Promise<void>;
  update(id: string, values: ResumeFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
}

export function ResumesSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
}: ResumesSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeFormSchema),
    defaultValues: { file_url: '', is_primary: false },
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ file_url: '', is_primary: items.length === 0 });
    setMode('add');
  };
  const startEdit = (item: PortfolioResumeItem) => {
    setEditingId(item.id);
    form.reset({ file_url: item.fileUrl, is_primary: item.isPrimary });
    setMode('add');
  };
  const cancel = () => {
    form.reset({ file_url: '', is_primary: false });
    setEditingId(null);
    setMode('idle');
  };
  const submit = form.handleSubmit(async (values) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    cancel();
  });

  return (
    <ModeShell
      mode={mode === 'idle' ? 'idle' : 'add'}
      onAdd={startAdd}
      onCancel={cancel}
      title="Resumes"
      count={items.length}
      emptyIcon="document-text-outline"
      emptyTitle="No resumes yet"
      emptyMessage="Add a public link to your PDF resume. Storage uploads arrive in a later release."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add resume'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput
            control={form.control}
            name="file_url"
            label="Resume URL"
            placeholder="https://drive.google.com/…"
            keyboardType="url"
          />
          <RHFToggle
            control={form.control}
            name="is_primary"
            label="Mark as primary resume"
          />
        </View>
      )}
      {mode === 'idle' && items.length > 0 && (
        <View style={styles.list}>
          {items.map((r) => (
            <ResumeCard
              key={r.id}
              item={r}
              onEdit={() => startEdit(r)}
              onDelete={() => {
                void remove(r.id);
              }}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

// ── Portfolio links ────────────────────────────────────────────────────────

interface PortfolioLinksSectionProps {
  items: PortfolioLinkItem[];
  isSaving: boolean;
  create(values: PortfolioLinkFormValues): Promise<void>;
  update(id: string, values: PortfolioLinkFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
}

export function PortfolioLinksSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
}: PortfolioLinksSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<PortfolioLinkFormValues>({
    resolver: zodResolver(portfolioLinkFormSchema),
    defaultValues: { label: '', url: '' },
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ label: '', url: '' });
    setMode('add');
  };
  const startEdit = (item: PortfolioLinkItem) => {
    setEditingId(item.id);
    form.reset({ label: item.label, url: item.url });
    setMode('add');
  };
  const cancel = () => {
    form.reset({ label: '', url: '' });
    setEditingId(null);
    setMode('idle');
  };
  const submit = form.handleSubmit(async (values) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    cancel();
  });

  return (
    <ModeShell
      mode={mode === 'idle' ? 'idle' : 'add'}
      onAdd={startAdd}
      onCancel={cancel}
      title="Portfolio links"
      count={items.length}
      emptyIcon="link-outline"
      emptyTitle="No links yet"
      emptyMessage="Add GitHub, LinkedIn, Behance or your own portfolio site."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add link'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput control={form.control} name="label" label="Label" placeholder="GitHub, LinkedIn, Portfolio…" />
          <RHFInput control={form.control} name="url" label="URL" placeholder="https://…" keyboardType="url" />
        </View>
      )}
      {mode === 'idle' && items.length > 0 && (
        <View style={styles.list}>
          {items.map((link) => (
            <PortfolioLinkCard
              key={link.id}
              item={link}
              onEdit={() => startEdit(link)}
              onDelete={() => {
                void remove(link.id);
              }}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

const styles = StyleSheet.create({
  submitRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  submitButton: {
    flex: 1,
  },
  list: {
    gap: Spacing.two + 2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  col: {
    flex: 1,
  },
});

// keep View import referenced for tree-shake guard
export const _ = View;
