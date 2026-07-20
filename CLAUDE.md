# 동네속닥 — Claude Code Context

## Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript, TailwindCSS, Zustand + TanStack Query, Vitest + RTL
- **Backend**: FastAPI + Pydantic v2, Supabase (PostgreSQL + PostGIS + Storage + Auth), pytest
- **Maps**: Kakao Maps (data layer only — see `docs/FRONTEND_CLEAN_ARCHITECTURE.md`)

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
- Kakao Maps SDK is **data layer**. Presentation must not call `window.kakao` directly.

### Backend — services layer
```
backend/app/
├── api/v1/                       # thin route handlers (delegate to services)
├── api/admin/                    # split: routes_dashboard / users / reports / settings
├── services/                     # business logic
│   ├── report_service.py         # ReportService(supabase, cache) — uses spatial_report_cache (ADR-0001/0002)
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
- Key RPCs: `get_reports_paginated`, `get_admin_dashboard_stats`, `get_profile_with_stats`, `get_reports_within_radius`, `get_reports_in_bounds`.
- No `print()` — use `logger`. No `datetime.utcnow()` — use timezone-aware `datetime.now(UTC)`.

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev                       # next dev
npm run build                     # next build
npm run lint                      # eslint . (flat config)
npm run tsc:check                 # tsc --noEmit
npm test -- --run                 # vitest one-shot
npm run test:coverage -- --run    # vitest with v8 coverage
ANALYZE=true npm run build -- --webpack   # bundle analyzer → .next/analyze/*.html
```

### Backend (`cd backend`)
```bash
uvicorn app.main:app --reload
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m pytest --cov=app/services --cov-report=term-missing
```

## Test conventions

- **Frontend**: tests live in `frontend/__tests__/` mirroring `src/`. Vitest + RTL + jsdom. Repositories mock `fetch`; ViewModels mock the repository interface with `vi.fn()`.
- **Backend**: tests live in `backend/tests/` named `test_<module>.py`. pytest + pytest-mock; admin services have dedicated split test files.
- **Coverage policy**: ViewModels and Repositories ≥80% **Lines** (branch coverage is a follow-up track, not a quality gate).

## Conventions

- Components: `Ui` prefix for generic atoms (`UiButton`, `UiInput`); domain components use descriptive names (`ReportCard`, `LoginButton`).
- `console.log` in production paths must be `process.env.NODE_ENV === 'development' &&`-guarded. Demo route (`/components`) is gated by `NEXT_PUBLIC_ENABLE_DEMO_ROUTES`.
- Commits: present-tense imperative, scope prefix (`refactor(frontend):`, `fix(supabase):` etc).
- `pid.txt`, `dev.log`, `tsconfig.tsbuildinfo`, `coverage.txt` are gitignored — never commit.

## Reference docs
- `docs/FRONTEND_CLEAN_ARCHITECTURE.md` — full layer rules and feature mapping
- `docs/plans/archive/PLAN_frontend_refactor_perf.md` — completed Clean Arch migration + MapComponent split + test infra (2026-05)
- `docs/plans/PLAN_backend_refactor_perf.md` — completed services layer split + N+1 fixes + Pydantic v2 (2026-05)
- `README_SECURITY.md` — RBAC / RLS / JWT setup

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`sungheeyoon/dongne-sokdak`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
