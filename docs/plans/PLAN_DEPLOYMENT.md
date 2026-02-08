# Plan: Production Deployment

## Overview
Deploy the "Dongne Sokdak" application to a production environment. The frontend will be hosted on Vercel, and the backend on Render (or compatible Python hosting). This plan ensures all sensitive data is secured, build configurations are optimized for production, and third-party integrations (OAuth, Supabase, Maps) are correctly configured for the live domain.

## Context Map
**Frontend (Vercel):**
- `frontend/next.config.ts`
- `frontend/package.json`
- `frontend/.env.local` (Local only, needs Vercel Env Vars)

**Backend (Render):**
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/requirements.txt`
- `backend/render.yaml` (New)

**External Services:**
- Kakao Developers Console
- Google Cloud Console
- Supabase Dashboard

## Architecture Decisions
- **Separation of Concerns**: Frontend on Edge Network (Vercel) for speed, Backend on Container Service (Render) for stability and computing power.
- **Environment Variables**: Strictly managed via platform dashboards, never committed.
- **Security**: strict CORS policies, secure cookies, and environment-specific redirects.

---

## Phase 1: Security & Configuration Audit
**Goal**: Ensure no secrets are leaked and configurations are ready for production.
- [ ] **Gitignore Verification**: Verify `.env`, `.env.local`, `*.pem`, `*.key` are ignored.
- [ ] **Environment Audit**: Check `config.py` and `next.config.ts` for hardcoded 'development' strings or localhost URLs that need to be dynamic.
- [ ] **Secret Rotation**: (Optional) If any keys were previously committed, rotate them now.
- [ ] **Quality Gate**:
    - `git status` shows no sensitive files.
    - Codebase search for "localhost" returns only comment/config fallbacks.

## Phase 2: Backend Deployment Preparation (Render)
**Goal**: Package the FastAPI backend for containerized deployment.
- [ ] **Dependency Freeze**: Ensure `requirements.txt` is up-to-date and locks versions.
- [ ] **Entrypoint**: Create `backend/start.sh` or configure `render.yaml` command (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
- [ ] **CORS Configuration**: Update `backend/app/core/config.py` to accept the future Vercel domain (dynamically or via env var).
- [ ] **Quality Gate**:
    - Docker build (optional locally) or local run with `ENVIRONMENT=production` works.

## Phase 3: Frontend Deployment Preparation (Vercel)
**Goal**: Optimize Next.js build for production.
- [ ] **Build Check**: Run `npm run build` locally to catch type errors and linting issues.
- [ ] **Environment Variables**: List all required `NEXT_PUBLIC_` variables for Vercel dashboard.
- [ ] **Redirects/Rewrites**: Ensure no development proxies remain in `next.config.ts`.
- [ ] **Quality Gate**:
    - Build passes with 0 errors.

## Phase 4: Execution - Backend (Render)
**Goal**: Go live with the API.
- [ ] **Deploy**: Connect Repository to Render.
- [ ] **Env Vars**: Set `SUPABASE_URL`, `SUPABASE_KEY`, `KAKAO_...`, `GOOGLE_...`, `ENVIRONMENT=production`.
- [ ] **Health Check**: Verify `https://[project].onrender.com/docs` loads.

## Phase 5: Execution - Frontend (Vercel)
**Goal**: Go live with the UI.
- [ ] **Deploy**: Connect Repository to Vercel.
- [ ] **Env Vars**: Set `NEXT_PUBLIC_API_URL` to the Render URL.
- [ ] **Env Vars**: Set `NEXT_PUBLIC_KAKAO_CLIENT_ID`, etc.
- [ ] **Deploy**: Trigger production build.
- [ ] **Quality Gate**: Website loads, map displays.

## Phase 6: Post-Deployment Configuration
**Goal**: Connect the wires.
- [ ] **OAuth Redirects**: Update Kakao/Google Consoles with new Production URLs (`https://[vercel-domain]/auth/callback/...`).
- [ ] **CORS Finalization**: Update Backend `CORS_ORIGINS` with the actual Vercel domain.
- [ ] **Smoke Test**: Full User Flow (Login -> Write Report -> View on Map).

## Risks
- **Cold Starts**: Render free tier spins down. Impact: First request slow. Mitigation: Keep-alive cron or paid plan.
- **CORS Issues**: Common in split hosting. Mitigation: Double check origin strings (no trailing slashes).
- **Mixed Content**: Ensure all resources are loaded over HTTPS.

## Rollback
- Revert DNS/Environment variables to previous values.
- Redeploy previous commit hash.
