import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import {
  CERTIFICATE_TYPE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EDUCATION_RESULT_SCALE_OPTIONS,
  EDUCATION_RESULT_TYPE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from '@kse/shared';
import {
  EDUCATION_BOARDS,
  EDUCATION_RESULT_SCALES,
  EDUCATION_RESULT_TYPES,
  KHULNA_DIVISION_DISTRICTS,
  POSTGRAD_DEGREE_TYPES,
  PROJECT_TYPES,
  STUDY_GROUPS,
  UNDERGRAD_DEGREE_TYPES,
  type EducationLevel,
  type PortfolioAchievementItem,
  type PortfolioCertificateItem,
  type PortfolioEducationItem,
  type PortfolioLinkItem,
  type PortfolioProjectItem,
  type PortfolioResearchItem,
  type PortfolioResumeItem,
} from '@kse/types';

import {
  projectFormSchema,
  certificateFormSchema,
  achievementFormSchema,
  researchFormSchema,
  resumeFormSchema,
  portfolioLinkFormSchema,
  educationFormSchema,
  type ProjectFormValues,
  type CertificateFormValues,
  type AchievementFormValues,
  type ResearchFormValues,
  type ResumeFormValues,
  type PortfolioLinkFormValues,
  type EducationFormValues,
} from '@kse/validation';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/types/icon';
import {
  BOARD_OPTIONS,
  EDUCATION_LEVEL_SPECS,
  GROUP_OPTIONS,
} from '@/features/portfolio/education-levels';
import { FileField } from '@/features/portfolio/file-field';
import { InstitutionPickerSheet, type InstitutionPickerResult } from '@/features/portfolio/institution-picker-sheet';
import {
  RHFInput,
  RHFSelect,
  RHFToggle,
  RHFChipList,
  ErrorBanner,
} from '@/features/portfolio/forms';
import type { PortfolioDetailItem } from '@/features/portfolio/detail-sheet';
import {
  AchievementCard,
  CertificateCard,
  EducationCard,
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
  emptyIcon: IconName;
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
  const colors = useTheme();
  const isFormOpen = mode !== 'idle';
  return (
    <View>
      <SectionHeader
        title={title}
        actionLabel={isFormOpen ? 'Cancel' : 'Add'}
        onAction={isFormOpen ? onCancel : onAdd}
      />

      {isFormOpen ? (
        <Card
          tint="background"
          style={[
            styles.formCard,
            { borderColor: colors.border, boxShadow: `0px 1px 6px ${colors.shadow}` },
          ]}
        >
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
              icon={emptyIcon}
              title={emptyTitle}
              message={emptyMessage}
            />
          )}
        </>
      )}
    </View>
  );
}

// ── Education ────────────────────────────────────────────────────────────────

const EDUCATION_FORM_DEFAULTS: EducationFormValues = {
  level: '',
  district: '',
  institution: '',
  institution_id: '',
  board: '',
  study_group: '',
  degree_type: '',
  program_name: '',
  major: '',
  campus: '',
  research_area: '',
  thesis_title: '',
  supervisor: '',
  roll_number: '',
  registration_number: '',
  start_year: '',
  passing_year: '',
  is_ongoing: false,
  result_type: '',
  result: '',
  result_scale: '',
  document_url: '',
};

const DISTRICT_OPTIONS = KHULNA_DIVISION_DISTRICTS.map((value) => ({ value, label: value }));

/**
 * Item columns are free text (Zod gates them on write); coerce a stored value
 * back into a select's union, falling back to '' when it doesn't match —
 * legacy/manual rows simply re-open with that select unset.
 */
function toSelectValue<T extends string>(stored: string | null, allowed: readonly T[]): T | '' {
  const value = stored ?? '';
  return (allowed as readonly string[]).includes(value) ? (value as T) : '';
}

const DEGREE_TYPES: readonly string[] = [
  ...UNDERGRAD_DEGREE_TYPES,
  ...POSTGRAD_DEGREE_TYPES,
];

