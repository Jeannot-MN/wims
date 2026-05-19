# Plan: WIMS MVP

> Source PRD: `docs/prd-wims-mvp.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Stack**: TypeScript (strict), Next.js (App Router), GraphQL Yoga + Pothos, TypeORM + PostgreSQL (Neon hosted), Argon2id, JWT Bearer, `@react-pdf/renderer`, SheetJS for `.xlsx`, Google Places API, Docker.
- **Layering**: Hexagonal — `domain` (pure) → `application` (use cases) → `infrastructure` (adapters) → `web` (Next.js + resolvers). Outer depends on inner only.
- **GraphQL endpoint**: `POST /api/graphql` (Yoga mounted on a Next.js route handler).
- **Routes**:
  - `/signup`, `/login`, `/verify-email`, `/reset-password` — public auth pages
  - `/dashboard` — host home (events list)
  - `/dashboard/events/new` — create event
  - `/dashboard/events/[id]` — event detail + RSVP dashboard tabs
  - `/dashboard/events/[id]/invitees` — invitee management
  - `/invite/[token]` — public invite + RSVP page
  - `/invite/[token]/pdf` — PDF download endpoint
- **Auth**: JWT Bearer in `Authorization` header, 7-day expiry, **no refresh** — expired token forces re-login. Argon2id for password hashing.
- **Authorisation**: every host-facing resolver enforces ownership via `owner_user_id`. Public invite endpoint scoped only by `invite_token`.
- **Invite token**: 10 URL-safe base62 characters from a CSPRNG. Schema supports a future `protected` flag without migration.
- **Couple-invite model**: a single `invitee` row carries `primary_first_name/last_name` and optional `partner_first_name/last_name`. One token, one RSVP, shared status.
- **Email**: `EmailService` is a port. MVP implementation logs to console and writes to a `sent_emails` audit table. Tests use an in-memory implementation. No third-party provider in MVP.
- **Key models**: `User`, `Event`, `Invitee`, `Rsvp`, `EmailVerificationToken`, `PasswordResetToken`, `SentEmail`.
- **Event extensibility**: `event_type` discriminator column (`"wedding"` only in MVP). Single-owner model (`owner_user_id`); future collaborators table is additive.
- **Database access**: TypeORM, migrations committed. Connections route through Neon's pooled endpoint for serverless compatibility.
- **Testing**: end-to-end through the GraphQL API against a real (test) Postgres schema. In-memory `EmailService` for capturing emails. Seeded RNG for deterministic invite tokens where needed.
- **Deploy targets**: local Docker Compose, Netlify (Next.js adapter + Neon pooled URL), and self-host via Docker image.

---

## Phase 0: Project scaffolding + first tracer

**User stories**: 62, 63, 64, 65

### What to build

Lay the rails. A thin end-to-end "hello" that proves every layer wires together with no business logic yet.

- Initialise a TypeScript Next.js (App Router) project with strict mode.
- Set up Yoga + Pothos at `/api/graphql` exposing a single `health` query returning a static value.
- Wire TypeORM to PostgreSQL with a placeholder entity and a first migration.
- Provide `docker-compose.yml` (Postgres + app) for local dev.
- Document Neon project creation, pooled connection string, and Netlify env-var wiring in a `README` section.
- Establish folder layout for the four layers (`domain`, `application`, `infrastructure`, `web`).
- Set up the E2E test harness that boots the GraphQL handler in-process against a test Postgres schema.
- Render a public home page that calls the `health` query to prove the chain end-to-end.

### Acceptance criteria

- [ ] `docker-compose up` brings up Postgres + the app locally; the home page loads.
- [ ] `GET /` triggers a GraphQL `health` query that returns the expected payload.
- [ ] A first TypeORM migration creates a placeholder table and runs cleanly.
- [ ] Strict TypeScript compiles with zero errors.
- [ ] E2E test harness runs at least one passing test hitting the `health` query against a fresh test schema.
- [ ] README documents Neon + Netlify env-var setup steps.

---

## Phase 1: Signup, email verification, login, logout

**User stories**: 1, 2, 3, 4, 7

### What to build

The full account-creation arc end-to-end, with the email service stubbed to console + audit table.

- `signup(email, password)` mutation creates a `pending_verification` user and emits a verification email containing a one-time token.
- `verifyEmail(token)` mutation flips the user to `active`.
- `login(email, password)` mutation returns a 7-day JWT for active users; rejects others with a clear reason.
- `me` query returns the current user when called with a valid Bearer token.
- Argon2id password hashing in place via a non-native-compile binding.
- A `EmailService` port with a `ConsoleEmailService` implementation that also writes to a `sent_emails` audit table.
- Public pages: `/signup`, `/login`, `/verify-email` (consumes the `token` query param), plus a stub authenticated page that reads `me`.
- Client stores the JWT and attaches `Authorization: Bearer` to subsequent GraphQL calls; expiry triggers a redirect to `/login`.

### Acceptance criteria

- [ ] Signing up creates a `pending_verification` user and writes a verification email to the audit table.
- [ ] Visiting the verification link transitions the user to `active`.
- [ ] Login with an active account returns a JWT; login with an unverified or wrong-password account is rejected.
- [ ] A protected query rejects requests without a valid Bearer token.
- [ ] A protected query returns the right user when called with a valid token.
- [ ] After the JWT expires, the client redirects to `/login`.
- [ ] E2E tests cover signup → verify → login → authenticated query → expired-token rejection.

---

## Phase 2: Password reset

**User stories**: 5, 6

### What to build

Self-contained password-reset arc, reusing the email service from Phase 1.

- `requestPasswordReset(email)` mutation issues a single-use token (always returns success to avoid email enumeration) and emails a reset link.
- `resetPassword(token, newPassword)` mutation consumes the token, updates the hash, and invalidates other outstanding tokens.
- Public pages: a "forgot password" page that calls `requestPasswordReset`, and a `/reset-password` page that consumes the token.
- Used tokens cannot be reused; expired tokens are rejected.

### Acceptance criteria

- [ ] Requesting a reset for an existing email writes a reset email to the audit table.
- [ ] Requesting a reset for a non-existent email still returns success (no enumeration).
- [ ] The reset link lets the user set a new password and log in with it.
- [ ] Reused reset tokens are rejected.
- [ ] Expired reset tokens are rejected.
- [ ] E2E test covers the full happy path and the reuse/expiry rejections.

---

## Phase 3: Event CRUD — core fields

**User stories**: 8, 9, 10, 11, 13, 14, 20, 21, 22, 23, 61

### What to build

Hosts can create, read, update, list, and delete events with the core fields. Location is captured as a plain text address for now — the map picker arrives in Phase 4.

- `Event` entity and migration with: `owner_user_id`, `event_type` (`"wedding"`), `title`, `description` (rich text), `starts_at`, `ends_at` (nullable), `address_text` (plain text placeholder), `rsvp_deadline_at` (nullable; defaults via policy when null).
- `RsvpDeadlinePolicy` (domain) computing the effective deadline (`event_start − 30 days` if unset).
- Mutations: `createEvent`, `updateEvent`, `deleteEvent`. Queries: `events` (current user's), `event(id)` (must be owner).
- Pages: `/dashboard` (list), `/dashboard/events/new` (create), `/dashboard/events/[id]` (view/edit/delete).
- Authorisation: a user cannot read or mutate another user's event.

### Acceptance criteria

- [ ] A logged-in host can create an event with title, description, start (+ optional end), address text, and (optional) RSVP deadline.
- [ ] `events` query returns only the current user's events.
- [ ] Another user cannot read or mutate an event they do not own.
- [ ] Updating and deleting an event works and is owner-scoped.
- [ ] When no `rsvp_deadline_at` is set, the effective deadline returned by the API is `starts_at − 30 days`.
- [ ] Strict TS + lint pass; E2E tests cover the CRUD happy paths and the cross-user authorisation rejection.

---

## Phase 4: Google Places location picker

**User stories**: 12

### What to build

Replace the plain-text address with a real map-backed picker.

- Schema migration adds `place_id`, `formatted_address`, `latitude`, `longitude` to `Event` and removes (or deprecates) `address_text`.
- `createEvent` / `updateEvent` accept a place object instead of a string.
- Create/edit page integrates Google Places Autocomplete with a small map preview.
- Document Google Cloud setup (enable Places API, restricted key, env-var wiring) in the README.

### Acceptance criteria

- [ ] Host can search a venue and select it from a Places dropdown.
- [ ] On select, the map preview re-centres to the chosen location.
- [ ] Selected `place_id`, formatted address, and lat/lng are persisted.
- [ ] Editing an event lets the host change the location and re-pick.
- [ ] README documents the Google Cloud + API key setup steps.
- [ ] E2E test covers create + update with mocked Places data.

---

## Phase 5: Event extras

**User stories**: 15, 16, 17, 18, 19

### What to build

Round out the event with the optional content blocks.

- Schema additions on `Event`: `dress_code` (text), `gift_registry_url` (text), `schedule` (structured array of `{time, title, description}` items), `custom_sections` (array of `{heading, body_richtext}`), `cover_image_url`.
- Cover image upload flow (storage adapter — local disk in dev, configurable for prod).
- UI on the event create/edit page for adding/removing schedule items, custom sections, dress code, registry URL, and cover image.
- These fields surface on the `event(id)` query and the (later) public invite page.

### Acceptance criteria

- [ ] Host can add/edit dress code, gift registry URL, schedule items, and any number of custom sections.
- [ ] Host can upload a cover image; the URL is stored and the image renders on the event page.
- [ ] All extras round-trip through the API (saved → reloaded with same content).
- [ ] E2E test covers persisting and reloading each extra.

---

## Phase 6: Invitee CRUD (manual) + couple invite + unique URL token

**User stories**: 31, 32, 33, 34, 35, 36

### What to build

Manual invitee management end-to-end, including the deep `InviteTokenGenerator` module — before Excel import is layered on top.

- `Invitee` entity and migration: `event_id`, `invite_token` (unique, 10-char base62), `primary_first_name`, `primary_last_name`, `partner_first_name` (nullable), `partner_last_name` (nullable), `email` (nullable), `mobile_no` (nullable), `created_at`. Indexes on `event_id` and `invite_token`.
- `InviteTokenGenerator` (domain): takes an RNG dependency, returns 10-char base62 tokens; retries on the (vanishingly rare) collision.
- `InviteeContactPolicy` (domain): validates row data; emits `ok` / `warning(missing_email|missing_phone)` / `error(invalid_format)`.
- Mutations: `addInvitee`, `updateInvitee`, `deleteInvitee` — owner-scoped via the event.
- Query: `eventInvitees(eventId)` — owner-scoped.
- UI on `/dashboard/events/[id]/invitees`: list invitees, add a single invitee form (with "this is a couple invite" toggle revealing partner fields), edit/delete actions, copy-to-clipboard for each invitee's unique URL.

### Acceptance criteria

- [ ] Host can add an individual invitee with first/last + optional email/phone.
- [ ] Host can add a couple invite with partner fields; a single token is generated.
- [ ] Each invitee has a unique 10-char URL-safe token persisted at creation.
- [ ] Host can copy the invite URL `/invite/[token]` to the clipboard.
- [ ] Host can edit and delete invitees.
- [ ] Invalid contact formats are rejected; missing optional contacts produce a soft warning surfaced in the UI but are saved.
- [ ] Another user cannot read or mutate invitees on an event they do not own.
- [ ] E2E tests cover CRUD, couple invite, token uniqueness, and cross-user authorisation.

---

## Phase 7: Excel import (preview + commit)

**User stories**: 24, 25, 26, 27, 28, 29, 30

### What to build

Two-phase upload flow with the warnings UX from the PRD.

- `ExcelInviteeParser` (infrastructure): given an `.xlsx` buffer, returns a structured list of rows annotated with `ok` / `warning(missing_email|missing_phone|duplicate)` / `error(invalid_format)` — no persistence.
- `InviteeImportService` (application): orchestrates preview and commit. Preview returns annotated rows + a preview identifier (e.g. a UUID keyed to the cached parse). Commit consumes the preview ID and persists the eligible rows.
- Mutations: `previewInviteeImport(eventId, fileUpload)`, `commitInviteeImport(eventId, previewId, rowsToSkip)`.
- UI on the invitees page: drag-drop `.xlsx`, render preview table with per-row status badges and warning reasons, host can deselect specific rows, confirm/cancel.
- File size and MIME-type validation. Errors row-by-row never block the whole upload.

### Acceptance criteria

- [ ] Uploading a clean file produces a preview with all rows marked `ok`.
- [ ] Uploading a file with missing emails/phones produces warnings, not errors; rows still importable.
- [ ] Uploading a file with rows duplicating existing invitees flags those rows; host can skip them.
- [ ] Uploading a file with malformed rows marks them as errors and excludes them from commit.
- [ ] Committing the preview persists the eligible rows; each gets a unique token.
- [ ] Cancelling at preview does not write anything to the database.
- [ ] E2E tests cover the happy path, every warning variant, and the malformed-row exclusion.

---

## Phase 8: Public invite page (read-only)

**User stories**: 38, 39, 40, 41, 53

### What to build

Invitees can open their unique link and view the full event page — no RSVP yet (that lands in Phase 9).

- Public query `invite(token)` returns the event + invitee details for a valid token; no auth required.
- Page `/invite/[token]` renders title, description, start/end, address with a "open in maps" link (using the Phase 4 place data), all extras from Phase 5 (dress code, registry, schedule, custom sections, cover image).
- For couple invites, both names are shown.
- Invalid tokens render a friendly "invite not found" state.

### Acceptance criteria

- [ ] Opening a valid invite URL with no session loads the event page.
- [ ] All event fields and extras render correctly.
- [ ] A "navigate" link opens Google/Apple Maps centred on the event location.
- [ ] Opening an invalid token shows the not-found state without leaking whether the token "used to" exist.
- [ ] Re-opening the same URL later still works.
- [ ] E2E tests cover valid + invalid token rendering.

---

## Phase 9: RSVP submission

**User stories**: 42, 43, 44, 45, 46, 47, 48, 49, 50, 51

### What to build

The complete RSVP flow, including the deep `RsvpStateMachine`.

- `Rsvp` entity and migration: `invitee_id` (unique), `status` (`pending` / `accepted` / `declined` / `maybe`), `dietary_restrictions` (text), `song_requests` (text), `accommodation_needed` (bool), `updated_at`. Defaults to `pending` on invitee creation.
- `RsvpStateMachine` (domain): pure transitions; rejects submissions after the effective deadline; accepts all transitions before the deadline; couple-mode invariant (single status for the pair).
- Mutation `submitRsvp(token, input)` — public (no auth, scoped by token). Accepts status + extras + (optional) partner-name corrections for couple invites.
- UI on `/invite/[token]`: RSVP form with Accept / Decline / Maybe radios, dietary + song + accommodation fields, partner-name confirmation for couples, current state pre-populated when re-opening, change allowed before deadline, "RSVP closed" message after.
- Submission rate-limiting per token.

### Acceptance criteria

- [ ] Invitee can submit Accept / Decline / Maybe.
- [ ] Extras (dietary, song, accommodation) persist when provided.
- [ ] Couple invitee can confirm/correct partner names on submission.
- [ ] Returning to the invite after submission shows the prior answer and allows changing it.
- [ ] After the effective deadline, the page renders "RSVP closed" and the mutation rejects new submissions.
- [ ] Rate-limit prevents excessive submissions per token.
- [ ] E2E tests cover each status, the extras, couple flow, change-before-deadline, and reject-after-deadline.

---

## Phase 10: Host RSVP dashboard + export

**User stories**: 54, 55, 56, 57, 58, 59, 60

### What to build

Host view of their guest list and stats, plus an export.

- `DashboardQueryService` (application): produces stats (total / accepted / declined / maybe / pending) and a filterable, searchable, sortable invitee list with RSVP status and extras.
- Queries: `eventDashboardStats(eventId)`, `eventInvitees(eventId, filter, search, sort)`, `exportInvitees(eventId)` (returns a downloadable CSV/Excel).
- UI on `/dashboard/events/[id]`: stats tiles, an invitee table with column sort, status filter, name search, click-through to invitee detail (RSVP status + dietary + song + accommodation + partner name).
- "Export" button triggers the export download.

### Acceptance criteria

- [ ] Stats tiles reflect the real RSVP counts.
- [ ] Filtering by status narrows the list to that status only.
- [ ] Searching by name returns matching invitees only.
- [ ] Sorting on columns works for at least name and status.
- [ ] Invitee detail shows all RSVP fields.
- [ ] Export download contains the expected rows and columns.
- [ ] E2E tests cover stats accuracy, filter/search, and export content.

---

## Phase 11: PDF invite

**User stories**: 37, 52

### What to build

The polished PDF deliverable: hosts can preview, invitees can download.

- `InvitePdfRenderer` (infrastructure): given an event + invitee, returns a PDF buffer using a single designed wedding template built with `@react-pdf/renderer`.
- Endpoint `/invite/[token]/pdf` streams the PDF for the invitee; no auth required.
- Host dashboard adds "preview PDF" / "download PDF" per invitee.
- Template includes: cover, event title, names (primary + partner if any), date/time, location, key extras.

### Acceptance criteria

- [ ] Visiting `/invite/[token]/pdf` returns a valid PDF for a valid token.
- [ ] Invalid tokens return 404.
- [ ] PDF includes the names, date, location, and configured extras.
- [ ] Host can preview/download any invitee's PDF from the dashboard.
- [ ] PDF generation runs on the Netlify function size/time budget.
- [ ] E2E test asserts the public endpoint returns a non-empty `application/pdf` response for a valid token and 404 for an invalid one.
