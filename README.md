# Team Task Manager

A full-stack collaborative task tracker built for the Ethara.ai full-stack assignment.
Multi-tenant by **project** — each project has its own members, roles, and tasks.

## Live app

**https://client-production-419f.up.railway.app**

- API: https://server-production-34a05.up.railway.app (try `/health`)
- Sign up with any email/password (≥8 chars), or use the demo account: `tarun@prod.test` / `password123`

**Stack:** TypeScript everywhere · Node 20 + Express + Prisma + PostgreSQL · React 18 + Vite + Tailwind CSS · TanStack Query · Multi-stage Docker builds · Nginx for SPA serving · Railway for deployment.

---

## Features

- **Auth** — JWT-based signup/login with bcrypt password hashing
- **Projects** — create projects, add members by email, role-aware permissions
- **Tasks** — title, description, due date, priority, status, assignee; per-project task board
- **Roles** — Admin (manages tasks + members) / Member (updates status on own tasks)
- **Dashboards** — global ("my tasks across projects") and per-project metrics
- **Production-grade** — multi-stage Docker, non-root containers, validated env, Zod request validation, structured error handling, healthchecks, security headers (helmet, nginx headers), CORS allowlist

---

## Repo layout

```
Team-Task-Manager/
├── server/                 Express API (TypeScript)
│   ├── src/
│   │   ├── lib/            env, prisma client, jwt, error classes
│   │   ├── middleware/     auth, project access, central error handler
│   │   ├── validators/     Zod schemas for request bodies
│   │   ├── routes/         auth, projects, members, tasks, dashboard
│   │   └── index.ts        app bootstrap
│   ├── prisma/schema.prisma
│   ├── Dockerfile          multi-stage build, non-root runtime
│   └── package.json
├── client/                 React SPA (TypeScript)
│   ├── src/
│   │   ├── lib/            api client, auth context, query client
│   │   ├── components/     Layout, ProtectedRoute, MetricCard
│   │   └── pages/          Login, Signup, Dashboard, Projects, ProjectDetail, …
│   ├── Dockerfile          builds, then serves via nginx
│   ├── nginx.conf          SPA fallback + security headers + caching
│   └── package.json
├── docker-compose.yml      local stack: postgres + server + client
├── .env.example            root env for compose
└── README.md
```

---

## Running locally

You have three options. Pick one based on what's installed.

### Option A — Docker Compose (recommended once you have Docker Desktop)

```bash
cp .env.example .env
docker compose up --build
```

That brings up:
- `db` — PostgreSQL 16 on `localhost:5432`
- `server` — API on http://localhost:4000 (runs `prisma migrate deploy` then starts)
- `client` — UI on http://localhost:5173 (nginx serving the React build)

Signup at http://localhost:5173/signup, then create a project.

### Option B — Native Node + a Postgres URL (no Docker)

