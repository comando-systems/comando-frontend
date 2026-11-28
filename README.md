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
- **Portuguese UI**: all labels, actions, accessibility text, and fixed messages are written in Brazilian Portuguese; code identifiers remain in English.
- **Backend-driven**: every amount, status change, and permission check comes from the [Comando API](https://github.com/comando-systems/comando-backend).
- **Order builder**: one component powers tables and the counter, with quantity steppers, image, prices, subtotal, surcharge, discount, service fee, and total.
- **Flexible payments**: split payments entered in reais, cash change calculated by the backend, "pay later" for tables, and payment rows hidden until the first payment is added.
- **Counter export**: move the current counter build into a selected live table or a newly generated one, then discard the draft.
- **Role-aware UI**: management is visible only to `ADMIN`; the backend remains the authority.
- **Visual system**: white header with the cloche logo, highlighted navigation in the header on wide screens and an icon-only bottom tab bar on phones, white cards on neutral gray, and orange accents for money and active states.
- **Icon adapter**: application code uses semantic `IconName` values, never raw vendor icon names.
- **Logo source**: `assets/full-logo.svg` has a transparent background; regenerate the React Native PNG with `rsvg-convert -w 480 -h 400 assets/full-logo.svg -o assets/full-logo.png`.
- **Consistent forms**: a shared `Form` component caps dedicated forms at 320px on wide screens and owns the submit/cancel actions; `Field` and full-width `Button` use the same token, so tables and counter screens stay full width. Prices are entered with a decimal reais mask.
- **Self-contained styles**: components declare their styles in `StyleSheet.create`; JSX never uses inline `style={{ ... }}` objects. Buttons use only `primary`, `secondary`, and `tertiary` variants.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Expo 58, React Native 0.88 |
| Navigation | Expo Router (file-based routes in `src/app/`) |
| Language | TypeScript, strict mode |
| Web | `react-native-web`, `react-dom`, `@expo/metro-runtime` |
| Icons | `@expo/vector-icons` and `expo-font` behind the internal `Icon` adapter |
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

`.env.example` already contains the local backend URL. Copy it to `.env` and change the value when the backend runs elsewhere:

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
  components/            Reusable components, one directory and colocated test file each
  screens/               Feature screens, one directory and colocated test file each
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
| `ADMIN` | Management area, catalog, users, settings, reports, order history |
| `CASHIER` | Counter sales only; may close or cancel a table order reached through a flow |
| `SERVER` | Tables and the full table lifecycle, including close and cancel |

A user can hold multiple roles; permissions are the union of them. Internally, roles are a lookup record for O(1) permission checks; the API adapter converts the backend role arrays at the HTTP boundary. Client-side guards only improve the experience — the backend enforces every rule. Navigation is split by role: cashiers see only Balcão, servers only Mesas, and admins Gerenciamento and Histórico. `RoleGuard` also redirects direct visits to those four screens; order and payment routes stay reachable through their flows. History defaults to `statuses=CLOSED,CANCELED` and offers only finalized status filters.

## API

The backend contract is published at `GET /openapi.json`, with interactive documentation at `/docs`. The frontend talks to it only through `src/services/api.ts`. Endpoint definitions use the typed `http.get`, `http.post`, `http.patch`, `http.put`, and `http.delete` helpers, which wrap the shared `request` function and preserve authentication, refresh, query serialization, and error normalization.

Money is always integer cents over the wire; payment and price inputs are shown in reais with two decimals and parsed into cents before sending. IDs are decimal strings and timestamps are ISO 8601 UTC. Order totals, pricing, and payment validation are calculated by the backend; the client never submits trusted totals. A discount may exceed items plus surcharge in the preview, but the product does not sell with a zero or negative total: both are blocked before closing (`ZERO_TOTAL` and the client-only `NEGATIVE_TOTAL` message), and no service fee is charged on a non-positive balance. `OrderResponse.originalTableCode` keeps the opening table name after `tableCode` is cleared on finalization. Catalog pagination and `includeRemoved` are server-owned; the item list also accepts `search`, but the UI keeps search and category filtering local to the loaded page so secondary categories are covered (the backend search only inspects the primary category). Each item carries a primary `category` and up to eight unique `categories`; there are no category CRUD endpoints, so administrators manage categories through item create/update payloads. Table names are generated by the client as the first free `Mesa N` from live tables; `POST /orders/table` accepts a blank name, and optional renaming is available when opening. Sales reports use `YYYY-MM-DD` date fields, convert them to UTC ISO 8601 instants, and display backend-owned totals without local recalculation.

Backend error codes are translated to fixed Portuguese messages in the `errorMessages` map of `src/services/api.ts`; raw backend messages are never displayed. `409 TABLE_OCCUPIED` is now returned when adding, changing, or removing lines on a name held by another active order (`error.details.orderId`), not when opening a table — the client opens the existing order instead of showing an error. `409 ZERO_TOTAL` blocks closing an order whose total is zero; cancellation remains allowed.

## Development workflow

`main` is protected by a GitHub ruleset: no direct commits, no force pushes, squash merge only. Create a branch, open a pull request that references its issue, and let CI checks pass before merging. Issues live on GitHub; this repository contains no issue-tracking files.

`pnpm install` points Git at the hooks in `.github/githooks/` on a fresh checkout; run `pnpm run prepare` to refresh the setting. The `pre-commit` hook runs lint, type checking, the full Jest suite, and tests scoped to staged source files. The `commit-msg` hook requires Conventional Commits such as `feat: add payment split` or `fix(catalog): keep filters local`.

Before marking work done, run:

```bash
npx expo lint
npx tsc --noEmit
pnpm test
pnpm test:coverage
npx expo-doctor
npx expo export --platform web
```

## License

See [LICENSE](./LICENSE).
