# KSE Mobile

Expo (React Native) student app for KSE — Khulna Student Ecosystem.

- Expo Router (file-based routing, `src/app`)
- TypeScript strict
- Shared domain code from workspace packages `@kse/types`, `@kse/validation`, `@kse/shared`

## Run

```bash
pnpm install            # from repo root
pnpm --filter mobile start
```

Open in [Expo Go](https://expo.dev/go) or run `pnpm --filter mobile android`.

### Environment setup

1. Start the local Supabase stack from the repo root: `supabase start`
2. Copy the API URL and anon key from `supabase status`
3. Create `apps/mobile/.env` (gitignored; see root `.env.example`):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
   ```

Physical devices need the machine's LAN IP instead of `127.0.0.1`
(e.g. `http://192.168.x.x:54321`).

Expo SDK versioned docs: https://docs.expo.dev/versions/v57.0.0/
