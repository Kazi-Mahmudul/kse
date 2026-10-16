-- ── Mentor Chat, Free Questions & Community Discussions ────────────────────────
-- Adds tables supporting screens 6–10 of the mentor section redesign.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. mentor_messages — per-opportunity DM thread (student ↔ mentor)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.mentor_messages (
  id           uuid        primary key default gen_random_uuid(),
  opportunity_id uuid      not null references public.opportunities(id) on delete cascade,
  sender_id    uuid        not null references auth.users(id) on delete cascade,
  content      text        not null,
  is_read      boolean     not null default false,
  created_at   timestamptz not null default now(),
  constraint mentor_messages_content_check
    check (char_length(trim(content)) > 0 and char_length(content) <= 2000)
);

create index if not exists mentor_messages_thread_idx
  on public.mentor_messages (opportunity_id, created_at asc);

alter table public.mentor_messages enable row level security;

-- Students can read messages in threads they are part of
create policy mentor_messages_select on public.mentor_messages
  for select to authenticated
  using (sender_id = auth.uid());

-- Students can send messages in any published mentor thread
create policy mentor_messages_insert on public.mentor_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id
        and o.type = 'mentorship'
        and o.status = 'published'
    )
  );

-- Enable realtime for live chat
alter publication supabase_realtime add table public.mentor_messages;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. mentor_questions — free question submissions from students
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.mentor_questions (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references auth.users(id) on delete cascade,
  opportunity_id uuid       references public.opportunities(id) on delete set null,
  category      text        not null default 'General Guidance',
  question      text        not null,
  answer        text,
  answered_by   uuid        references auth.users(id) on delete set null,
  answered_at   timestamptz,
  status        text        not null default 'pending'
                  check (status in ('pending', 'answered', 'closed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint mentor_questions_length_check
    check (char_length(trim(question)) > 0 and char_length(question) <= 500)
);

create index if not exists mentor_questions_student_idx
  on public.mentor_questions (student_id, created_at desc);

alter table public.mentor_questions enable row level security;

create policy mentor_questions_select on public.mentor_questions
  for select to authenticated
  using (student_id = auth.uid());

create policy mentor_questions_insert on public.mentor_questions
  for insert to authenticated
  with check (student_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. mentor_discussions — posts from mentors for the community section
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.mentor_discussions (
  id             uuid        primary key default gen_random_uuid(),
  opportunity_id uuid        not null references public.opportunities(id) on delete cascade,
  title          text        not null,
  content        text        not null,
  likes_count    integer     not null default 0,
  comments_count integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists mentor_discussions_created_idx
  on public.mentor_discussions (created_at desc);

alter table public.mentor_discussions enable row level security;

create policy mentor_discussions_select on public.mentor_discussions
  for select to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed founding mentor discussions (6 posts across 4 mentors)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.mentor_discussions (id, opportunity_id, title, content, likes_count, comments_count, created_at)
values
  (
    'dddddd01-0000-4000-8000-000000000001',
    'aaaaaaa1-0000-4000-8000-000000000001',
    'Tips for Research Publication in Top Journals',
    'Publishing in a good journal takes time, but it is possible with the right approach. Here are some key tips that helped me get published in IEEE and ACM: (1) Choose the right venue early — conference vs journal. (2) Write a compelling abstract first. (3) Address reviewers systematically.',
    24, 12,
    now() - interval '2 hours'
  ),
  (
    'dddddd01-0000-4000-8000-000000000002',
    'aaaaaaa1-0000-4000-8000-000000000004',
    'Best Fully Funded Scholarships for Bangladeshi Students 2025',
    'Here are some fully funded scholarships you can apply for in 2025. Feel free to ask if you need further guidance! Chevening (UK), DAAD (Germany), Monbukagakusho (Japan), Fulbright (USA), CSC (China). I have personally helped 3 students get admitted this cycle.',
    18, 7,
    now() - interval '5 hours'
  ),
  (
    'dddddd01-0000-4000-8000-000000000003',
    'aaaaaaa1-0000-4000-8000-000000000006',
    'How to Build a Strong Resume for Tech Companies',
    'After reviewing hundreds of resumes, here is what separates good from great: quantify your impact, keep it to one page, lead with achievements not responsibilities. The ATS keywords matter — tailor for each role. Happy to review your resume in a 1:1 session.',
    31, 15,
    now() - interval '1 day'
  ),
  (
    'dddddd01-0000-4000-8000-000000000004',
    'aaaaaaa1-0000-4000-8000-000000000002',
    'Architecture Portfolio Tips for Graduate Admissions',
    'Your portfolio is your best argument. 12–20 pages max, lead with your strongest project, show process not just final renders. International programs want to see conceptual thinking. I am happy to do a portfolio review session before your deadline.',
    14, 8,
    now() - interval '2 days'
  ),
  (
    'dddddd01-0000-4000-8000-000000000005',
    'aaaaaaa1-0000-4000-8000-000000000005',
    'Getting Into FAANG: My Roadmap for Software Engineers',
    'I spent 6 months preparing for FAANG interviews while working full-time. Here is my exact study plan: Month 1-2 — Data structures. Month 3-4 — Algorithms + LeetCode 150. Month 5 — System Design. Month 6 — Mock interviews. The key is consistency over intensity.',
    42, 21,
    now() - interval '3 days'
  ),
  (
    'dddddd01-0000-4000-8000-000000000006',
    'aaaaaaa1-0000-4000-8000-000000000008',
    'IELTS Speaking Band 8.5 — My Preparation Strategy',
    'After scoring 8.5 in IELTS Speaking, many students ask about my strategy. The secret: stop practicing answers, start having real conversations. Record yourself daily, watch BBC/TED, and critically evaluate your pronunciation and fluency. Consistency beats intensity every time.',
    27, 11,
    now() - interval '4 days'
  );
