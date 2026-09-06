# KSE Architecture

High-level architecture. Full conventions live in [CLAUDE.md](../CLAUDE.md).

```text
                         ┌──────────────────────┐
                         │      Student         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Expo React Native App│
                         └──────────┬───────────┘
                                    │ HTTPS
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
       ┌───────────────────┐                ┌────────────────────┐
       │ Supabase API/Auth │                │ Supabase Edge Func │
       └─────────┬─────────┘                └──────────┬─────────┘
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │ PostgreSQL + RLS │
                          └─────────┬────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
               ┌─────────────────┐     ┌─────────────────┐
               │ Supabase Storage│     │ Background Jobs │
               └─────────────────┘     └─────────────────┘


                    ADMIN SIDE

          ┌────────────────────────────┐
          │ Next.js Admin Panel        │
          └─────────────┬──────────────┘
                        │
                        ▼
             Supabase Auth / API / DB
```

## Data-flow rules

- Mobile app performs simple CRUD through the Supabase client guarded by **RLS**.
- Sensitive/privileged logic (notifications, bulk admin actions, rate-limited actions,
  integrations) runs in **Edge Functions**.
- Admin panel authenticates via Supabase Auth; privileged writes use the service-role
  key **server-side only**.
- All schema changes go through `supabase/migrations/`.

## Visual direction

The mobile UI follows the design mockup in [docs/design/UI.jpeg](design/UI.jpeg):
white/light backgrounds, purple primary brand, rounded cards, clean typography,
compact dashboard cards, bottom navigation (Home, Explore, Create/Action, Community,
Profile). See CLAUDE.md §32.
