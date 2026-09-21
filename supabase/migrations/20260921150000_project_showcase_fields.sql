-- Flexible Projects (spec §6 Profile → Portfolio → Projects).
-- Projects must work for every student background — academic, lab, design,
-- business, social, diploma — not just software, so no link is required:
-- a project can be showcased with description, role, images and documents.
-- All columns are additive; legacy rows keep working (project_type stays
-- null for them until the student next edits).
--
-- Cover images / report documents upload into the existing private
-- `certificates` bucket (JPG/PNG/PDF) as bucket-qualified storage paths,
-- exactly like certificate files and marksheets.

alter table public.user_projects
  add column if not exists project_type text,
  add column if not exists details text,
  add column if not exists role text,
  add column if not exists organization text,
  add column if not exists course_name text,
  add column if not exists is_team boolean not null default false,
  add column if not exists team_members text[] not null default '{}',
  add column if not exists repo_url text,
  add column if not exists demo_url text,
  add column if not exists cover_url text,
  add column if not exists document_url text;
