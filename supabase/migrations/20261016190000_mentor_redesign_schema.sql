-- ── Mentor section redesign schema & data enrichment ──────────────────────────
-- Adds rating, experience, education metadata to opportunities for mentors,
-- enriches the 8 founding mentors with complete profiles, and enhances
-- mentorship_requests to support opportunity-backed session bookings and inquiries.

-- 1. Add mentor metadata columns to opportunities
alter table public.opportunities
  add column if not exists rating_avg numeric(3, 2) not null default 4.80,
  add column if not exists rating_count integer not null default 1,
  add column if not exists experience_years smallint not null default 3,
  add column if not exists education text;

-- 2. Enhance mentorship_requests to support opportunity-backed mentors & session bookings
alter table public.mentorship_requests
  alter column mentor_id drop not null,
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade,
  add column if not exists preferred_date date,
  add column if not exists preferred_time text,
  add column if not exists session_mode text default 'online',
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists request_type text default 'session';

create index if not exists mentorship_requests_opportunity_idx
  on public.mentorship_requests (opportunity_id);

-- Drop old strict insert policy if it exists and replace with one supporting opportunity_id
drop policy if exists mentorship_requests_insert_own on public.mentorship_requests;

create policy mentorship_requests_insert_own on public.mentorship_requests
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and (
      opportunity_id is not null
      or (
        mentor_id is not null
        and exists (
          select 1 from public.mentors m
          where m.id = mentor_id and m.is_verified and m.status = 'active'
        )
      )
    )
  );

-- 3. Populate rich mentor data for the 8 seeded mentors
update public.opportunities
set
  rating_avg = 4.90,
  rating_count = 142,
  experience_years = 8,
  education = 'BSc in Computer Science & Engineering · KUET'
where id = 'aaaaaaa1-0000-4000-8000-000000000001';

update public.opportunities
set
  rating_avg = 4.90,
  rating_count = 118,
  experience_years = 6,
  education = 'BSc in Architecture & Design · Khulna University'
where id = 'aaaaaaa1-0000-4000-8000-000000000002';

update public.opportunities
set
  rating_avg = 4.80,
  rating_count = 95,
  experience_years = 5,
  education = 'MSc (Commonwealth Scholar) · KUET'
where id = 'aaaaaaa1-0000-4000-8000-000000000003';

update public.opportunities
set
  rating_avg = 4.90,
  rating_count = 124,
  experience_years = 5,
  education = 'PhD Researcher | MSc Statistics · University of Dhaka'
where id = 'aaaaaaa1-0000-4000-8000-000000000004';

update public.opportunities
set
  rating_avg = 4.70,
  rating_count = 83,
  experience_years = 6,
  education = 'BSc in Computer Science · Khulna University'
where id = 'aaaaaaa1-0000-4000-8000-000000000005';

update public.opportunities
set
  rating_avg = 4.80,
  rating_count = 156,
  experience_years = 10,
  education = 'MBA in Human Resources · University of Dhaka'
where id = 'aaaaaaa1-0000-4000-8000-000000000006';

update public.opportunities
set
  rating_avg = 4.80,
  rating_count = 87,
  experience_years = 5,
  education = 'BSc in CSE · Jashore University of Science & Technology'
where id = 'aaaaaaa1-0000-4000-8000-000000000007';

update public.opportunities
set
  rating_avg = 4.90,
  rating_count = 210,
  experience_years = 6,
  education = 'MA & BA in English Language & Literature · Khulna University'
where id = 'aaaaaaa1-0000-4000-8000-000000000008';
