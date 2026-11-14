# APIS — AdPulse Projects Intelligence System

**Phase 1: Foundation** — authentication, roles, users, projects, tasks, assignments, and basic CEO/staff dashboards.

This is the first implemented phase of the full APIS specification. See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the complete system architecture, database ERD, API design, security model, and the Phase 2–6 roadmap.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers (same codebase — see ARCHITECTURE.md for why) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Custom JWT session (httpOnly cookie) + bcrypt, via `jose` |
| Validation | Zod |

## Prerequisites

- Node.js 20+
- A PostgreSQL 14+ database (local, Docker, or hosted — Supabase/Neon/RDS all work)
- Standard outbound internet access for two one-time/build-time downloads:
  - Prisma's query engine binary (`prisma generate`, from `binaries.prisma.sh`)
  - Google Fonts CSS (`next build`/`next dev`, from `fonts.googleapis.com`)

  Neither is unusual for a Next.js + Prisma app, but if you're building this behind a locked-down network/proxy, allowlist those two hosts (or swap `next/font/google` for local font files and pass `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` with vendored engines).

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then edit .env:
#   - DATABASE_URL   → your Postgres connection string
#   - AUTH_SECRET    → a long random string, e.g. `openssl rand -base64 48`

# 3. Generate the Prisma client
npm run db:generate

# 4. Create the database schema
npm run db:migrate
# (this also prompts you to name the initial migration, e.g. "init")

# 5. Seed development data (1 CEO, 5 staff, 5 clients, 10 projects, 60 tasks)
npm run db:seed

# 6. Start the dev server
npm run dev
```

Visit **http://localhost:3000** — you'll land on `/login`.

### Seed login credentials

All seeded accounts share the password **`ChangeMe123!`** (change it before using this seed shape anywhere real):

| Role | Email |
|---|---|
| CEO | `ceo@adpulse.com` |
| Staff | `ahmed.khan@adpulse.com` |
| Staff | `sara.malik@adpulse.com` |
| Staff | `bilal.ahmed@adpulse.com` |
| Staff | `hina.sheikh@adpulse.com` |
| Staff | `usman.tariq@adpulse.com` |

## Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply pending migrations in production (no prompts) |
| `npm run db:seed` | Reset and reseed development data |
| `npm run db:studio` | Open Prisma Studio to browse the database |

## Production build

```bash
npm run build
npm run start
```

For a first-time production database, run `npm run db:deploy` (not `db:migrate`, which is interactive and dev-only) before starting the app.

## What's implemented in Phase 1

- Secure login/logout, hashed passwords, JWT session cookie, failed-login throttling + logging
- Two roles (CEO, Staff) enforced at both the route level (`middleware.ts`) and the API level (`lib/rbac.ts`, `lib/authz.ts`) — the backend never trusts the frontend
- Projects: create, list (filterable by status/priority/department/search), detail, update, soft-delete, staff assignment
- Tasks: create, list, detail, update, status/progress quick-update (assignee or CEO only), soft-delete
- CEO dashboard: KPI cards, a "Needs Attention" panel (at-risk/delayed/overdue projects), full project table
- Staff "My Day" and "My Tasks": due-today/overdue/upcoming counts, one-click status + progress slider quick-update
- CEO Staff directory with computed workload (Low/Balanced/High/Overloaded) and a per-staff detail page
- Project activity feed (also doubles as the audit trail for Phase 1)
- Design system: Button, Card, Badge, ProgressBar, Input/Select, Avatar, EmptyState, KPI card — all reused across every screen, no one-off styling

## What's intentionally not in Phase 1

These are scoped to later phases per `ARCHITECTURE.md` section 13 (Phased Development) — the schema and folder structure already leave room for them without breaking Phase 1:

- Milestones, task dependencies, blockers, calendar/Gantt views (**Phase 2**)
- Deadline reminders, overdue escalation, no-progress detection, daily/weekly digests, the automation + scheduler engine (**Phase 3**)
- CEO Command Center, status-request workflow, advanced filters/reports/exports (**Phase 4**)
- AI assistant, AI project summaries, AI risk detection (**Phase 5**)
- Email/WhatsApp/push notification channels, calendar/storage integrations (**Phase 6**)

## Project structure

```
apis/
├── prisma/
│   ├── schema.prisma          # Phase 1 data model
│   └── seed.ts                 # Dev seed data
├── src/
│   ├── app/
│   │   ├── login/               # Public login page
│   │   ├── ceo/                 # CEO-only pages (dashboard, projects, staff)
│   │   ├── staff/                # Staff pages (My Day, My Tasks)
│   │   └── api/                  # REST route handlers (see ARCHITECTURE.md §5)
│   ├── components/
│   │   ├── ui/                   # Reusable design-system primitives
│   │   ├── layout/                # Sidebar, Topbar, AppShell
│   │   ├── dashboard/              # KpiCard
│   │   └── tasks/                   # QuickTaskUpdate
│   ├── lib/
│   │   ├── prisma.ts, auth.ts, session.ts, rbac.ts, authz.ts, activity.ts, api-utils.ts, format.ts
│   │   ├── validators/               # Zod schemas
│   │   └── queries/                    # Shared query functions (used by both pages AND API routes)
│   ├── middleware.ts                    # Edge-runtime route protection
│   └── types/                            # Shared frontend types
└── .env.example
```
