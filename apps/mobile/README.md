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

Environment variables live in `apps/mobile/.env` (see root `.env.example`).

Expo SDK versioned docs: https://docs.expo.dev/versions/v57.0.0/
