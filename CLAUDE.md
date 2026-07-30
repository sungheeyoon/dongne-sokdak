# 동네속닥 — Claude Code Context

## Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript, TailwindCSS, Zustand + TanStack Query, Vitest + RTL
- **Backend**: FastAPI + Pydantic v2, Supabase (PostgreSQL + PostGIS + Storage + Auth), pytest
- **Maps**: Kakao Maps (명령형 SDK 접근은 data adapter로 제한 — ADR-0003)

## Architecture

Both frontend and backend follow a layered architecture. **Inner layers must not depend on outer layers.**

### Frontend — Clean Architecture by feature slice
```
frontend/src/
├── app/                          # Next.js App Router pages (composition only)
├── features/<slice>/             # admin | auth | map | profile | reports
│   ├── domain/                   # entities + use cases (no React, no I/O)
│   ├── data/                     # repositories (fetch / Supabase / Kakao)
│   └── presentation/
│       ├── components/           # feature-specific UI
│       └── hooks/                # use*ViewModel — the only thing pages call
├── shared/                       # cross-feature UI atoms + global stores
├── components/                   # legacy bucket — prefer features/*/presentation
├── hooks/                        # legacy bucket (do NOT add here)
└── lib/                          # logger, supabase client, kakao utils, formatters
```

**Rules**
- Pages call **ViewModel hooks only** — no direct repository or Supabase imports.
- Repositories live under `features/<slice>/data/` and convert snake_case → camelCase at the entry point.
- Use cases (`features/<slice>/domain/usecases.ts`) hold pure business logic. No `router.push`, no `toast`.
- Imperative Kakao Maps SDK access belongs in the **data adapter**. Presentation may use declarative `react-kakao-maps-sdk` components but must not call `window.kakao` directly (ADR-0003).

### Backend — services layer
```
backend/app/
├── api/v1/                       # thin route handlers (delegate to services)
├── api/admin/                    # split: routes_dashboard / users / reports / settings
├── services/                     # business logic
│   ├── report_service.py         # ReportService(supabase, cache, bounds_rpc_name=...) (ADR-0001/0002)
│   ├── comment_service.py
│   ├── vote_service.py
│   ├── profile_service.py        # uses get_profile_with_stats RPC
│   └── admin/                    # dashboard / user / report / log services
├── schemas/                      # Pydantic v2 (model_config, no class Config:)
└── core/, db/, middleware/, utils/
```

**Rules**
- Routes are thin — delegate to services. Services raise `HTTPException` directly for domain/permission/validation errors. Exception: single-item lookups return `None` on not-found, and some thin write paths return `None`/`bool` on failure — the route maps these to 404/400 (e.g. `get_report_by_id`, `get_user_profile`, `create_report`, `delete_neighborhood`).
- DB access goes through Supabase client. Performance-critical paths use SQL RPCs in `supabase/migrations/`.
- The active product map path is `/reports/bounds` → `get_reports_in_bounds_page`. `/reports/nearby` and `/reports/benchmark/nearby-rest` are legacy/benchmark backend paths and are not called by the frontend.
- Key RPCs: `get_reports_in_bounds_page`, `get_reports_paginated`, `get_admin_dashboard_stats`, `get_profile_with_stats`.
- No `print()` — use `logger`. No `datetime.utcnow()` — use timezone-aware `datetime.now(UTC)`.

## Commands

### Frontend (`cd frontend`)

Package manager is **pnpm** — the version is pinned by the `packageManager` field in
`frontend/package.json` and CI reads that same field. Do not use `npm`/`yarn` here:
they ignore `pnpm-lock.yaml`, so lockfile drift would go undetected locally and fail
CI's `pnpm install --frozen-lockfile`.

```bash
pnpm install                      # honours pnpm-lock.yaml
pnpm dev                          # next dev
pnpm build                        # next build
pnpm lint                         # eslint . (flat config)
pnpm tsc:check                    # tsc --noEmit
pnpm test -- --run                # vitest one-shot
pnpm test:coverage -- --run       # vitest with v8 coverage
ANALYZE=true pnpm build -- --webpack   # bundle analyzer → .next/analyze/*.html
```

After changing dependencies in `package.json`, regenerate the lockfile in the same
commit (`pnpm install`, or `pnpm install --lockfile-only`) — CI fails otherwise.

Dependencies allowed to run install scripts are listed under `allowBuilds` in
`frontend/pnpm-workspace.yaml` (currently `sharp`, `unrs-resolver`). pnpm blocks build
scripts by default and **exits non-zero** when any are unapproved, so a new dependency
with a postinstall step must be added there — run `pnpm approve-builds`, which writes
this file. Note pnpm 11 does *not* read `pnpm.onlyBuiltDependencies` from
`package.json`; only `pnpm-workspace.yaml` takes effect.

`tsc:check` includes `.next/types/**` — a stale `.next/` from a deleted route can fail
it locally while CI (which has no `.next/`) passes. `rm -rf .next` if that happens.

### Backend (`cd backend`)
```bash
uvicorn app.main:app --reload
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m pytest --cov=app/services --cov-report=term-missing
```

## Test conventions

- **Frontend**: tests live in `frontend/__tests__/` mirroring `src/`. Vitest + RTL + jsdom. Repositories mock `fetch`; ViewModels mock the repository interface with `vi.fn()`.
- **Backend**: tests live in `backend/tests/` named `test_<module>.py`. pytest + pytest-mock; admin services have dedicated split test files.
- **Coverage**: `pnpm test:coverage -- --run` is available for inspection. CI currently gates lint, typecheck, and tests; it does not enforce a numeric coverage threshold.

## Conventions

- Components: `Ui` prefix for generic atoms (`UiButton`, `UiInput`); domain components use descriptive names (`ReportCard`, `LoginButton`).
- `console.log` in production paths must be `process.env.NODE_ENV === 'development' &&`-guarded. Demo route (`/components`) is gated by `NEXT_PUBLIC_ENABLE_DEMO_ROUTES`.
- Commits: present-tense imperative, scope prefix (`refactor(frontend):`, `fix(supabase):` etc).
- `pid.txt`, `dev.log`, `tsconfig.tsbuildinfo`, `coverage.txt` are gitignored — never commit.

## Reference docs
- `docs/README.md` — current-document index and freshness rules
- `docs/FRONTEND_CLEAN_ARCHITECTURE.md` — full layer rules and feature mapping
- `backend/results/locust/BOUNDS_RPC_BENCHMARK_20260724.md` — active bounds benchmark evidence
- `docs/plans/archive/` — completed plans; historical only

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`sungheeyoon/dongne-sokdak`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Documentation freshness

Use `docs/README.md` to distinguish current documents from historical material:
- Anything under `docs/plans/archive/`, or carrying a `> **Snapshot**` banner, is a historical record. Never cite it as evidence of current behavior.
- Prefer the code, `CONTEXT.md`, current ADRs, and the latest benchmark report when sources conflict.
- When a plan's work is done, move it into `docs/plans/archive/` and add the snapshot banner.
