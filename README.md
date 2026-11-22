# Comando Frontend

[![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo)](https://docs.expo.dev/versions/v58.0.0/)
[![React Native 0.88](https://img.shields.io/badge/React%20Native-0.88-61dafb?logo=react)](https://reactnative.dev/)
[![Platforms](https://img.shields.io/badge/Platforms-Web%20%7C%20Android-3ddc84)](https://docs.expo.dev/workflow/web/)
[![API](https://img.shields.io/badge/API-comando--backend-6f42c1)](https://github.com/comando-systems/comando-backend)

A universal Expo client for the Comando order-management system. One TypeScript codebase runs in the browser and on Android, with shared screens for login, tables, counter sales, payments, and an administrator-only management area.

> The previous implementation is archived in the private [`comando-frontend-bkp`](https://github.com/comando-systems/comando-frontend-bkp) repository. This repository is the active, English-only rewrite.

---

## Highlights

- **Universal**: Expo Router navigation on web and Android, React Native primitives everywhere.
- **Backend-driven**: every amount, status change, and permission check comes from the [Comando API](https://github.com/comando-systems/comando-backend).
- **Order builder**: one component powers tables and the counter, with quantity steppers, image, prices, subtotal, surcharge, discount, service fee, and total.
- **Flexible payments**: split payments, cash change calculated by the backend, and "pay later" for tables.
- **Counter export**: move the current counter build into an existing or newly opened table.
- **Role-aware UI**: management is visible only to `ADMIN`; the backend remains the authority.
- **Icon adapter**: application code uses semantic `IconName` values, never raw vendor icon names.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Expo 58, React Native 0.88 |
| Navigation | Expo Router (file-based routes in `src/app/`) |
| Language | TypeScript, strict mode |
| Web | `react-native-web`, `react-dom`, `@expo/metro-runtime` |
| Icons | `@expo/vector-icons` behind the internal `Icon` adapter |
| Session storage | `expo-secure-store` on native, `localStorage` on web |
| Tests | Jest 30 + `jest-expo` + React Native Testing Library |
| Lint | `eslint-config-expo` through `npx expo lint` |

## Quick start

Requirements: Node.js 22.13+, pnpm, and a running Comando backend (see its README for PostgreSQL and migrations).

```bash
git clone https://github.com/comando-systems/comando-frontend.git
cd comando-frontend
pnpm install
cp .env.example .env
```

Set the API URL in `.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For a physical Android device or emulator, use a reachable host instead, for example `http://10.0.2.2:3000` for the Android emulator. `EXPO_PUBLIC_` variables are public by design; never put secrets in them.

Then start the app:

```bash
pnpm web       # browser at http://localhost:8081
pnpm android   # Expo Go or a development build on Android
```

The backend must allow the web origin through `CORS_ORIGIN`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm start` | Start the Expo dev server |
| `pnpm web` | Start the dev server for web |
| `pnpm android` | Start the dev server for Android |
| `pnpm lint` | Run Expo ESLint |
| `pnpm typecheck` | Run `tsc --noEmit` |
| `pnpm test` | Run Jest tests once |
| `npx expo-doctor` | Check dependency and configuration health |
| `npx expo export --platform web` | Build the production web bundle |

## Project structure

```text
src/
  index.tsx              Single entry point; imports expo-router/entry last
  app/                   Route files and layouts (thin re-exports only)
  components/            Reusable components, one directory and test folder each
  screens/               Feature screens, one directory and test folder each
  services/              API client, token storage, and backend adapters
  types/                 Types mirrored from the backend contract
  providers/             Session and shared context providers
  hooks/                 Reusable hooks
  utils/                 Pure helpers
```

Every component is named after what it is: `Button`, `Card`, `Login`, `Tables`. No `ButtonComponent` or `HomeScreen` suffixes. Routes live in `src/app/`; everything else lives outside it.

See [`AGENTS.md`](./AGENTS.md) for the full set of architecture, naming, API, and workflow decisions.

## Authentication and roles

Login calls `POST /auth/login` and stores the returned access and refresh tokens. On an expired access token, the client rotates the session with `POST /auth/refresh` and retries the request once.

| Role | Main capabilities |
| --- | --- |
| `ADMIN` | Management area, catalog, users, settings, reports, counter sales, close/cancel |
| `CASHIER` | Counter sales, history, tables, close/cancel |
| `SERVER` | Open and edit tables, request payment, cancel |

A user can hold multiple roles; permissions are the union of them. Client-side guards only improve the experience — the backend enforces every rule.

## API

The backend contract is published at `GET /openapi.json`, with interactive documentation at `/docs`. The frontend talks to it only through `src/services/api.ts`.

Money is always integer cents, IDs are decimal strings, and timestamps are ISO 8601 UTC. Order totals, pricing, and payment validation are calculated by the backend; the client never submits trusted totals.

## Development workflow

`main` is protected by a GitHub ruleset: no direct commits, no force pushes, squash merge only. Create a branch, open a pull request that references its issue, and let CI checks pass before merging. Issues live on GitHub; this repository contains no issue-tracking files.

Before marking work done, run:

```bash
npx expo lint
npx tsc --noEmit
pnpm test
```

## License

See [LICENSE](./LICENSE).