You need Postgres running somewhere. Easiest free option: [Neon](https://neon.tech) (5-min signup, free tier) — copy the connection string.

```bash
# Backend
cd server
cp .env.example .env
# edit .env: paste your Postgres URL into DATABASE_URL, set JWT_SECRET
npm install
npx prisma migrate dev
npm run dev          # API on :4000

# Frontend (new terminal)
cd client
cp .env.example .env # VITE_API_URL=http://localhost:4000
npm install
npm run dev          # UI on :5173
```

### Option C — Mix (DB in Docker, app native)

```bash
docker compose up -d db
# Then run server + client natively as in Option B,
# with DATABASE_URL=postgresql://tasks:tasks@localhost:5432/tasks?schema=public
```

---

## Environment variables

### Backend (`server/.env`)

| Var              | Required | Default                                        | Notes                                  |
| ---------------- | -------- | ---------------------------------------------- | -------------------------------------- |
| `DATABASE_URL`   | yes      | —                                              | Postgres connection string             |
| `JWT_SECRET`     | yes      | —                                              | At least 16 chars, random              |
| `JWT_EXPIRES_IN` | no       | `7d`                                           | jsonwebtoken duration syntax           |
| `CLIENT_ORIGIN`  | no       | `http://localhost:5173`                        | Comma-separated list allowed for CORS  |
| `PORT`           | no       | `4000`                                         |                                        |
| `NODE_ENV`       | no       | `development`                                  |                                        |

### Frontend (`client/.env`)

| Var            | Default                  | Notes                                                             |
| -------------- | ------------------------ | ----------------------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:4000`  | Baked into the bundle at build time. For prod, the deployed API.  |

---

## API summary

Auth and middleware:
- `POST /api/auth/signup` `{ name, email, password }` → `{ token, user }`
- `POST /api/auth/login` `{ email, password }` → `{ token, user }`
- `GET  /api/auth/me` (auth) → `{ user }`

Projects:
- `GET    /api/projects` (auth) — projects you belong to
- `POST   /api/projects` (auth) — creator becomes ADMIN
- `GET    /api/projects/:id` (member)
- `PATCH  /api/projects/:id` (admin)
- `DELETE /api/projects/:id` (admin)

Members (mounted at `/api/projects/:projectId/members`):
- `GET    /` (member) · `POST /` (admin) · `PATCH /:userId` (admin) · `DELETE /:userId` (admin)
- Last-admin guard prevents demoting/removing the only admin.
- Removing a member auto-unassigns their tasks.

Tasks:
- `GET    /api/projects/:projectId/tasks?status=&assignedToId=&overdue=` (member)
- `POST   /api/projects/:projectId/tasks` (member)
- `GET    /api/tasks/:id` (member)
- `PATCH  /api/tasks/:id` — admin can edit anything; non-admin can update **only `status`** and **only on tasks assigned to them**
- `DELETE /api/tasks/:id` — admin or task creator

Dashboard:
- `GET /api/dashboard` (auth) — totals, by-status, my-assigned, overdue across all my projects
- `GET /api/projects/:id/dashboard` (member) — same, per project, plus tasks-per-user

`GET /health` returns `{ status: "ok" }`.

---

## Permission model

Roles are **per project**, not global — stored on `ProjectMember(projectId, userId, role)`. A user can be ADMIN in one project and MEMBER in another.

| Action                          | Admin | Member  | Outsider |
| ------------------------------- | :---: | :-----: | :------: |
| View project + tasks            |  ✓    |   ✓     |   ✗      |
| Create project                  |  any logged-in user                  |
| Add / remove members            |  ✓    |   ✗     |   ✗      |
| Create task                     |  ✓    |   ✓     |   ✗      |
| Edit task fields (title, etc.)  |  ✓    |   ✗     |   ✗      |
| Update task status              |  ✓    | only own assigned | ✗ |
| Delete task                     |  ✓    | creator only      | ✗ |

---

## Deployment — Railway (zero-cost path)

Everything runs on Railway via the Dockerfiles in `server/` and `client/`. Railway gives a $5/month trial credit which covers a small project comfortably.

### One-time setup
1. Sign in at [railway.app](https://railway.app) with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select this repo.

### Database
3. In the project: **+ New** → **Database** → **PostgreSQL**. Railway provisions it and sets `DATABASE_URL` automatically when you reference it.

### API service
4. **+ New** → **GitHub Repo** → same repo. In the service settings:
   - **Root Directory**: `server`
   - **Builder**: Dockerfile (auto-detected)
   - **Variables**:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference the Postgres service)
     - `JWT_SECRET` = run `openssl rand -hex 32` and paste
     - `JWT_EXPIRES_IN` = `7d`
     - `CLIENT_ORIGIN` = your client URL (set after step 5)
     - `NODE_ENV` = `production`
   - **Networking** → **Generate Domain** → note the URL (e.g. `https://api.up.railway.app`)
5. The Dockerfile runs `prisma migrate deploy` on every boot, so migrations apply automatically.

### Client service
6. **+ New** → **GitHub Repo** → same repo:
   - **Root Directory**: `client`
   - **Builder**: Dockerfile
   - **Build Args** (under Settings → Build): `VITE_API_URL` = your API URL from step 4
   - **Networking** → **Generate Domain** → that's your live app URL
7. Go back to the API service and set `CLIENT_ORIGIN` to the client URL → redeploy.

You're live. Visit the client URL, sign up, and you're done.

### Cost-protection notes
- No background jobs, no cron, no websockets — keeps the service idle when not in use.
- One small Postgres, no replicas.
- If credit runs out: client → Vercel free tier; backend → Render free tier (spins down after 15 min); DB → Neon free tier. The Dockerfiles work the same on Render and Fly.io.

---

## Decisions worth knowing about

- **Per-project roles, not global** — a user can admin one project and be a member of another.
- **Members can create tasks** — the spec is ambiguous; this matches how real teams work. Only admins can edit fields other than status, assign tasks, or remove members.
- **Last-admin guard** — you can't demote or remove the only admin of a project.
- **Removing a member** unassigns their tasks (Prisma `onDelete: SetNull`) instead of deleting them.
- **Overdue** = `dueDate < now AND status != DONE`.
- **Add member by email lookup of an existing user** — no invite-by-email flow (out of scope for the time budget).
- **JWT in `localStorage`** — pragmatic for an assignment; would move to httpOnly cookies for a real product.

---

## Scripts cheat sheet

```bash
# server/
npm run dev               # tsx watch, reload on change
npm run build             # prisma generate && tsc
npm run start             # node dist/index.js (after build)
npm run prisma:migrate    # create + apply migration in dev
npm run prisma:deploy     # apply pending migrations (used on boot in Docker)
npm run prisma:studio     # open Prisma Studio

# client/
npm run dev               # Vite dev server with HMR
npm run build             # type-check + production bundle
npm run preview           # serve the built bundle locally
```

---

## Out of scope (deliberately)

Comments on tasks, attachments, notifications, real-time updates, activity log, drag-and-drop, labels/tags, subtasks, multiple assignees, password reset, email verification. Mentioning explicitly so the omission reads as a choice rather than an oversight.