function educationToFormValues(item: PortfolioEducationItem | null): EducationFormValues {
  if (!item) return { ...EDUCATION_FORM_DEFAULTS };
  return {
    level: item.level,
    district: item.district ?? '',
    institution: item.institution,
    institution_id: item.institutionId ?? '',
    board: toSelectValue(item.board, EDUCATION_BOARDS),
    study_group: toSelectValue(item.studyGroup, STUDY_GROUPS),
    degree_type: toSelectValue(item.degreeType, DEGREE_TYPES),
    program_name: item.programName ?? '',
    major: item.major ?? '',
    campus: item.campus ?? '',
    research_area: item.researchArea ?? '',
    thesis_title: item.thesisTitle ?? '',
    supervisor: item.supervisor ?? '',
    roll_number: item.rollNumber ?? '',
    registration_number: item.registrationNumber ?? '',
    start_year: item.startYear != null ? String(item.startYear) : '',
    passing_year: item.passingYear != null ? String(item.passingYear) : '',
    is_ongoing: item.isOngoing,
    result_type: toSelectValue(item.resultType, EDUCATION_RESULT_TYPES),
    result: item.result ?? '',
    // numeric 4 → "4.00", 5 → "5.00", 100 → "100" (the select values).
    result_scale: toSelectValue(
      item.resultScale == null
        ? null
        : item.resultScale === 100
          ? '100'
          : item.resultScale.toFixed(2),
      EDUCATION_RESULT_SCALES,
    ),
    document_url: item.documentUrl ?? '',
  };
}

