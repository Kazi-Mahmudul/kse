# KSE — Khulna Student Ecosystem

Mobile-first student platform for discovering and managing opportunities in one place:
internships, scholarships, events, workshops, tuition/tutor discovery, mentorship,
communities, student portfolio, personalized recommendations, deadline tracking and
notifications.

> **Key principle:** Build a useful student product first, not a complicated technology
> platform. Manual admin-managed content before automation.

## Tech Stack

| Area | Choice |
|---|---|
| Mobile | React Native + Expo + TypeScript (Expo Router, TanStack Query, Zustand, RHF + Zod) |
| Admin | Next.js (App Router) + Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions) |
| Push | Expo Notifications |
| Rate limiting | Upstash Redis + Edge Functions |
| Email | Resend |
| Monitoring | Sentry |
| Analytics | PostHog |
| CI/CD | GitHub Actions → Vercel (admin), Supabase, Expo EAS (mobile) |

## Repository Structure

```text
kse/
├── apps/
│   ├── mobile/          # Expo React Native student app
│   └── admin/           # Next.js admin content portal
├── packages/
│   ├── shared/          # Constants and shared utilities
│   ├── types/           # Shared TypeScript types
│   └── validation/      # Shared Zod schemas
├── supabase/
│   ├── migrations/      # SQL migrations (RLS included)
│   ├── functions/       # Edge Functions
│   ├── seed.sql         # Seed / master data
│   └── config.toml      # Local Supabase config
├── docs/                # Spec, architecture, design mockups, roadmap
├── .github/workflows/
├── .env.example
└── CLAUDE.md
```

## Getting Started

### Prerequisites

- Node.js 22 LTS or newer (Expo 57 CLI needs >= 20.19.4, and supabase-js web
  rendering needs native WebSocket — Node 22+ only)
- pnpm (`npm i -g pnpm`)
- Supabase CLI (`npm i -g supabase`)
- Docker Desktop running (for local Supabase)

### Setup

```bash
pnpm install
pnpm bootstrap          # starts local Supabase + writes apps/mobile/.env and
                        # apps/admin/.env.local from `supabase status`
```

`pnpm bootstrap` (scripts/setup-local.mjs) starts the local Supabase stack
(Postgres, Auth, Storage on http://127.0.0.1:54321), applies migrations +
`supabase/seed.sql`, and generates both env files. It never overwrites an
existing env file.

### Run the apps

```bash
pnpm --filter admin dev       # Next.js admin  → http://localhost:3000
pnpm --filter mobile start    # Expo dev server → http://localhost:8081
                              # press w for web, or scan the QR with Expo Go
```

### Seeded local logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@kse.local` | `admin12345` |
| Tutor | `tutor1@kse.local` | `tutor12345` |
| Student | `student1@kse.local` | `student12345` |

Local dev only — never use these outside `supabase start`.

### Common scripts

| Command | Description |
|---|---|
| `pnpm bootstrap` | Start local Supabase + generate env files |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Typecheck all workspaces |
| `pnpm test` | Run all tests |
| `pnpm build` | Build all workspaces |
| `supabase db reset` | Reset local DB, apply migrations + seed |
| `supabase migration new <name>` | Create a new migration |

## Development Rules

See [CLAUDE.md](CLAUDE.md) for the full project conventions — strict TypeScript, Zod
validation, RLS on every user-facing table, migrations for all schema changes, and no
`service_role` keys outside trusted server contexts.

## MVP Roadmap

Build order is defined in [CLAUDE.md](CLAUDE.md) §30. Current status is tracked in
[docs/roadmap.md](docs/roadmap.md).
