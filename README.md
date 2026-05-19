# WIMS — Wedding Invite Management System

A self-hostable platform for creating events, managing guest lists, and tracking RSVPs. The name says "wedding", but the data model is generic — extending it to other event types is purely additive.

- **Hosts** sign up, create events, upload their guest list from Excel (or add invitees manually), and share a unique invitation URL with each guest.
- **Guests** open their personal URL, see the event details, RSVP (Accept / Decline / Maybe), submit dietary requests, and download a designed PDF invitation. The URL is unguessable, so the invite can't be forwarded or gate-crashed.
- **Hosts** watch RSVPs land in a real-time dashboard with stats, search, filtering, and Excel export.

The MVP supports a single event type ("Wedding") with a beautiful PDF template; the schema is extensible to other event types without migration churn.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Quick start](#quick-start)
3. [Prerequisites](#prerequisites)
4. [Local setup — step by step](#local-setup--step-by-step)
5. [Environment variables](#environment-variables)
6. [npm scripts reference](#npm-scripts-reference)
7. [Project layout](#project-layout)
8. [Architecture](#architecture)
9. [Domain model](#domain-model)
10. [GraphQL API surface](#graphql-api-surface)
11. [Testing](#testing)
12. [Database & migrations](#database--migrations)
13. [Deployment — Netlify + Neon](#deployment--netlify--neon)
14. [Self-host via Docker](#self-host-via-docker)
15. [Google Places setup](#google-places-setup)
16. [Email service](#email-service)
17. [Security notes](#security-notes)
18. [Troubleshooting](#troubleshooting)
19. [Roadmap & extension points](#roadmap--extension-points)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict) | Type safety end-to-end |
| Web framework | **Next.js 14** (App Router) | React UI + API routes in one binary, easy to deploy |
| GraphQL server | **GraphQL Yoga** | Lightweight, Next.js-friendly, serverless-compatible |
| GraphQL schema | **Pothos** | First-class TypeScript inference, no decorators |
| Database | **PostgreSQL 16** | Reliable, rich JSONB support |
| ORM | **TypeORM 0.3** | Familiar entity-based ORM, explicit migrations |
| Hosted DB (prod) | **Neon** | Free tier + built-in connection pooling for serverless |
| Auth tokens | **JWT (HS256, 7-day Bearer)** | Stateless, no refresh — simple by design |
| Password hashing | **Argon2id** via `@node-rs/argon2` | Modern, native-binding-free for Netlify |
| PDF rendering | **`@react-pdf/renderer`** | Declarative React → PDF, no headless Chrome |
| Excel parsing | **SheetJS (`xlsx`)** | Mature `.xlsx` reader/writer |
| Location picker | **Google Places API** | De facto standard for venue search |
| Styling | **Tailwind CSS** | Fast to iterate on a wedding-aesthetic theme |
| Tests | **Vitest** (in-process E2E through Yoga) | Fast, runs the real schema against a real Postgres |
| Local infra | **Docker Compose** | Single command Postgres + optional app container |

---

## Quick start

If you already have Docker, Node ≥ 20, and npm installed:

```bash
git clone <your-fork>
cd wims
cp .env.example .env

# 1. Generate a real JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env && rm .env.bak

# 2. Start Postgres and install deps
docker compose up -d postgres
npm install

# 3. Migrate both the dev and test databases
npm run db:setup

# 4. Run!
npm run dev
```

Open <http://localhost:3000> in your browser. Sign up, verify your email (the verification link is written to the `sent_emails` table — see [Email service](#email-service)), and start creating events.

GraphQL playground (development only): <http://localhost:3000/api/graphql>

---

## Prerequisites

- **Node.js ≥ 20** (tested on 22). Verify with `node --version`.
- **npm ≥ 10** (ships with Node 20+).
- **Docker Desktop** (or Docker Engine + Compose v2). Verify with `docker --version` and `docker compose version`.
- **`openssl`** for generating the JWT secret (preinstalled on macOS/Linux; Windows: WSL or Git Bash).
- (Optional) **Google Cloud account** if you want the venue picker live during local dev — otherwise the address input falls back to plain text.

---

## Local setup — step by step

### 1. Environment file

```bash
cp .env.example .env
```

The defaults assume the bundled Docker Postgres on **port 55432** (we use a non-standard port to avoid collisions with any other Postgres you might already have running locally — like a `sportify-postgres` container on 5432). The chosen port lives in `docker-compose.yml` and the `DATABASE_URL` in `.env.example`.

### 2. Generate `JWT_SECRET`

The default value in `.env.example` is a placeholder and will refuse to start the app. Generate a real one:

```bash
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env && rm .env.bak
```

Or simply edit `.env` and paste a 64+ character random string.

### 3. Start Postgres

```bash
docker compose up -d postgres
```

This creates two databases:
- `wims` — your development data.
- `wims_test` — used by the test suite (it gets truncated between tests).

To check it's healthy:

```bash
docker exec wims-postgres pg_isready -U wims
```

### 4. Install dependencies

```bash
npm install
```

This installs around 600 packages. Notable native modules:
- `@node-rs/argon2` — pure Rust binding, no compilation needed.
- `pg` — native bindings preferred but JS fallback works.

### 5. Run migrations on both databases

```bash
npm run db:setup
```

This is a convenience that runs migrations against `DATABASE_URL` (dev) and then `TEST_DATABASE_URL` (test). If you'd rather run them one at a time:

```bash
npm run migration:run
# tests DB:
DATABASE_URL='postgres://wims:wims@localhost:55432/wims_test' \
  node --env-file=.env --no-warnings ./node_modules/typeorm/cli-ts-node-commonjs.js \
  migration:run -d src/infrastructure/db/datasource.ts
```

After this, the `wims` and `wims_test` databases will contain all 7 tables (`users`, `events`, `invitees`, `rsvps`, `email_verification_tokens`, `password_reset_tokens`, `sent_emails`).

### 6. Run the dev server

```bash
npm run dev
```

Hot-reloading Next.js dev server at <http://localhost:3000>.

### 7. Verify the install

- Open <http://localhost:3000> — landing page should render.
- Open <http://localhost:3000/api/graphql> — GraphiQL playground should open.
- Run `npm test` — all 44 E2E tests should pass.
- Run `npm run typecheck` — should be silent (no errors).

---

## Environment variables

All variables documented in `.env.example`. Required ones marked **bold**.

| Variable | Required | Purpose | Example |
|---|---|---|---|
| **`DATABASE_URL`** | yes | Postgres connection string | `postgres://wims:wims@localhost:55432/wims` |
| **`TEST_DATABASE_URL`** | yes (for tests) | Test Postgres (separate DB on same instance) | `postgres://wims:wims@localhost:55432/wims_test` |
| **`JWT_SECRET`** | yes | HMAC-SHA256 signing key, ≥ 32 chars | `openssl rand -base64 64` |
| `APP_BASE_URL` | recommended | Public URL — used in email links and invite URLs | `http://localhost:3000` |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | optional | Enables venue picker; falls back to plain text input | `AIzaSy…` |
| `NODE_ENV` | optional | Standard Node env | `development` |
| `DB_LOGGING` | optional | If `true`, TypeORM logs every query | `false` |

**Never commit `.env`** — it's in `.gitignore`. Each developer/environment has its own.

---

## npm scripts reference

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server (hot reload) |
| `npm run build` | Production build (standalone output for Docker/Netlify) |
| `npm start` | Run the production build |
| `npm run typecheck` | Strict TypeScript check, no emit |
| `npm run lint` | `next lint` (ESLint) |
| `npm test` | Run E2E tests once and exit |
| `npm run test:watch` | Vitest in watch mode |
| `npm run migration:run` | Apply pending migrations to `DATABASE_URL` |
| `npm run migration:revert` | Revert the most recent migration |
| `npm run migration:generate src/infrastructure/db/migrations/<name>` | Generate a new migration from entity diff |
| `npm run migration:create src/infrastructure/db/migrations/<name>` | Create an empty migration file |
| `npm run db:setup` | Migrate both dev and test DBs |

---

## Project layout

```
wims/
├── docker-compose.yml          # Postgres on 55432 + optional `app` profile
├── Dockerfile                  # Multi-stage Next.js build
├── docker/postgres-init.sql    # Bootstraps the wims_test database
├── docs/
│   └── prd-wims-mvp.md         # Product Requirements Document
├── plans/
│   └── wims-mvp.md             # 12-phase implementation plan
├── src/
│   ├── app/                    # Next.js App Router pages + route handlers
│   │   ├── (auth)/             # /signup /login /verify-email /reset-password
│   │   ├── api/graphql/        # Yoga + Pothos GraphQL endpoint
│   │   ├── dashboard/          # Host-only event management UI
│   │   └── invite/[token]/     # Public invite page + PDF route
│   ├── domain/                 # Pure logic, no I/O (high-leverage unit-testable code)
│   │   ├── auth/email.ts
│   │   ├── event/rsvp-deadline-policy.ts
│   │   ├── invitee/invite-token-generator.ts
│   │   ├── invitee/invitee-contact-policy.ts
│   │   └── rsvp/rsvp-state-machine.ts
│   ├── application/            # Use-case services & ports
│   │   ├── ports/              # Interfaces (EmailService, Clock)
│   │   └── services/           # AuthService, EventService, InviteeService, etc.
│   ├── infrastructure/         # Adapters (DB, email, PDF, password, JWT, Excel)
│   │   ├── auth/
│   │   ├── db/
│   │   │   ├── datasource.ts
│   │   │   ├── entities/
│   │   │   └── migrations/
│   │   ├── email/
│   │   ├── excel/
│   │   └── pdf/
│   └── web/                    # GraphQL schema, resolvers, request helpers
│       ├── graphql/
│       │   ├── builder.ts      # Pothos schema builder
│       │   ├── context.ts      # Request → context resolver
│       │   ├── schema/         # One file per domain area
│       │   └── utils/
│       └── client/             # Shared client-side helpers (forms, auth storage)
└── tests/
    ├── setup.ts                # Env defaults for tests
    ├── helpers/                # Test DB, in-memory email, GraphQL runner
    └── e2e/                    # 8 suites covering all flows
```

---

## Architecture

WIMS uses a **hexagonal / clean architecture**. Dependencies flow inward; outer rings depend on inner rings, never the other way.

```
┌─────────────────────────────────────────────────────────────────┐
│  WEB                                                            │
│  Next.js pages, GraphQL resolvers, request helpers              │
│  ──────────────────────────────────────────────────────────     │
│  │ APPLICATION                                                  │
│  │ Use-case services (AuthService, EventService, RsvpService…)  │
│  │ Ports (EmailService, Clock)                                  │
│  │  ────────────────────────────────────────                    │
│  │  │ DOMAIN                                                    │
│  │  │ Pure logic: policies, value objects, state machines       │
│  │  │ (InviteTokenGenerator, RsvpStateMachine, …)               │
│  │  └────────────────────────────                               │
│  └─────────────────────                                         │
│                                                                 │
│  INFRASTRUCTURE                                                 │
│  Adapters: TypeORM repos, Argon2 hasher, JWT, console email,    │
│  React-PDF renderer, Excel parser                               │
└─────────────────────────────────────────────────────────────────┘
```

### Deep modules (the load-bearing pieces)

These are designed to encapsulate complex behaviour behind a narrow, testable interface — see the PRD for the full rationale.

| Module | Location | What it owns |
|---|---|---|
| `InviteTokenGenerator` | `src/domain/invitee/` | 10-char URL-safe unguessable tokens, pluggable RNG |
| `RsvpStateMachine` | `src/domain/rsvp/` | Allowed state transitions, deadline enforcement |
| `InviteeContactPolicy` | `src/domain/invitee/` | First/last/email/phone validation + warning rules |
| `RsvpDeadlinePolicy` | `src/domain/event/` | Default deadline computation (event − 30 days) |
| `ExcelInviteeParser` | `src/infrastructure/excel/` | `.xlsx` → annotated rows |
| `WeddingInvitePdfRenderer` | `src/infrastructure/pdf/` | React component → PDF buffer |

---

## Domain model

```
User ──┬─< Event ──┬─< Invitee ── 1:1 ── Rsvp
       │           │
       │           └─< (one Event has many Invitees, each with a unique token)
       │
       └─< EmailVerificationToken
       └─< PasswordResetToken

SentEmail  (audit table — dev-time visibility into messages the system "sent")
```

- **User**: `email`, `password_hash`, `status` (`pending_verification` | `active`), `verified_at`.
- **Event**: `owner_user_id`, `event_type` ("wedding"), title, description, `starts_at`, `ends_at`, location (place_id + lat/lng + formatted), `rsvp_deadline_at` (nullable; computed to event − 30 days if unset), dress code, gift registry URL, schedule (JSONB), custom sections (JSONB), cover image.
- **Invitee**: `event_id`, `invite_token` (unique, 10 chars), `primary_first_name`, `primary_last_name`, optional `partner_first_name`/`partner_last_name` (couple invites), optional `email`/`mobile_no`.
- **Rsvp**: 1:1 with Invitee, `status` (`pending` | `accepted` | `declined` | `maybe`), dietary, songs, accommodation, `submitted_at`.

---

## GraphQL API surface

GraphQL endpoint: `POST /api/graphql`. Auth via `Authorization: Bearer <jwt>`.

### Public (no auth)

- `health: HealthStatus`
- `invite(token: String!): InviteView` — public invite read
- `submitRsvp(token: String!, input: SubmitRsvpInput!): InviteView` — guest RSVP
- `signup`, `login`, `verifyEmail`, `requestPasswordReset`, `resetPassword`

### Authenticated host

- `me: Me` — current user
- `events: [Event!]!` / `event(id: ID!)` — list/fetch own events
- `createEvent`, `updateEvent`, `deleteEvent`
- `eventInvitees(eventId)` / `eventInviteesList(eventId, status, search, sort, direction)`
- `addInvitee`, `updateInvitee`, `deleteInvitee`
- `previewInviteeImport(eventId, fileBase64)` → cached preview
- `commitInviteeImport(previewId, skipRowIndices)` → persists
- `eventDashboardStats(eventId)` — accepted/declined/maybe/pending counts
- `exportInvitees(eventId)` → base64 XLSX
- `inviteePdf(inviteeId)` → base64 PDF (host preview)

### Public PDF endpoint

- `GET /invite/:token/pdf` — streams `application/pdf` directly (no auth, scoped by token).

---

## Testing

Run all suites:

```bash
npm test
```

44 E2E tests across 8 suites, ~5 seconds total:

| Suite | What it covers |
|---|---|
| `tests/e2e/health.test.ts` | DB connectivity, GraphQL bootstrap |
| `tests/e2e/auth.test.ts` | Signup → verify → login → me, password reset |
| `tests/e2e/event.test.ts` | Event CRUD, cross-user isolation, deadline policy |
| `tests/e2e/invitee.test.ts` | Manual invitee CRUD, couple invites, token uniqueness |
| `tests/e2e/import.test.ts` | Excel import preview + commit, warnings, duplicates |
| `tests/e2e/rsvp.test.ts` | Public RSVP, deadline enforcement, couple flow |
| `tests/e2e/dashboard.test.ts` | Stats, filter/search/sort, CSV/Excel export |
| `tests/e2e/pdf.test.ts` | PDF generation, owner-only access |

### How tests work

- Tests boot the **real Yoga handler in-process** and hit it via `fetch`.
- They use the **real Postgres** (`TEST_DATABASE_URL`) — migrations run once per session, all tables truncated between tests.
- The `EmailService` is replaced with an in-memory `CapturingEmailService` so tests can read the verification/reset tokens that would have been emailed.
- `process.env.NODE_ENV` is forced to `test` to suppress console noise.

Watch mode:

```bash
npm run test:watch
```

---

## Database & migrations

### Generating a new migration

After changing or adding an entity:

```bash
npm run migration:generate src/infrastructure/db/migrations/<name>
```

TypeORM diffs the entities against the current schema and emits a new migration class.

Rename the class to include a timestamp suffix (TypeORM rejects names without one): `MyChange1700000000010`. The numeric suffix should sort *after* existing migration timestamps.

Then run:

```bash
npm run migration:run
```

### Reverting

```bash
npm run migration:revert
```

### Connecting from a CLI

```bash
docker exec -it wims-postgres psql -U wims -d wims
```

### Resetting the DB

```bash
docker compose down -v   # destroys the volume
docker compose up -d postgres
npm run db:setup
```

---

## Deployment — Netlify + Neon

### 1. Set up Neon

1. Create a project at <https://neon.tech>.
2. Copy the **pooled connection string** (the URL contains `-pooler` — this is mandatory for serverless to avoid exhausting connections on every cold start).
3. Ensure the URL ends with `?sslmode=require`.
4. Optionally create a separate Neon **branch** for tests and grab its pooled URL too.

### 2. Run migrations against Neon

From your local machine, point `DATABASE_URL` at Neon and run:

```bash
DATABASE_URL='postgres://USER:PASS@ep-xxx-pooler.region.aws.neon.tech/wims?sslmode=require' \
  node --env-file=.env --no-warnings ./node_modules/typeorm/cli-ts-node-commonjs.js \
  migration:run -d src/infrastructure/db/datasource.ts
```

### 3. Push to GitHub & connect on Netlify

1. Push the repo to GitHub.
2. On Netlify: **Add new site → Import from Git** → pick the repo.
3. Build command: `npm run build`. Publish directory: `.next`.
4. **Site settings → Environment variables** — set:
   - `DATABASE_URL` — Neon pooled URL
   - `JWT_SECRET` — `openssl rand -base64 64`
   - `APP_BASE_URL` — `https://<your-site>.netlify.app`
   - `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` — (optional)
5. Trigger a deploy.

The Netlify Next.js adapter automatically runs `/api/graphql` and dynamic routes as serverless functions.

> **Cold-start tip**: keep per-function `pool` size at 1–2 if you see Postgres connection-limit errors. Neon's pooler endpoint mitigates this but is not unlimited on the free tier.

---

## Self-host via Docker

A `Dockerfile` (multi-stage) is included. To run the full stack with Docker Compose:

```bash
docker compose --profile full up --build
```

This brings up Postgres **and** the `app` service. The image uses Next.js standalone output (small image, fast startup).

Pass `JWT_SECRET` from your shell or a `.env` file. The compose file already wires `DATABASE_URL` to the bundled Postgres.

To deploy elsewhere (Fly.io, Render, ECS, …): build the image, set the same env vars, expose port 3000.

---

## Google Places setup

The venue picker on the event create/edit page degrades gracefully — without an API key it's just a plain text input. To enable autocomplete + map preview:

1. Open <https://console.cloud.google.com>, create or pick a project.
2. **APIs & Services → Library** — enable:
   - **Places API**
   - **Maps JavaScript API**
3. **APIs & Services → Credentials → Create credentials → API key**.
4. **Restrict the key**:
   - *Application restrictions*: HTTP referrers
   - Add: `http://localhost:3000/*`, `http://localhost:*/*`, and your production URL pattern.
   - *API restrictions*: limit to **Places API** + **Maps JavaScript API**.
5. Put the key in `.env`:
   ```
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza…
   ```
6. Restart `npm run dev`. The event form's location field becomes an autocomplete dropdown.

> Variables prefixed `NEXT_PUBLIC_` are exposed to the browser bundle. The key restriction in step 4 is what actually prevents abuse — never skip it.

---

## Email service

WIMS sends three kinds of email: **verification**, **password reset**, **RSVP confirmation**. The system is wired through an **`EmailService` port** (interface) — defined in `src/application/ports/email-service.ts`.

In MVP, only one implementation ships: **`ConsoleEmailService`**. It:

1. Writes the email to the `sent_emails` table.
2. Logs it to the server console (suppressed in tests).

This means you can copy a verification or reset link straight from the database during local development:

```bash
docker exec wims-postgres psql -U wims -d wims \
  -c "SELECT to_address, subject, body FROM sent_emails ORDER BY sent_at DESC LIMIT 3;"
```

To plug in a real provider (Resend, Postmark, SendGrid…), add a new adapter that implements `EmailService`, swap it in `src/web/graphql/context.ts`, and add the provider's secret to your env vars. No other code changes.

---

## Security notes

- **Passwords** hashed with **Argon2id** (m=19456, t=2, p=1).
- **Tokens** (verification, password reset) are 32 bytes from `crypto.randomBytes`, base64url-encoded. Only the SHA-256 *hash* of the token is stored — the plaintext exists only in the email and the URL.
- **Reset tokens** are single-use and expire in 1 hour. Verification tokens expire in 24 hours.
- **Invite tokens** are 10-character base62 from a cryptographically secure RNG (~5.8 × 10¹⁷ possibilities). Treated as a bearer credential for that invitee.
- **Authorisation**: every host-facing resolver enforces `owner_user_id` on the event before touching invitees or RSVPs.
- **Anti-enumeration**: `requestPasswordReset` always returns success regardless of whether the email exists. Login returns a single "invalid email or password" message and runs a dummy hash on missing users so timing doesn't reveal account existence.
- **Rate-limiting**: in-process per-token RSVP rate limit (10/min). For production, replace with a Redis-backed limiter.
- **JWT**: HS256, 7-day expiry, **no refresh** — expired tokens force re-login (by design — keeps the moving parts small).

What WIMS does **not** do (out of scope for MVP):
- CSRF protection (not needed — Bearer header, not cookies).
- Email enumeration via `signup` (yes — duplicates return "already exists". Easy to remove if needed).
- 2FA / SSO.
- Audit logging beyond `sent_emails`.

---

## Troubleshooting

### `Error: DATABASE_URL is not set`

You forgot to copy `.env.example` to `.env`, or you're running a command that doesn't load `.env`. The npm migration scripts use `node --env-file=.env`. For ad-hoc commands, prefix with `node --env-file=.env …` or `export $(grep -v '^#' .env | xargs)`.

### `port is already allocated`

Something else is using port 55432 (or 5432 if you customised). Find it with `lsof -i :55432`. The most common cause is another `docker compose` project — change the port in `docker-compose.yml`.

### Tests fail with `Cannot find module 'ts-node'`

Run `npm install` again — `ts-node` is a dev dependency required by TypeORM's CLI.

### `Named export 'getCategory' not found` when running tests

The `@react-pdf/renderer` test path needs Vitest to inline `fontkit`/`unicode-properties`. The config already does this — make sure you haven't edited `vitest.config.ts`'s `server.deps.inline` entry.

### Migration error: `migration name is wrong`

TypeORM requires migration class names to end with a timestamp. Use `MyChange1700000000005` — the trailing number must be parseable as a long integer.

### "RSVP closed" right after creating an event

The default RSVP deadline is **30 days before the event start**. If your event is less than 30 days away, the deadline has already passed. Pass an explicit `rsvp_deadline_at` when creating the event, or set the start date further out.

### `JWT_SECRET must be set and at least 32 characters`

Generate one: `openssl rand -base64 64`.

### Docker Postgres won't come up

Check logs: `docker compose logs postgres`. If the volume is corrupted: `docker compose down -v` (destroys data) and `up` again.

---

## Roadmap & extension points

The MVP intentionally leaves these doors open, and the data model is shaped to make them additive:

- **Multiple event types** — `event_type` column already exists; add new templates and policies without schema changes.
- **Co-hosts / collaborators** — current single-`owner_user_id` model can be supplemented with an `event_collaborators` join table.
- **System-sent invites** — `EmailService` port is in place; drop in a Resend/SendGrid adapter and call it from the host UI when adding invitees.
- **Protected invite tokens** — schema can accommodate a `protected` flag + a name-or-code challenge before showing the invite.
- **Custom PDF templates** — `WeddingInvitePdfRenderer` is one of potentially many implementations of `InvitePdfRenderer`.
- **Real-time RSVP feed** — Yoga supports subscriptions; wire up `eventInviteesList` to push.

See `docs/prd-wims-mvp.md` for the original product spec and `plans/wims-mvp.md` for the phase-by-phase implementation plan.

---

## License

Not yet specified. Add one (`LICENSE` file at the root) before publishing the repo.