interface EducationSectionProps {
  items: PortfolioEducationItem[];
  isSaving: boolean;
  create(values: EducationFormValues): Promise<void>;
  update(id: string, values: EducationFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
  /** Opens the detail sheet for the given education row. */
  onOpen?(item: PortfolioEducationItem): void;
}

/**
 * Add/edit education with level-driven fields (spec: Bangladesh education
 * system). Selecting a level swaps in only the fields that level uses —
 * SSC/HSC get board + group + roll, degrees get program + CGPA, MPhil/PhD
 * get research details — per EDUCATION_LEVEL_SPECS.
 */
export function EducationSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
  onOpen,
}: EducationSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: educationToFormValues(editing),
  });

  const level = (useWatch({ control: form.control, name: 'level' }) ?? '') as EducationLevel | '';
  const district = useWatch({ control: form.control, name: 'district' }) ?? '';
  const institutionName = useWatch({ control: form.control, name: 'institution' }) ?? '';
  const resultType = useWatch({ control: form.control, name: 'result_type' }) ?? '';
  const isOngoing = useWatch({ control: form.control, name: 'is_ongoing' }) ?? false;
  const spec = level ? EDUCATION_LEVEL_SPECS[level] : null;

  const startAdd = () => {
    setEditingId(null);
    form.reset({ ...EDUCATION_FORM_DEFAULTS });
    setMode('add');
  };
  const startEdit = (item: PortfolioEducationItem) => {
    setEditingId(item.id);
    form.reset(educationToFormValues(item));
    setMode('add');
  };
  const cancel = () => {
    form.reset({ ...EDUCATION_FORM_DEFAULTS });
    setEditingId(null);
    setMode('idle');
  };

  /** Switching levels re-applies the level's result defaults so a 5.00-scale
   *  GPA doesn't leak into a 4.00-scale CGPA (and vice versa). Switching
   *  the district clears any previously-picked institution because Khulna
   *  institutions aren't valid for Bagerhat and vice-versa. */
  const selectLevel = (next: string | null) => {
    const value = (next ?? '') as EducationLevel | '';
    form.setValue('level', value, { shouldDirty: true, shouldValidate: true });
    if (!value) return;
    const nextSpec = EDUCATION_LEVEL_SPECS[value];
    form.setValue('result_type', nextSpec.defaultResultType ?? '', { shouldDirty: true });
    form.setValue('result_scale', nextSpec.defaultResultScale ?? '', { shouldDirty: true });
    form.setValue('is_ongoing', false, { shouldDirty: true });
  };

  const selectDistrict = (next: string | null) => {
    form.setValue('district', next ?? '', { shouldDirty: true, shouldValidate: true });
    // District change clears the institution pick — Khulna picks don't apply
    // to Bagerhat etc.
    form.setValue('institution', '', { shouldDirty: true });
    form.setValue('institution_id', '', { shouldDirty: true });
  };

  const selectInstitution = (next: InstitutionPickerResult) => {
    form.setValue('institution_id', next.id, { shouldDirty: true, shouldValidate: true });
    form.setValue('institution', next.name, { shouldDirty: true, shouldValidate: true });
    form.clearErrors('institution');
  };

  const submit = form.handleSubmit(async (values) => {
    // Soft duplicate guard: identical level + institution + year is almost
    // always a double-submit, not two real qualifications.
    const passing = values.passing_year === '' ? null : Number(values.passing_year);
    const duplicate = items.some(
      (it) =>
        it.id !== editing?.id &&
        it.level === values.level &&
        it.institution.trim().toLowerCase() === values.institution.trim().toLowerCase() &&
        it.passingYear === passing,
    );
    if (duplicate) {
      form.setError('institution', {
        message: 'This qualification is already in your portfolio (same level, institution and year).',
      });
      return;
    }
    if (editing) await update(editing.id, values);
    else await create(values);
    cancel();
  });

  const showResultValue =
    resultType === 'gpa' ||
    resultType === 'cgpa' ||
    resultType === 'percentage' ||
    resultType === 'division';

  return (
    <ModeShell
      mode={mode === 'idle' ? 'idle' : 'add'}
      onAdd={startAdd}
      onCancel={cancel}
      title="Education"
      count={items.length}
      emptyIcon="school-outline"
      emptyTitle="No education added"
      emptyMessage="Add your SSC, HSC, diploma or degree — everything from PSC to PhD, with boards, groups and GPA/CGPA."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add education'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFSelect
            control={form.control}
            name="level"
            label="Education level"
            options={EDUCATION_LEVEL_OPTIONS}
            placeholder="Select level"
            clearable={false}
            onSelect={selectLevel}
          />
          <RHFSelect
            control={form.control}
            name="district"
            label="District"
            options={DISTRICT_OPTIONS}
            placeholder="Select district"
            clearable={false}
            onSelect={selectDistrict}
          />
          {spec ? (
            <>
              <Controller
                control={form.control}
                name="institution"
                render={({ fieldState }) => (
                  <InstitutionPickerField
                    label={spec.institutionLabel}
                    value={institutionName}
                    disabled={!level}
                    onPress={() => setPickerOpen(true)}
                    error={fieldState.error?.message ?? null}
                  />
                )}
              />
              {spec.degreeOptions ? (
                <RHFSelect
                  control={form.control}
                  name="degree_type"
                  label={spec.degreeLabel ?? 'Degree type'}
                  options={spec.degreeOptions}
                  placeholder="Select degree"
                  clearable={false}
                />
              ) : null}
              {spec.programLabel ? (
                <RHFInput
                  control={form.control}
                  name="program_name"
                  label={spec.programLabel}
                  placeholder="e.g. Computer Science & Engineering"
                />
              ) : null}
              {spec.majorLabel ? (
                <RHFInput control={form.control} name="major" label={spec.majorLabel} />
              ) : null}
              {spec.showCampus ? (
                <RHFInput
                  control={form.control}
                  name="campus"
                  label="Campus (optional)"
                />
              ) : null}
              {spec.boardLabel ? (
                <RHFSelect
                  control={form.control}
                  name="board"
                  label={spec.boardLabel}
                  options={BOARD_OPTIONS}
                  placeholder="Select board"
                  clearable={spec.boardOptional}
                />
              ) : null}
              {spec.showGroup ? (
                <RHFSelect
                  control={form.control}
                  name="study_group"
                  label="Group"
                  options={GROUP_OPTIONS}
                  placeholder="Select group"
                  clearable={false}
                />
              ) : null}
              {spec.showResearch ? (
                <>
                  <RHFInput
                    control={form.control}
                    name="research_area"
                    label="Research area"
                  />
                  <RHFInput
                    control={form.control}
                    name="thesis_title"
                    label="Thesis / Dissertation title (optional)"
                  />
                  <RHFInput
                    control={form.control}
                    name="supervisor"
                    label="Supervisor (optional)"
                  />
                </>
              ) : null}

              <View style={styles.row}>
                {spec.useRangeYears ? (
                  <View style={styles.col}>
                    <RHFInput
                      control={form.control}
                      name="start_year"
                      label="Start year"
                      placeholder="2025"
                      keyboardType="numeric"
                    />
                  </View>
                ) : null}
                <View style={styles.col}>
                  <RHFInput
                    control={form.control}
                    name="passing_year"
                    label={
                      spec.useRangeYears
                        ? isOngoing
                          ? 'Expected year'
                          : 'Graduation year'
                        : 'Passing year'
                    }
                    placeholder="2029"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {spec.useRangeYears ? (
                <RHFToggle
                  control={form.control}
                  name="is_ongoing"
                  label="Still studying here"
                />
              ) : null}

              <View style={styles.row}>
                <View style={styles.col}>
                  <RHFSelect
                    control={form.control}
                    name="result_type"
                    label="Result type"
                    options={EDUCATION_RESULT_TYPE_OPTIONS}
                    placeholder="No result yet"
                  />
                </View>
                {showResultValue ? (
                  <View style={styles.col}>
                    <RHFInput
                      control={form.control}
                      name="result"
                      label="Result"
                      placeholder={
                        resultType === 'percentage'
                          ? '85'
                          : resultType === 'division'
                            ? 'First Class'
                            : '5.00'
                      }
                      keyboardType={resultType === 'division' ? 'default' : 'numeric'}
                    />
                  </View>
                ) : null}
              </View>
              {resultType === 'gpa' || resultType === 'cgpa' ? (
                <RHFSelect
                  control={form.control}
                  name="result_scale"
                  label="Scale"
                  options={EDUCATION_RESULT_SCALE_OPTIONS}
                  clearable={false}
                />
              ) : null}

              {spec.showRoll ? (
                <View style={styles.row}>
                  <View style={styles.col}>
                    <RHFInput
                      control={form.control}
                      name="roll_number"
                      label="Roll number (private)"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.col}>
                    <RHFInput
                      control={form.control}
                      name="registration_number"
                      label="Registration (private)"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ) : null}

              <Controller
                control={form.control}
                name="document_url"
                render={({ field }) => (
                  <FileField
                    label={spec.documentLabel}
                    hint="JPG, PNG or PDF · images up to 5 MB, PDF up to 10 MB"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </>
          ) : null}
        </View>
      )}
      {mode === 'idle' && items.length > 0 && (
        <View style={styles.list}>
          {items.map((item) => (
            <EducationCard
              key={item.id}
              item={item}
              onEdit={() => startEdit(item)}
              onDelete={() => {
                void remove(item.id);
              }}
              onOpen={onOpen ? () => onOpen(item) : undefined}
            />
          ))}
        </View>
      )}

      <InstitutionPickerSheet
        visible={pickerOpen}
        level={level}
        district={district.trim() === '' ? null : district.trim()}
        onClose={() => setPickerOpen(false)}
        onSelect={selectInstitution}
      />
    </ModeShell>
  );
}

