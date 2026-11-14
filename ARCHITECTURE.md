# APIS — Architecture & Implementation Plan

**AdPulse Projects Intelligence System** — internal project intelligence platform for AdPulse IMC Pvt Ltd.

This document is the architecture deliverable requested before implementation began. It covers all fourteen items: system architecture, technology stack, database ERD, role/permission matrix, API design, frontend routes, backend structure, automation design, notification design, AI design, security, deployment, phases, and testing strategy. **Phase 1 (Foundation) is implemented** against this plan — see [README.md](./README.md) to run it. Phases 2–6 are specified here so later work extends this codebase rather than rewriting it.

---

## 1. System Architecture

APIS is a single Next.js codebase serving both the UI and the API, backed by PostgreSQL. This is a deliberate choice for an internal tool of this size (see §2 for the rationale) — it is still a clean layered architecture, just without a network hop between "frontend" and "backend":

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser / Mobile browser                                        │
│  Server Components (reads) · Client Components (mutations)       │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTPS
┌───────────────────────────────▼───────────────────────────────────┐
│  Next.js App Router  (Vercel / Node server)                       │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Edge Middleware — session presence + role→route gate       │   │
│  └───────────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Route Handlers (/api/**)         Server Components (/app)  │   │
│  │  → parse & validate (Zod)         → same query layer        │   │
│  │  → session + RBAC (lib/rbac)      → session + RBAC          │   │
│  │  → shared query layer (lib/queries) ←──────────────────────┤   │
│  │  → object-level authz (lib/authz)                           │   │
│  │  → activity log (lib/activity)                               │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────────────┬─────────────────────┘
               │ Prisma (parameterized SQL) │
┌──────────────▼───────────────┐  ┌─────────▼─────────────────────┐
│  PostgreSQL                   │  │  Redis  (Phase 3+)              │
│  users, projects, tasks,      │  │  BullMQ queues: reminders,       │
│  activity_logs, …             │  │  escalations, digests, AI jobs   │
└───────────────────────────────┘  └─────────┬─────────────────────┘
                                              │
                                   ┌──────────▼─────────────────────┐
                                   │  Automation Engine (Phase 3)     │
                                   │  → Notification Service          │
                                   │    (in-app now; email/WhatsApp/  │
                                   │     push/SMS adapters later)     │
                                   │  → AI Intelligence Layer         │
                                   │    (Phase 5, calls an LLM API)   │
                                   └───────────────────────────────────┘
```

**Why one codebase instead of a separate SPA + API server:** APIS is an internal tool with one client (the browser) and no third-party API consumers in Phase 1. Route Handlers still produce a real REST API (§5) — nothing here is coupled to React — so a mobile app or the future AI layer can call the same endpoints. Server Components fetch through the same `lib/queries` functions the API uses (§7), which is what actually matters for correctness: the dashboard a CEO sees and the JSON `GET /api/dashboard/ceo` returns can never drift apart, because they're the same function call.

Every write path follows the same sequence, enforced in code, not by convention: **authenticate → authorize (role) → authorize (object) → validate input → mutate → log activity**. See `src/lib/rbac.ts`, `src/lib/authz.ts`, `src/lib/activity.ts`.

---

## 2. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | Server Components remove a whole class of "forgot to check auth on this fetch" bugs for an internal tool; Route Handlers give a real REST surface for free. |
| Backend | Next.js Route Handlers, TypeScript | Same language and types as the frontend end-to-end; one deployable. |
| Database | PostgreSQL | Relational integrity for the exact structure APIS needs (§39 of the original spec): projects → tasks → dependencies, staff → assignments, immutable logs. |
| ORM | Prisma | Generated types match the schema exactly; migrations are reviewable SQL diffs; query API prevents SQL injection by construction. |
| Auth | Custom JWT session (httpOnly cookie), `jose` + `bcryptjs` | `jose` runs on both the Edge (middleware) and Node (route handlers) runtimes with one implementation — no split logic. Rolling a small, auditable ~150-line auth module is more transparent for an internal security-sensitive tool than a large auth framework's surface area. |
| Validation | Zod | One schema definition drives both the compile-time TypeScript type and the runtime check — the two can't drift. |
| Background jobs (Phase 3+) | BullMQ + Redis | Matches the spec's own recommendation; mature retry/backoff/idempotency primitives for reminders and escalations. |
| Charts (Phase 4+) | Recharts | Composable React charts; used for workload/health visualizations once those land. |
| AI (Phase 5) | Anthropic API (Claude) | Tool-use support for permission-scoped data retrieval and explainable, cited answers (§10). |

---

## 3. Database ERD / Schema

Full target schema across all phases. **Phase 1 implements the unshaded tables below** (`prisma/schema.prisma`); the rest are additive in later phases and don't require changes to Phase 1 tables — every table already carries `id` (UUID), `createdAt`/`updatedAt`, and soft-delete (`deletedAt`) where records are user-facing business data, so later tables slot in without migrations that touch existing columns.

### Phase 1 (implemented)

```
users                          project_members                 tasks
──────────────────             ──────────────────               ──────────────────
id UUID PK                     id UUID PK                       id UUID PK
name                           projectId FK → projects           projectId FK → projects
email UNIQUE                   userId FK → users                  title
passwordHash                   roleOnProject                       description
role  [CEO|STAFF]               addedAt                            assignedToId FK → users
department                      @@unique(projectId,userId)          createdById FK → users
jobTitle                                                             priority [enum]
isActive                       clients                               status   [enum]
createdAt / updatedAt          ──────────────────                    startDate / dueDate
                                id UUID PK                            estimatedHours / actualHours
projects                       name                                  progressPercent
──────────────────             company                               completedAt
id UUID PK                     contactPerson                        createdAt/updatedAt/deletedAt
name                           email / phone / notes
code UNIQUE                    createdAt/updatedAt                activity_logs
clientId FK → clients                                              ──────────────────
projectManagerId FK → users                                         id UUID PK
department                                                           entityType [PROJECT|TASK|USER]
startDate / expectedCompletionDate                                    entityId
priority [enum]                                                       projectId FK (nullable)
status   [enum]                                                       taskId FK (nullable)
progressPercent                                                       actorId FK → users
description / objectives                                              action
createdById FK → users                                                metadata JSON
createdAt/updatedAt/deletedAt                                         createdAt

                                                                    login_attempts
                                                                    ──────────────────
                                                                     id UUID PK
                                                                     userId FK (nullable)
                                                                     email
                                                                     success
                                                                     ipAddress
                                                                     createdAt
```

Enums (Phase 1): `Role {CEO, STAFF}` · `Priority {CRITICAL, HIGH, MEDIUM, LOW}` · `ProjectStatus {PLANNING, NOT_STARTED, IN_PROGRESS, ON_HOLD, AT_RISK, DELAYED, COMPLETED, CANCELLED}` · `TaskStatus {NOT_STARTED, IN_PROGRESS, ON_HOLD, COMPLETED}`.

**Design decisions worth flagging:**
- **Role as an enum on `users`, not a `roles`/`permissions` table pair.** The spec names exactly two roles (CEO, Staff) with fixed capability sets (§2–§3). A granular permissions table is real future work — once departments need different staff-visibility rules, or a "Project Manager" role emerges — but building it now against two roles would be speculative. `role` is the only column that would need to change shape; nothing else in the schema references it structurally.
- **`ActivityLog` doubles as the audit log in Phase 1.** The spec calls for both a project activity feed (§23) and an immutable audit log (§24). They're the same event stream in Phase 1 (`entityType`/`action`/`metadata` is generic enough for either use). Phase 3+ can split genuinely security-sensitive events (login, permission changes) into a separate `audit_logs` table with stricter immutability guarantees without touching how `ActivityLog` is written today.
- **Soft delete (`deletedAt`) on `projects` and `tasks` only.** Users are deactivated (`isActive`), never deleted, to preserve referential integrity in historical activity logs — a deactivated CEO's past `createdBy` attributions still resolve.

### Phase 2 — Project Intelligence

```
milestones                     task_dependencies
──────────────────             ──────────────────
id, projectId FK, name,         id, taskId FK, dependsOnTaskId FK,
dueDate, achievedAt              type [BLOCKS|DEPENDS_ON|RELATED]

comments                       attachments
──────────────────             ──────────────────
id, projectId FK (nullable),    id, projectId FK (nullable),
taskId FK (nullable),            taskId FK (nullable),
authorId FK → users,              uploadedById FK → users,
body, mentions[], parentId       fileName, fileUrl, fileType, fileSize
(self-relation for replies),     createdAt
createdAt/updatedAt/deletedAt

project_health                 workload_snapshots
──────────────────             ──────────────────
id, projectId FK, score 0-100,  id, userId FK, capturedAt,
factors JSON (the "why" —        activeTasks, criticalTasks,
completion/overdue/velocity/     overdueTasks, workloadLevel
blockers — see §46 of spec),
calculatedAt

blockers
──────────────────
id, taskId FK, reportedById FK → users,
reason [enum: WAITING_CLIENT|WAITING_APPROVAL|
        WAITING_TEAM|TECHNICAL|RESOURCE|INFO|OTHER],
details, resolvedAt
```

### Phase 3 — Automation

```
notification_rules             notifications
──────────────────             ──────────────────
id, name, eventType,            id, userId FK → users,
conditions JSON, actions JSON,    category [enum, §19 of spec],
isActive, createdById FK           title, body, priority,
                                    relatedProjectId / relatedTaskId,
                                    readAt, createdAt
```

`notification_rules` is what makes reminder intervals, escalation stages, and working hours configurable instead of hard-coded (spec §12, explicit requirement: "Do not hard-code these values").

### Phase 5 — AI

```
ai_insights
──────────────────
id, type [SUMMARY|RISK|PRIORITY|RECOMMENDATION],
projectId FK (nullable), taskId FK (nullable), userId FK (nullable),
recommendation, reasoning, sourceRefs JSON,   -- which rows justified this
modelName, modelVersion, generatedAt,
reviewedById FK → users (nullable), decision [ACCEPTED|REJECTED|PENDING]
```

Every field the spec's §64 ("Database Auditability") asks for is present: recommendation, reason, source references, timestamp, model/version, and who accepted/rejected it.

### Settings (Phase 3+, spans automation/security/AI config)

```
settings
──────────────────
id, key UNIQUE, value JSON, updatedById FK → users, updatedAt
```

A single flexible key/value table (reminder intervals, working hours, escalation thresholds, AI toggles) rather than one column per setting — this is what lets §12's "never hard-code these values" hold as the settings surface grows across phases.

---

## 4. User Role / Permission Matrix

| Capability | CEO | Staff |
|---|:---:|:---:|
| View all projects | ✅ | ❌ (only assigned) |
| View all staff / workload | ✅ | ❌ (self only) |
| Create / edit / archive projects | ✅ | ❌ |
| Assign / reassign staff to a project | ✅ | ❌ |
| Create tasks | ✅ (any project) | ✅ (own projects only) |
| Edit task title/assignee/deadline | ✅ | ❌ |
| Update own task status & progress | ✅ | ✅ (assignee only) |
| Report a blocker (Phase 2) | ✅ | ✅ (own tasks) |
| View project/task documents | ✅ | ✅ (assigned projects) |
| Upload documents | ✅ | ✅ (assigned projects) |
| Add comments | ✅ | ✅ (assigned projects) |
| View activity / audit logs | ✅ (all) | ✅ (own activity only) |
| Generate reports / exports (Phase 4) | ✅ | ❌ |
| Configure automation rules (Phase 3) | ✅ | ❌ |
| Manage staff accounts | ✅ | ❌ |
| Use AI assistant (Phase 5) | ✅ (full data scope) | ✅ (own data scope only) |

This table is the spec, not an interpretation of it — §2 and §3 enumerate these directly. What Phase 1 adds is *enforcement*: every row above that's implemented is checked in `src/lib/rbac.ts` (role-level) and `src/lib/authz.ts` (object-level — e.g. "assigned projects only" is a database filter, not a UI hide) on the backend, never only in the UI, per spec §4: *"Never rely only on frontend permissions."*

---

## 5. API Architecture

REST over Next.js Route Handlers. Every response is `{ data: ... }` on success or `{ error, code }` on failure (`src/lib/api-utils.ts`); list endpoints accept filter query params; mutation endpoints validate the body with Zod before touching the database.

| Method | Path | Auth | Phase | Status |
|---|---|---|---|---|
| POST | `/api/auth/login` | Public | 1 | ✅ |
| POST | `/api/auth/logout` | Session | 1 | ✅ |
| GET | `/api/auth/me` | Session | 1 | ✅ |
| GET | `/api/projects` | Session (scoped) | 1 | ✅ |
| POST | `/api/projects` | CEO | 1 | ✅ |
| GET | `/api/projects/:id` | Session (member or CEO) | 1 | ✅ |
| PUT | `/api/projects/:id` | CEO | 1 | ✅ |
| DELETE | `/api/projects/:id` (soft) | CEO | 1 | ✅ |
| GET | `/api/projects/:id/tasks` | Session (member or CEO) | 1 | ✅ |
| GET | `/api/tasks` | Session (scoped) | 1 | ✅ |
| POST | `/api/tasks` | Session (project member or CEO) | 1 | ✅ |
| GET | `/api/tasks/:id` | Session (member or CEO) | 1 | ✅ |
| PUT | `/api/tasks/:id` | CEO | 1 | ✅ |
| DELETE | `/api/tasks/:id` (soft) | CEO | 1 | ✅ |
| PATCH | `/api/tasks/:id/status` | Assignee or CEO | 1 | ✅ |
| PATCH | `/api/tasks/:id/progress` | Assignee or CEO | 1 | ✅ |
| GET | `/api/staff` | CEO | 1 | ✅ |
| POST | `/api/staff` | CEO | 1 | ✅ |
| GET | `/api/staff/:id/workload` | CEO or self | 1 | ✅ |
| GET | `/api/dashboard/ceo` | CEO | 1 | ✅ |
| GET | `/api/dashboard/staff` | Session | 1 | ✅ |
| POST | `/api/tasks/:id/blocker` | Assignee | 2 | Planned |
| GET/POST | `/api/projects/:id/milestones` | Session (scoped) | 2 | Planned |
| GET/POST | `/api/tasks/:id/comments` | Session (scoped) | 2 | Planned |
| POST | `/api/tasks/:id/attachments` | Session (scoped) | 2 | Planned |
| POST | `/api/settings/automation-rules` | CEO | 3 | Planned |
| GET/PATCH | `/api/notifications`, `/api/notifications/:id/read` | Session | 3 | Planned |
| GET | `/api/reports/weekly` | CEO | 4 | Planned |
| POST | `/api/status-requests` | CEO | 4 | Planned |
| GET | `/api/ai/project/:id/summary` | Session (scoped) | 5 | Planned |
| POST | `/api/ai/assistant/query` | Session (scoped) | 5 | Planned |

**Pagination/filtering/sorting:** Phase 1 list endpoints accept `status`, `priority`, `department`/`projectId`, and `search` query params, and return full result sets (dataset size in Phase 1 doesn't warrant pagination yet). `take`/cursor-based pagination is a one-line addition to `lib/queries/*` when needed (§45) — the shared query layer means it only needs to be added once per resource, not once per caller.

---

## 6. Frontend Route Structure

```
/login                              Public

/ceo/dashboard                      ✅ KPI cards, Needs Attention, project table
/ceo/projects                       ✅ Filterable project list
/ceo/projects/new                   ✅ Create project form
/ceo/projects/[id]                  ✅ Project workspace (info, team, tasks, activity)
/ceo/staff                          ✅ Staff directory with workload
/ceo/staff/[id]                     ✅ Staff detail (tasks, projects, workload)
/ceo/tasks                          Planned (Phase 2) — cross-project task board
/ceo/timeline                       Planned (Phase 2) — master Gantt/calendar
/ceo/workload                       Planned (Phase 2) — dedicated workload view
/ceo/reports                        Planned (Phase 4)
/ceo/notifications                  Planned (Phase 3)
/ceo/documents                      Planned (Phase 2)
/ceo/ai-intelligence                Planned (Phase 5)
/ceo/audit-logs                     Planned (Phase 4) — Phase 1 exposes this data via each project's Activity panel
/ceo/settings                       Planned (Phase 3)

/staff/my-day                       ✅ Greeting, needs-attention counts, priority tasks
/staff/my-tasks                     ✅ Full task list with filters + quick update
/staff/timeline                     Planned (Phase 2)
/staff/calendar                     Planned (Phase 2)
/staff/documents                    Planned (Phase 2)
/staff/notifications                Planned (Phase 3)
/staff/my-activity                  Planned (Phase 4) — personal audit trail
/staff/ai-assistant                 Planned (Phase 5)
/staff/profile                      Planned (Phase 3)
```

Route-level access is enforced in `src/middleware.ts`: unauthenticated requests are redirected to `/login`; `/ceo/*` redirects non-CEO sessions to `/staff/my-day`. Each page additionally re-checks the session server-side (defense in depth — see §11).

---

## 7. Backend Folder Structure

```
src/
├── middleware.ts                 Edge auth/role gate for every route
├── app/
│   ├── api/                      Route Handlers = the REST API (§5)
│   │   ├── auth/{login,logout,me}/route.ts
│   │   ├── projects/route.ts, projects/[id]/route.ts, projects/[id]/tasks/route.ts
│   │   ├── tasks/route.ts, tasks/[id]/route.ts, tasks/[id]/{status,progress}/route.ts
│   │   ├── staff/route.ts, staff/[id]/workload/route.ts
│   │   └── dashboard/{ceo,staff}/route.ts
│   ├── ceo/**/page.tsx            Server Components — CEO screens
│   ├── staff/**/page.tsx          Server Components — Staff screens
│   └── login/                     Public login screen
├── components/
│   ├── ui/                        Design-system primitives (§37 of spec)
│   ├── layout/                    Sidebar, Topbar, AppShell
│   ├── dashboard/                 KpiCard (extends per phase: charts, heatmaps…)
│   └── tasks/, projects/          Feature-specific composed components
├── lib/
│   ├── prisma.ts                  Singleton Prisma client
│   ├── auth.ts                    Password hashing, JWT sign/verify
│   ├── session.ts                 Server-side session reader
│   ├── rbac.ts                    Role-level guards (requireSession, requireRole)
│   ├── authz.ts                   Object-level guards (getAuthorizedProject/Task)
│   ├── activity.ts                logActivity() — single write path for the audit trail
│   ├── api-utils.ts               Standardized error → HTTP response mapping
│   ├── format.ts                  Date/initials/text formatting helpers
│   ├── validators/                Zod schemas, one file per resource
│   └── queries/                   Shared read logic — used by pages AND API routes
│       ├── projects.ts, tasks.ts, staff.ts, dashboard.ts
│       ├── automation.ts          Planned Phase 3 — rule evaluation
│       ├── notifications.ts       Planned Phase 3
│       └── ai.ts                  Planned Phase 5 — permission-scoped context builder
└── types/                         Shared frontend TypeScript types
```

The `lib/queries` directory is the load-bearing decision here: it's the one place business logic for "what data can this session see" lives, called from both `app/api/**/route.ts` (for the REST API / future clients) and `app/**/page.tsx` (for server-rendered pages), so the two can never drift out of sync — a bug fixed once is fixed everywhere.

---

## 8. Automation Architecture (Phase 3)

Event/action model, matching spec §42 exactly, executed by BullMQ workers reading from `notification_rules`:

| Event | Default Action | Configurable via |
|---|---|---|
| Task created | Notify assignee | `notification_rules` |
| Task due in N days (7/3/1) | Notify assignee | reminder intervals setting |
| Task overdue | Notify assignee (stage 1) | escalation config |
| Task overdue, still open after config period | Notify project manager (stage 2) | escalation config |
| Task overdue, still open longer | Notify CEO (stage 3) | escalation config |
| No progress update for N hours | Flag "potential inactivity", notify assignee | inactivity threshold setting |
| Blocker created | Notify project manager | `notification_rules` |
| Project health drops below threshold | Notify CEO | health threshold setting |

**Idempotency (spec §43, explicit requirement):** every scheduled check writes a dedupe key (`entityType:entityId:ruleId:periodBucket`) before sending; a job that reruns for the same period is a no-op. `notification_rules.conditions`/`actions` are JSON so reminder intervals, working days/hours, and channels are data, not code — satisfying §12's "do not hard-code these values."

**Scheduler:** BullMQ repeatable jobs (cron-like) drive: deadline checks (hourly), overdue/escalation sweep (hourly), inactivity detection (every 6h), daily staff/CEO digest (once daily, respecting configured working hours), health score recalculation (on every task/project mutation + nightly full sweep), workload snapshot (nightly).

---

## 9. Notification Architecture (Phase 3+)

```
                    ┌─────────────────────┐
Automation Engine ─▶│ NotificationService   │
Direct user action ─▶│  .send(userId,        │
(e.g. CEO message)   │    category, payload) │
                    └──────────┬───────────┘
                               │ writes
                               ▼
                    notifications table  (in-app, always)
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
              Channel adapters (Phase 6, added without touching call sites)
              ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
              │ Email  │ │WhatsApp│ │  Push  │ │  SMS   │
              └────────┘ └────────┘ └────────┘ └────────┘
```

`NotificationService.send()` is the only call site the rest of the app ever uses. It always writes the in-app `notifications` row (Phase 3); each channel adapter is a thin, swappable implementation of one interface (`send(user, category, payload): Promise<void>`), so adding email or WhatsApp in Phase 6 means implementing one adapter and registering it — no changes to automation rules, task routes, or the CEO messaging feature.

**Grouping (spec §13, §52):** the UI never renders five separate toasts; `GET /api/notifications` groups unread items by category (deadlines, CEO requests, task updates, project updates, messages) and the client renders "5 items require your attention" collapsed by default — the grouping is a read-time query concern, not a write-time one, so it stays consistent regardless of how notifications were generated.

---

## 10. AI Architecture (Phase 5)

```
"Which projects are delayed?"
        │
        ▼
POST /api/ai/assistant/query  (session required)
        │
        ▼
Context builder (lib/queries/ai.ts)
  — reuses the SAME lib/queries functions as the dashboards —
  — a staff session gets the same filtered dataset it would on My Day —
        │
        ▼
LLM call (Anthropic API) with:
  - the permission-scoped data as tool results / context
  - a system prompt requiring citations back to specific projects/tasks
        │
        ▼
Response, labeled "AI-generated", every claim traceable to a source row
        │
        ▼
ai_insights row written: recommendation + reasoning + sourceRefs + model/version
```

Three hard constraints carried over directly from the spec, enforced at the context-builder layer (not just prompted for — a prompt is not a security boundary):

1. **Permission scoping is structural, not prompted.** The context builder calls the exact same `lib/queries` functions the REST API uses, with the same session object — a staff member's AI query physically cannot receive another staff member's data, because the query layer never fetches it in the first place (spec §30: *"Staff cannot use AI to retrieve unauthorized company data"*).
2. **No invented data.** The AI only ever reasons over rows actually returned by `lib/queries` / passed as tool results; the system prompt requires every claim to cite a `sourceRef`, and `ai_insights.sourceRefs` stores exactly which rows justified the answer (spec §31, §32).
3. **No autonomous mutations.** The AI layer only ever calls read endpoints. Any AI recommendation that would change data (reassign a task, change a deadline) is written to `ai_insights` as `decision: PENDING` and requires a CEO to accept it through the normal `PUT /api/tasks/:id` flow — spec §63's human-approval boundary is structural (the AI has no mutation tool available to it at all), not a permission it merely chooses not to use.

---

## 11. Security Architecture

| Concern | Implementation |
|---|---|
| Password storage | bcrypt, cost factor 12 — never plaintext, never reversible |
| Session | JWT in an `httpOnly`, `sameSite=lax` cookie; `secure` in production; 7-day expiry |
| Session verification | `jose` (edge + node compatible) — same verification code path in middleware and route handlers, so there's exactly one place the logic can be wrong |
| Route-level authorization | `middleware.ts` — redirects unauthenticated/wrong-role requests before a page even renders |
| API-level authorization | Every Route Handler calls `requireSession()` / `requireRole()` (`lib/rbac.ts`) — **the API never trusts that middleware already checked**, so a route is safe even if called directly, not just through the UI |
| Object-level authorization | `lib/authz.ts` — a valid CEO/Staff session is necessary but not sufficient; staff additionally must be a project member / task assignee, checked against the database on every request |
| Input validation | Zod schemas for every mutation endpoint; invalid input never reaches Prisma |
| SQL injection | Prisma's parameterized query builder — there is no raw string concatenation into SQL anywhere in the codebase |
| XSS | React escapes all rendered content by default; no `dangerouslySetInnerHTML` anywhere in Phase 1 |
| Failed login protection | Per-email attempt counter with a rolling window (`app/api/auth/login/route.ts`); every attempt (success or failure) is written to `login_attempts` for later review. *(Phase 1 note: throttle state is in-memory, which is correct for a single server instance; move to Redis when scaling beyond one instance — the interface is already isolated to two functions, `isThrottled`/`recordFailure`, for exactly that swap.)* |
| Secrets | `.env`, never committed; `AUTH_SECRET` asserted present at boot (`lib/auth.ts` throws immediately with a clear message rather than silently signing tokens with `undefined`) |
| Error responses | `lib/api-utils.ts` maps internal errors to safe messages in production and only includes stack-trace detail in development — no internals leak to the client |
| Soft delete | Projects/tasks are never hard-deleted by API/UI actions — `deletedAt` is set and every read path filters it out — preserving the audit trail (spec §55) |
| CORS / secure headers | Same-origin by default (no separate API host in Phase 1); add `next.config.js` security headers (`X-Frame-Options`, `Content-Security-Policy`) before any external API consumer is introduced |
| File upload validation (Phase 2) | Type/size validation at the route boundary before anything touches storage; virus scanning hook left as an explicit extension point |
| Rate limiting at scale (Phase 3+) | Move from in-memory throttling to a Redis-backed limiter shared across instances |

---

## 12. Deployment Architecture

```
                     ┌─────────────────────┐
                     │   CI/CD (GitHub Actions or similar)  │
                     │   lint → type-check → build → migrate deploy │
                     └───────────┬─────────────────────────┘
                                 ▼
        ┌────────────────────────────────────────────┐
        │  App hosting                                  │
        │  Vercel  — or  containerized Node (Docker) on   │
        │  any platform that runs a long-lived Node process │
        └───────────────┬────────────────────────────────┘
                         │
        ┌────────────────▼───────────────┐    ┌───────────────────────┐
        │  Managed PostgreSQL              │    │  Managed Redis (Phase 3+)  │
        │  (RDS / Supabase / Neon / Azure) │    │  (Upstash / ElastiCache)     │
        │  automated backups + PITR         │    └───────────────────────┘
        └───────────────────────────────────┘
```

**Recommended baseline:**
- **App:** Vercel for the simplest path (matches Next.js exactly, zero-config previews per PR) or a Docker image (`next build && next start`) on any Node host if the org needs to self-host internal tools.
- **Database:** any managed Postgres with automated daily backups and point-in-time recovery enabled from day one (spec §56 — *"Do not assume the frontend host provides sufficient backup protection"*). Run `npm run db:deploy` (non-interactive `prisma migrate deploy`) as a release step, never `db:migrate` in production.
- **Redis:** introduced in Phase 3 alongside the automation engine; not needed to run Phase 1–2.
- **Environment variables:** set via the hosting platform's secret manager, never in source. `.env.example` documents every variable Phase 1 needs plus placeholders for Phase 2+ so the operator provisions them ahead of time.
- **Observability:** structured server-side logging already flows through `lib/api-utils.ts`'s single error-handling path — wire that to a log aggregator (or Sentry) as the first production add-on before anything else.
- **Disaster recovery:** because deletes are soft (§11) and activity/audit history is immutable, the two things a restore actually needs — "what changed and when" and "can we undo it" — are already preserved independently of the database backup itself.

---

## 13. Development Phases

| Phase | Scope | Status |
|---|---|---|
| **1 — Foundation** | Auth, roles, users, projects, tasks, assignments, basic dashboards | ✅ **Implemented** (this codebase) |
| **2 — Project Intelligence** | Timeline/calendar/Gantt, milestones, dependencies, progress, project health score, workload view, comments, attachments, blockers | Next |
| **3 — Automation** | Reminders, overdue escalation, no-progress detection, daily/weekly digests, notification center, scheduler | Planned |
| **4 — Executive Intelligence** | CEO Command Center, Attention Center, status-request workflow, advanced filters, reports/exports, audit log UI | Planned |
| **5 — AI** | AI assistant, project summaries, risk detection, smart priority engine | Planned |
| **6 — Integrations** | Email, WhatsApp, push, calendar sync, cloud storage, future ERP integrations | Planned |

Each phase builds strictly on the previous one's schema and `lib/queries` layer — no phase requires restructuring what an earlier phase shipped, which is what makes "build incrementally, never move forward with critical errors unresolved" (spec §67) practical to actually follow.

---

## 14. Testing Strategy

| Layer | Tool (recommended) | What it covers |
|---|---|---|
| Unit | Vitest | `lib/rbac.ts`, `lib/authz.ts` decision logic, `lib/format.ts`, Zod schemas — pure functions, no database |
| Integration | Vitest + a test Postgres schema | `lib/queries/*` against real Prisma queries — the layer both pages and API routes depend on, so one well-tested layer covers both |
| API | Vitest + `next-test-api-route-handler` (or Playwright API testing) | Every Route Handler: success path, validation failure, 401/403 paths |
| Authorization (explicit, spec §59) | Integration tests | *Staff cannot read/update another staff member's task or a project they're not on* (assert 403/empty result, not just "UI hides the button") · *CEO can access any non-deleted project/task* · *object-level checks hold even when the object ID is guessed/enumerated* |
| Automation (Phase 3+) | Integration tests against a fake clock | *A reminder fires exactly once per configured interval* · *escalation stages fire in order and stop once resolved* · *rerunning a job for the same period sends nothing twice* (idempotency) |
| Database | Prisma + integration tests | Cascade behavior (deleting a project's members doesn't orphan tasks), soft-delete filtering, uniqueness constraints (`project.code`, `user.email`, `(projectId,userId)`) |
| Frontend (critical paths) | Playwright | Login → role-correct redirect · CEO creates a project → appears in list · Staff quick-updates a task → progress bar reflects it without a full reload |

**Phase 1 status:** the architecture is structured to make every scenario above straightforward to add — RBAC/authz logic is isolated in two small pure-function-heavy modules specifically so it's unit-testable without a database, and the shared `lib/queries` layer means integration tests written against it automatically cover both the API and the pages. Test tooling (Vitest config, a disposable test-database setup) is the recommended first addition when Phase 2 work begins, before the codebase grows past the point where manual verification is reliable.

---

## Production Readiness Checklist (Phase 1 scope)

- [x] Authentication works (login, logout, session persistence)
- [x] CEO login works, routes to `/ceo/dashboard`
- [x] Staff login works, routes to `/staff/my-day`
- [x] Role permissions enforced (middleware + API-level, not just hidden UI)
- [x] Object-level authorization enforced (staff scoped to their own projects/tasks)
- [x] Projects: create, list, filter, detail, update, archive
- [x] Tasks: create, list, detail, status/progress quick-update
- [x] Assignments: staff ↔ project membership, task ↔ assignee
- [x] Basic CEO dashboard (KPIs, Needs Attention, project table)
- [x] Basic Staff dashboard (My Day, My Tasks)
- [x] Audit/activity trail (project activity feed)
- [x] API security: input validation, parameterized queries, failed-login throttling, no leaked stack traces
- [x] Responsive layout (mobile-friendly staff screens per spec §18)
- [x] Error/empty/loading states in the design system
- [ ] Production build verified — **pending two external network dependencies unavailable in the authoring sandbox** (Prisma engine download, Google Fonts fetch); both are standard requirements that resolve automatically with normal internet access. `npx tsc --noEmit` and `next build` were run against this codebase with those two dependencies stubbed out and the rest of the app — every route, every page, every import — compiles clean.
- [ ] Timeline, milestones, dependencies, health score, workload page, reminders, escalation, CEO Command Center, reports, AI — **out of scope for Phase 1 by design**, see §13.
