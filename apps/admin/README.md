# KSE Admin

Next.js admin content portal for KSE — Khulna Student Ecosystem.
Manual content management for internships, scholarships, events, workshops,
tuition/tutors, mentors, communities, users and platform settings.

- Next.js App Router (`src/app`) + TypeScript strict
- Tailwind CSS
- Supabase Auth + server-side privileged client

## Run

```bash
pnpm install            # from repo root
pnpm --filter admin dev
```

Environment variables live in `apps/admin/.env.local` (see root `.env.example`).
`SUPABASE_SERVICE_ROLE_KEY` is server-only — never referenced from client code.