// ── Institution picker trigger row ──────────────────────────────────────────

interface InstitutionPickerFieldProps {
  label: string;
  value: string;
  disabled?: boolean;
  onPress(): void;
  error?: string | null;
}

/**
 * The "Choose institution" row inside the Add-Education form. Tapping opens
 * the searchable picker; the chosen institution name is rendered in place.
 * Until an education level is picked the row stays disabled — the picker
 * filters by level type, so opening it without one would be confusing.
 */
function InstitutionPickerField({
  label,
  value,
  disabled,
  onPress,
  error,
}: InstitutionPickerFieldProps) {
  const colors = useTheme();
  const empty = value.trim() === '';
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={value ? `Change institution: ${value}` : 'Choose institution'}
        style={({ pressed }) => [
          pickerStyles.row,
          { backgroundColor: colors.backgroundElement },
          empty && pickerStyles.rowEmpty,
          disabled && pickerStyles.rowDisabled,
          pressed && pickerStyles.pressed,
        ]}
      >
        <Text
          style={[
            pickerStyles.value,
            { color: empty ? colors.textSecondary : colors.text },
          ]}
          numberOfLines={1}
        >
          {empty ? 'Choose institution…' : value}
        </Text>
        <Ionicons
          name={disabled ? 'lock-closed-outline' : 'chevron-down'}
          size={16}
          color={disabled ? colors.textMuted : colors.textSecondary}
        />
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

// ── Projects ────────────────────────────────────────────────────────────────

const PROJECT_FORM_DEFAULTS: ProjectFormValues = {
  title: '',
  project_type: '',
  description: '',
  details: '',
  role: '',
  organization: '',
  course_name: '',
  is_team: false,
  team_members: [],
  tech_stack: [],
  started_on: '',
  completed_on: '',
  url: '',
  repo_url: '',
  demo_url: '',
  cover_url: '',
  document_url: '',
};

interface ProjectsSectionProps {
  items: PortfolioProjectItem[];
  isSaving: boolean;
  create(values: ProjectFormValues): Promise<void>;
  update(id: string, values: ProjectFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
  /** Opens the detail sheet for the given project row. */
  onOpen?(item: PortfolioProjectItem): void;
}

/**
 * Projects for every student background — academic, lab, design, business,
 * social, diploma — not just software. No link is required: a project can
 * be showcased with description, role, cover image and documents alone.
 */
export function ProjectsSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
  onOpen,
}: ProjectsSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: projectToFormValues(editing),
  });

  const isTeam = useWatch({ control: form.control, name: 'is_team' }) ?? false;

  const startAdd = () => {
    setEditingId(null);
    form.reset({ ...PROJECT_FORM_DEFAULTS });
    setMode('add');
  };

  const startEdit = (item: PortfolioProjectItem) => {
    setEditingId(item.id);
    form.reset(projectToFormValues(item));
    setMode('add');
  };

  const cancel = () => {
    form.reset({ ...PROJECT_FORM_DEFAULTS });
    setEditingId(null);
    setMode('idle');
  };

  const submit = form.handleSubmit(async (values) => {
    // Values stay strings here; the toXPayload mappers in the screen binding
    // own blank→null conversion. Running blankToNull first would hand them
    // nulls and crash their .trim() calls.
    if (editing) {
      await update(editing.id, values);
    } else {
      await create(values);
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
      emptyIcon="folder-open-outline"
      emptyTitle="No projects yet"
      emptyMessage="Showcase any project — academic, lab, design, business, community or software. Links are optional."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add project'}
    >
      {mode !== 'idle' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput
            control={form.control}
            name="title"
            label="Project title"
            placeholder="e.g. Low-cost Water Quality Sensor"
          />
          <RHFSelect
            control={form.control}
            name="project_type"
            label="Project type"
            options={PROJECT_TYPE_OPTIONS}
            placeholder="Select type"
            clearable={false}
          />
          <RHFInput
            control={form.control}
            name="description"
            label="Short description"
            placeholder="One or two lines about the project"
            multiline
          />
          <RHFInput
            control={form.control}
            name="details"
            label="Detailed description (optional)"
            placeholder="Approach, results, outcomes…"
            multiline
          />
          <RHFInput
            control={form.control}
            name="role"
            label="Your role / contribution (optional)"
            placeholder="e.g. Team lead, circuit design, field survey"
          />
          <RHFInput
            control={form.control}
            name="organization"
            label="Institution / organization (optional)"
            placeholder="University, college, club, NGO…"
          />
          <RHFInput
            control={form.control}
            name="course_name"
            label="Course / subject (optional)"
            placeholder="e.g. EEE 4101: Final Year Project"
          />
          <RHFToggle control={form.control} name="is_team" label="Team project" />
          {isTeam ? (
            <RHFChipList
              control={form.control}
              name="team_members"
              label="Team members (optional)"
              placeholder="Type a name and press return…"
            />
          ) : null}
          <RHFChipList
            control={form.control}
            name="tech_stack"
            label="Technologies / tools / skills (optional)"
            placeholder="Arduino, Excel, Figma, lab equipment…"
          />
          <View style={styles.row}>
            <View style={styles.col}>
              <RHFInput control={form.control} name="started_on" label="Start date (optional)" placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.col}>
              <RHFInput control={form.control} name="completed_on" label="End date (optional)" placeholder="YYYY-MM-DD" />
            </View>
          </View>
          <Controller
            control={form.control}
            name="cover_url"
            render={({ field }) => (
              <FileField
                label="Cover image (optional)"
                hint="JPG, PNG or PDF · images up to 5 MB"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="document_url"
            render={({ field }) => (
              <FileField
                label="Report / presentation (optional)"
                hint="JPG, PNG or PDF · PDF up to 10 MB"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <RHFInput
            control={form.control}
            name="url"
            label="Project link (optional)"
            placeholder="https://…"
            keyboardType="url"
          />
          <RHFInput
            control={form.control}
            name="repo_url"
            label="GitHub / code repository (optional)"
            placeholder="https://github.com/…"
            keyboardType="url"
          />
          <RHFInput
            control={form.control}
            name="demo_url"
            label="Demo / video link (optional)"
            placeholder="https://youtube.com/…"
            keyboardType="url"
          />
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
              onOpen={onOpen ? () => onOpen(project) : undefined}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

function projectToFormValues(item: PortfolioProjectItem | null): ProjectFormValues {
  if (!item) return { ...PROJECT_FORM_DEFAULTS };
  return {
    title: item.title,
    project_type: toSelectValue(item.projectType, PROJECT_TYPES),
    description: item.description ?? '',
    details: item.details ?? '',
    role: item.role ?? '',
    organization: item.organization ?? '',
    course_name: item.courseName ?? '',
    is_team: item.isTeam,
    team_members: item.teamMembers,
    tech_stack: item.techStack,
    started_on: item.startedOn ?? '',
    completed_on: item.completedOn ?? '',
    url: item.url ?? '',
    repo_url: item.repoUrl ?? '',
    demo_url: item.demoUrl ?? '',
    cover_url: item.coverUrl ?? '',
    document_url: item.documentUrl ?? '',
  };
}

// ── Certificates ────────────────────────────────────────────────────────────

const CERTIFICATE_FORM_DEFAULTS: CertificateFormValues = {
  title: '',
  certificate_type: '',
  issuer: '',
  program_name: '',
  issued_on: '',
  expires_on: '',
  credential_id: '',
  credential_url: '',
  verification_url: '',
  description: '',
  file_url: '',
};

function certificateToFormValues(item: PortfolioCertificateItem | null): CertificateFormValues {
  if (!item) return { ...CERTIFICATE_FORM_DEFAULTS };
  return {
    title: item.title,
    certificate_type: (item.certificateType ?? '') as CertificateFormValues['certificate_type'],
    issuer: item.issuer ?? '',
    program_name: item.programName ?? '',
    issued_on: item.issuedOn ?? '',
    expires_on: item.expiresOn ?? '',
    credential_id: item.credentialId ?? '',
    credential_url: item.credentialUrl ?? '',
    verification_url: item.verificationUrl ?? '',
    description: item.description ?? '',
    file_url: item.fileUrl ?? '',
  };
}

interface CertificatesSectionProps {
  items: PortfolioCertificateItem[];
  isSaving: boolean;
  create(values: CertificateFormValues): Promise<void>;
  update(id: string, values: CertificateFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
  /** Opens the detail sheet for the given certificate row. */
  onOpen?(item: PortfolioCertificateItem): void;
}

/**
 * Non-academic certificates: courses, training, competitions, workshops…
 * (Academic qualifications belong to the Education section above.) Supports
 * uploading the actual certificate (JPG/PNG/PDF into private storage) or
 * linking an external credential URL.
 */
export function CertificatesSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
  onOpen,
}: CertificatesSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: certificateToFormValues(editing),
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ ...CERTIFICATE_FORM_DEFAULTS });
    setMode('add');
  };
  const startEdit = (item: PortfolioCertificateItem) => {
    setEditingId(item.id);
    form.reset(certificateToFormValues(item));
    setMode('add');
  };
  const cancel = () => {
    form.reset({ ...CERTIFICATE_FORM_DEFAULTS });
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
      title="Certificates"
      count={items.length}
      emptyIcon="shield-checkmark-outline"
      emptyTitle="No certificates yet"
      emptyMessage="Add course, training, competition or workshop certificates you've earned."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add certificate'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <RHFInput control={form.control} name="title" label="Certificate title" />
          <RHFSelect
            control={form.control}
            name="certificate_type"
            label="Certificate type"
            options={CERTIFICATE_TYPE_OPTIONS}
            placeholder="Select type"
            clearable={false}
          />
          <RHFInput
            control={form.control}
            name="issuer"
            label="Issuing organization"
            placeholder="Coursera, ICT Division, IEEE…"
          />
          <RHFInput
            control={form.control}
            name="program_name"
            label="Course / Program name (optional)"
          />
          <View style={styles.row}>
            <View style={styles.col}>
              <RHFInput
                control={form.control}
                name="issued_on"
                label="Issued on"
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.col}>
              <RHFInput
                control={form.control}
                name="expires_on"
                label="Expires on (optional)"
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
          <RHFInput control={form.control} name="credential_id" label="Credential ID (optional)" />
          <RHFInput
            control={form.control}
            name="credential_url"
            label="Credential URL (optional)"
            placeholder="https://…"
            keyboardType="url"
          />
          <RHFInput
            control={form.control}
            name="verification_url"
            label="Verification URL (optional)"
            placeholder="https://…"
            keyboardType="url"
          />
          <RHFInput
            control={form.control}
            name="description"
            label="Description (optional)"
            multiline
          />
          <Controller
            control={form.control}
            name="file_url"
            render={({ field }) => (
              <FileField
                label="Certificate file"
                hint="JPG, PNG or PDF · images up to 5 MB, PDF up to 10 MB"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
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
              onOpen={onOpen ? () => onOpen(cert) : undefined}
            />
          ))}
        </View>
      )}
    </ModeShell>
  );
}

// ── Achievements ────────────────────────────────────────────────────────────

interface AchievementsSectionProps {
  items: PortfolioAchievementItem[];
  isSaving: boolean;
  create(values: AchievementFormValues): Promise<void>;
  update(id: string, values: AchievementFormValues): Promise<void>;
  remove(id: string): Promise<void>;
  errorMessage: string | null;
  /** Opens the detail sheet for the given achievement row. */
  onOpen?(item: PortfolioAchievementItem): void;
}

export function AchievementsSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
  onOpen,
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
    if (editing) await update(editing.id, values);
    else await create(values);
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
              onOpen={onOpen ? () => onOpen(a) : undefined}
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
  /** Opens the detail sheet for the given research row. */
  onOpen?(item: PortfolioResearchItem): void;
}

export function ResearchSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
  onOpen,
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
    if (editing) await update(editing.id, values);
    else await create(values);
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
              onOpen={onOpen ? () => onOpen(r) : undefined}
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
  /** Opens the detail sheet for the given resume row. */
  onOpen?(item: PortfolioResumeItem): void;
}

export function ResumesSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
  onOpen,
}: ResumesSectionProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((it) => it.id === editingId) ?? null;

  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeFormSchema),
    defaultValues: { file_url: '', file_name: '', is_primary: false },
  });

  const startAdd = () => {
    setEditingId(null);
    form.reset({ file_url: '', file_name: '', is_primary: items.length === 0 });
    setMode('add');
  };
  const startEdit = (item: PortfolioResumeItem) => {
    setEditingId(item.id);
    form.reset({
      file_url: item.fileUrl,
      file_name: item.fileName ?? '',
      is_primary: item.isPrimary,
    });
    setMode('add');
  };
  const cancel = () => {
    form.reset({ file_url: '', file_name: '', is_primary: false });
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
      title="Resume / CV"
      count={items.length}
      emptyIcon="document-text-outline"
      emptyTitle="No resume yet"
      emptyMessage="Upload your CV as a PDF — stored privately and opened with a secure link — or add a public link."
      isSaving={isSaving}
      onSubmit={submit}
      saveLabel={editing ? 'Save changes' : 'Add resume'}
    >
      {mode === 'add' && (
        <View>
          <ErrorBanner message={errorMessage} />
          <Controller
            control={form.control}
            name="file_url"
            render={({ field }) => (
              <FileField
                label="Resume file"
                hint="PDF up to 10 MB · private to you"
                bucket="resumes"
                value={field.value ?? ''}
                onChange={field.onChange}
                onFileName={(name) => form.setValue('file_name', name ?? '')}
              />
            )}
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
              onOpen={onOpen ? () => onOpen(r) : undefined}
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
  /** Opens the detail sheet for the given link row. */
  onOpen?(item: PortfolioLinkItem): void;
}

export function PortfolioLinksSection({
  items,
  isSaving,
  create,
  update,
  remove,
  errorMessage,
  onOpen,
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
              onOpen={onOpen ? () => onOpen(link) : undefined}
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
  formCard: {
    borderWidth: 1,
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
  field: {
    gap: 6,
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  error: {
    fontSize: 13,
  },
});

const pickerStyles = StyleSheet.create({
  row: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowEmpty: {
    opacity: 0.8,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  value: {
    fontSize: 16,
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
