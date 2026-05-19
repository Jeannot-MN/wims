# PRD — WIMS (Wedding Invite Management System) MVP

## Problem Statement

Couples planning weddings (and, more broadly, anyone hosting a private event) struggle to control who shows up. Paper invites are easy to forward or fake, "RSVP by replying to this WhatsApp" produces a chaotic ledger across messaging threads, dietary and logistical preferences get lost, and the host has no reliable single source of truth for who is coming, who is bringing whom, and what each person needs. As the event approaches, the host is forced to chase responses manually and faces the real risk of uninvited guests turning up because someone forwarded the details.

What the host wants is simple: a way to assemble their guest list once, hand each guest a personal way to RSVP, and watch a dashboard fill up with reliable answers — without anyone gate-crashing.

## Solution

WIMS is a web application where a host signs up, creates an event (a wedding, in the MVP), and uploads their invitee list from a spreadsheet. The system generates a unique, unguessable URL for every invitee. The host shares these URLs themselves — by WhatsApp, email, or any channel they like — and each invitee lands on a beautifully presented event page where they can RSVP (Accept / Decline / Maybe), provide dietary preferences and other extras, and download a designed PDF invitation. Behind the scenes, the host watches a live RSVP dashboard with stats, search, and export.

The system is built so that future event types, co-host accounts, system-sent emails/SMS, and protected invite tokens can be added without architectural rework.

## User Stories

### Account & Authentication

1. As a host, I want to sign up with my email and a password, so that I can start creating events.
2. As a host, I want to verify my email after signup, so that the system can confirm I own the address.
3. As a host, I want to log in with my email and password, so that I can access my events.
4. As a host, I want to be automatically logged out after 7 days, so that an unattended session does not stay open forever.
5. As a host, I want to request a password reset by email, so that I can regain access if I forget my password.
6. As a host, I want to set a new password from a one-time reset link, so that I can recover my account without contacting support.
7. As a host, I want my password to be stored using a modern hashing algorithm, so that a database leak does not expose my credentials.

### Event Management

8. As a host, I want to create a new event of type "Wedding", so that I have a container for everything related to that wedding.
9. As a host, I want to give my event a title and a rich-text description, so that I can convey the tone and story of the event.
10. As a host, I want to set the start date and time of my event, so that invitees know when to attend.
11. As a host, I want to optionally set an end date and time, so that multi-session events (ceremony + reception) are accurately represented.
12. As a host, I want to pick the event location from Google Maps, so that the address is accurate and invitees can navigate to it.
13. As a host, I want to set an RSVP deadline (defaulting to 30 days before the event), so that I can finalise numbers in time for the venue.
14. As a host, I want to configure the RSVP deadline to a different date, so that I can adapt to my venue's specific cut-off.
15. As a host, I want to add a dress code section to my event, so that guests know what to wear.
16. As a host, I want to add a gift registry URL, so that guests know how to give a gift.
17. As a host, I want to add a schedule/timeline section, so that guests know the running order of the day.
18. As a host, I want to add free-form sections (Accommodation, Travel, FAQ, etc.), so that I can convey any extra information specific to my event.
19. As a host, I want to upload a cover image for my event, so that the invitation has a personal feel.
20. As a host, I want to edit any of these event details later, so that I can correct mistakes or update plans.
21. As a host, I want to delete an event, so that I can remove drafts or cancelled events.
22. As a host, I want to see a list of all my events, so that I can manage multiple weddings in parallel.
23. As a host, I want to create multiple events under one account, so that I can plan more than one event over time.

### Invitee Management

24. As a host, I want to upload an Excel (.xlsx) file containing my invitee list, so that I do not have to type each invitee in by hand.
25. As a host, I want the system to expect the columns `first_name`, `last_name`, `mobile_no`, `email`, so that there is a clear contract for my spreadsheet.
26. As a host, I want to see a preview of parsed rows before they are imported, so that I can spot mistakes before they go live.
27. As a host, I want to see warnings on rows that are missing `email` or `mobile_no`, so that I can decide whether to proceed with incomplete contact info.
28. As a host, I want to see warnings on rows that duplicate an existing invitee, so that I do not accidentally invite the same person twice.
29. As a host, I want to see warnings on rows with invalid email or phone formats, so that I can fix the file before importing.
30. As a host, I want to confirm or cancel the import after reviewing warnings, so that nothing is committed without my approval.
31. As a host, I want to add an invitee manually (without uploading a file), so that I can handle late additions.
32. As a host, I want to edit an existing invitee's details, so that I can correct typos or update contact info.
33. As a host, I want to remove an invitee, so that I can revoke an invitation if needed.
34. As a host, I want to mark an invitee as a "couple invite" with a partner's name, so that two people can share a single invitation and RSVP together.
35. As a host, I want the system to generate a unique, unguessable URL for each invitee, so that the link cannot be shared with people I did not invite.
36. As a host, I want to copy an invitee's unique URL to my clipboard, so that I can share it via WhatsApp, email, or any other channel.
37. As a host, I want to download or preview the PDF invitation for any invitee, so that I can verify it looks right before sharing.

### RSVP — Invitee Experience

38. As an invitee, I want to open my unique invite URL without logging in, so that I can RSVP without creating an account.
39. As an invitee, I want to see the event title, date, time, and a rich description, so that I understand what I am invited to.
40. As an invitee, I want to see the event location on a map with a link to navigate, so that I know how to get there.
41. As an invitee, I want to see all extra sections the host added (dress code, gifts, schedule, FAQ, accommodation, travel), so that I have every piece of information I need.
42. As an invitee, I want to RSVP **Accept**, so that the host knows I will attend.
43. As an invitee, I want to RSVP **Decline**, so that the host knows I cannot attend.
44. As an invitee, I want to RSVP **Maybe**, so that I can signal uncertainty before committing.
45. As an invitee with a couple invitation, I want to RSVP for myself and my partner together, so that one submission covers both of us.
46. As an invitee with a couple invitation, I want to confirm or correct my partner's name, so that the host has accurate information.
47. As an invitee, I want to add dietary restrictions to my RSVP, so that the host can plan the menu.
48. As an invitee, I want to add song requests, so that the host can include them in the playlist.
49. As an invitee, I want to indicate whether I need accommodation, so that the host can plan logistics.
50. As an invitee, I want to change my RSVP after submitting it, so that I can update my answer if my circumstances change.
51. As an invitee, I want to be told when I open the link after the RSVP deadline that responses are closed, so that I am not confused about why I cannot reply.
52. As an invitee, I want to download a beautifully designed PDF invitation, so that I can keep or print it.
53. As an invitee, I want to re-open my invite URL later to check details, so that I can refer back to the event information.

### RSVP Dashboard — Host Experience

54. As a host, I want to see at a glance how many invitees are Accepted / Declined / Maybe / Pending, so that I know the state of my guest list.
55. As a host, I want to see the total number of invitees on my dashboard, so that I know how many invitations are out.
56. As a host, I want to view a sortable, filterable list of invitees with their RSVP status, so that I can find specific people quickly.
57. As a host, I want to search invitees by name, so that I can locate a guest in a long list.
58. As a host, I want to filter invitees by RSVP status, so that I can focus on (say) only those who have not yet responded.
59. As a host, I want to click into an invitee and see their full RSVP detail (status, dietary restrictions, song requests, accommodation, partner name), so that I have a single view of everything they have told me.
60. As a host, I want to export my RSVP responses to CSV/Excel, so that I can share them with my caterer or venue.

### Non-functional / cross-cutting

61. As a host, I want my data to be isolated from other hosts' data, so that nobody else can see my event or my guest list.
62. As a developer, I want the system to be type-checked end-to-end in TypeScript, so that breaking changes are caught at compile time.
63. As a developer, I want a clear hexagonal/layered architecture, so that domain logic can be tested in isolation from the database, GraphQL transport, and PDF/email infrastructure.
64. As a developer, I want a Docker-based local environment, so that I can run the full stack on my machine and host it anywhere later.
65. As a developer, I want the application to deploy to Netlify for free during development, so that I can iterate without paying for hosting.

## Implementation Decisions

### Stack

- **Language:** TypeScript, strict mode, across the entire codebase (web, GraphQL, domain, infrastructure).
- **Framework:** Next.js (App Router) — used for both the React UI and as the host for the GraphQL endpoint.
- **API:** GraphQL via **GraphQL Yoga**, mounted on a Next.js route handler.
- **Schema definition:** **Pothos** schema builder (chosen for first-class TypeScript inference and absence of decorators).
- **Database:** PostgreSQL. For the MVP development instance, **Neon** (free tier, built-in pooling — important for serverless deploys to Netlify).
- **ORM:** TypeORM, with migration files committed to the repo. All connections go through Neon's pooled endpoint to survive serverless cold starts.
- **Auth:** JWT issued as a **Bearer token**; access token lifetime **7 days**; **no refresh token** — the user is forced to log in again on expiry.
- **Password hashing:** **Argon2id** (via a JS/Rust binding that does not require native compilation on the deploy host, to keep Netlify compatibility).
- **PDF rendering:** **`@react-pdf/renderer`** (declarative React components → PDF; no headless Chrome required, so it works on Netlify functions).
- **Spreadsheet parsing:** **SheetJS** (`xlsx`) for `.xlsx` upload parsing.
- **Location picking:** **Google Places API** (host picks a place, the system stores the place ID, formatted address, and lat/lng).
- **Containerisation:** Docker + docker-compose for local development; deployment target is Netlify (with self-hosting via the same Docker image as a documented fallback).

### Architectural layering (hexagonal / clean)

Four layers, in strict dependency direction (outer depends on inner, never the other way around):

1. **Domain layer** — pure TypeScript, no I/O. Contains value objects, entities, and policies. Examples: `InviteTokenGenerator`, `RsvpStateMachine`, `InviteeContactPolicy`, `RsvpDeadlinePolicy`.
2. **Application layer** — use-case services that orchestrate domain logic and call ports. Examples: `AuthService`, `EventService`, `InviteeImportService`, `RsvpService`, `DashboardQueryService`, `InvitePdfService`.
3. **Infrastructure layer** — concrete adapters implementing ports. Examples: TypeORM repositories, `ExcelInviteeParser`, `PdfTemplateRenderer`, `ConsoleEmailService`, `Argon2PasswordHasher`, `JwtTokenService`.
4. **Web layer** — Next.js pages/components and GraphQL resolvers. Resolvers are thin — they only translate GraphQL input/output and delegate to application services.

### Deep modules (testable in isolation, stable interfaces)

These modules were specifically designed to encapsulate complex behaviour behind a narrow interface:

- **`InviteTokenGenerator`** — produces 10-character URL-safe unguessable tokens; takes a pluggable RNG so tests can inject deterministic randomness.
- **`RsvpStateMachine`** — pure: given an existing RSVP and an action, returns the next state or rejects. Encodes deadline rules, allowed transitions (pending → accepted/declined/maybe → any other before deadline), and couple-mode invariants.
- **`InviteeContactPolicy`** — given a row's `email` and `mobile_no`, decides if the row is valid, warns (missing optional contact), or rejects (invalid format).
- **`RsvpDeadlinePolicy`** — given an event start date and an optional configured deadline, returns the effective deadline (defaults to `event_start − 30 days`).
- **`ExcelInviteeParser`** — given an `.xlsx` file buffer, returns a structured list of parsed rows annotated with warnings (missing fields, duplicates, invalid formats) without persisting anything.
- **`InvitePdfRenderer`** — given an event + invitee, returns a PDF buffer using the wedding template.

### Couple-invite model

An invitee record has a `primary_first_name` / `primary_last_name` and optional `partner_first_name` / `partner_last_name`. The same `invite_token` covers both. The RSVP record carries a single status for the household. The partner name is editable by the invitee at RSVP time.

### Invitee import flow

A two-phase flow:

1. **Preview phase** — host uploads `.xlsx`; the file is parsed in-memory; a preview response returns all rows annotated with one of: `ok`, `warning(missing_email)`, `warning(missing_phone)`, `warning(duplicate)`, `error(invalid_format)`. Nothing is persisted.
2. **Commit phase** — host confirms with the preview's identifier; the system imports all rows that are `ok` or `warning`, skipping `error` rows.

### Email service

`EmailService` is defined as a port (interface) with methods like `sendVerificationEmail`, `sendPasswordResetEmail`. For MVP, the only implementation is `ConsoleEmailService`, which logs payloads and (optionally) writes them to a `sent_emails` audit table for dev visibility. A real provider (Resend, Postmark, etc.) can be wired in by adding a single adapter class.

### Authentication contract

- Signup: `email + password` → user created in `pending_verification` state → verification email sent → user clicks link with one-time token → user is moved to `active`.
- Login: `email + password` → if `active`, a 7-day JWT is issued. The token is returned in the GraphQL response body and the client stores it (no HTTP-only cookie for MVP, since we are using Bearer).
- Password reset: `requestReset(email)` → one-time token emailed → `resetPassword(token, newPassword)` → invalidate token.
- All authenticated GraphQL operations require an `Authorization: Bearer <jwt>` header. The GraphQL context middleware decodes the token and exposes the current user.

### Invite token

- 10 random characters drawn from a URL-safe alphabet (base62), generated from a cryptographically secure RNG.
- The token alone grants read access to the invite page and the right to RSVP — there is no further authentication for invitees in the MVP.
- The schema supports a future `protected` flag and additional verification fields without migration breakage (the token-only path remains the default).

### Authorisation

Every event and every invitee belongs to a `user_id`. All host-facing GraphQL resolvers enforce that the current user owns the event they are reading or mutating. The public invite endpoint is scoped only by `invite_token`.

### Data model (logical, not physical)

- `User` — id, email, password_hash, verified_at, created_at.
- `Event` — id, owner_user_id, title, description (rich text), starts_at, ends_at, location (place_id, formatted_address, lat, lng), rsvp_deadline_at, cover_image_url, dress_code, gift_registry_url, schedule (structured), custom_sections (array), event_type ("wedding"), created_at.
- `Invitee` — id, event_id, invite_token (unique), primary_first_name, primary_last_name, partner_first_name (nullable), partner_last_name (nullable), email (nullable), mobile_no (nullable), created_at.
- `Rsvp` — id, invitee_id (unique), status (`accepted` / `declined` / `maybe` / `pending`), dietary_restrictions (text), song_requests (text), accommodation_needed (bool), updated_at.
- `EmailVerificationToken` / `PasswordResetToken` — id, user_id, token, expires_at, used_at.
- `SentEmail` (dev-only audit) — id, to, subject, body, sent_at.

### GraphQL surface (high level)

- Queries: `me`, `events`, `event(id)`, `eventInvitees(eventId, filter, search)`, `eventDashboardStats(eventId)`, `invite(token)` (public).
- Mutations: `signup`, `verifyEmail`, `login`, `requestPasswordReset`, `resetPassword`, `createEvent`, `updateEvent`, `deleteEvent`, `previewInviteeImport`, `commitInviteeImport`, `addInvitee`, `updateInvitee`, `deleteInvitee`, `submitRsvp` (public, by token), `exportInvitees(eventId)`.

### Deployment

- Local: `docker-compose up` brings up Postgres + the Next.js app.
- Hosted dev: Netlify (Next.js adapter) + Neon Postgres (pooled connection string).
- Self-host fallback: the same Docker image runs on any container host.

## Testing Decisions

### What makes a good test

Tests must verify **externally observable behaviour**, never implementation details. A test should still pass if the internals are rewritten, as long as the contract is preserved. This means: drive tests through the GraphQL API (and through the public invite endpoint), assert on responses and on database state observable through queries — not on private methods, internal call counts, or specific class structures.

### Coverage strategy

The project is greenfield and the user explicitly asked for **end-to-end testing through the GraphQL API**, using a real (test) database. The following flows are covered:

1. **Auth flow:** signup → email verification (token captured from the audit table) → login → authenticated query → token expiry.
2. **Password reset flow:** request reset → consume reset token → log in with new password.
3. **Event CRUD:** create, edit, list, fetch single, delete; verify that another user cannot see or mutate the event.
4. **Invitee import — happy path:** upload `.xlsx`, preview, commit, verify invitees exist.
5. **Invitee import — warning path:** upload file with missing emails/phones and duplicates, verify warnings, confirm import skips errors and keeps warnings.
6. **Manual invitee CRUD:** add, edit, delete.
7. **Couple invite:** create couple invite, RSVP via the shared token, verify partner data persists.
8. **Public RSVP flow:** open invite by token, submit Accept/Decline/Maybe, submit dietary + song + accommodation fields.
9. **RSVP update before deadline:** change an existing RSVP, verify new state.
10. **RSVP after deadline:** verify the system rejects submission and shows the closed state.
11. **Dashboard query:** assert stats reflect submitted RSVPs.
12. **CSV/Excel export:** verify export includes the expected rows.
13. **PDF download:** assert the public endpoint returns a valid PDF for a given token.

### Test infrastructure

- A dedicated test Postgres schema is reset between test suites (truncate-all or transactional rollback).
- A test runner that boots the GraphQL handler in-process so tests do not need a separate HTTP server.
- The `EmailService` is replaced in tests with an in-memory implementation that captures emails for assertion (mirrors `ConsoleEmailService`).
- The `InviteTokenGenerator` accepts a seeded RNG in tests so token values are deterministic where useful.

### Prior art

None — this is a greenfield repo. The test architecture above is the prior art for everything that follows.

## Out of Scope

- **System-sent emails or SMS to invitees.** The `EmailService` port exists and is exercised for verification/reset, but invite delivery to guests is done by the host manually (URL copy/paste). A SendGrid/Twilio/Resend adapter can be added later without API changes.
- **Event types other than Wedding.** The data model carries an `event_type` field so additional types can be added later, but only Wedding is supported in the MVP.
- **Co-host / shared event accounts.** Ownership is single-user. The data model is structured so a future `event_collaborators` table can be added without breaking changes.
- **Protected invite tokens.** All tokens are open (knowing the URL is sufficient). A future `protected` flag plus a name/code challenge can be layered on.
- **Mobile apps.** Web only.
- **Payments / gift registry transactions.** Only an external registry URL is captured.
- **Photo galleries, post-event uploads, guest messaging, seat planning.**
- **Multi-language / internationalisation.**
- **Multiple or custom-uploaded PDF templates.** One designed wedding template ships in the MVP.
- **Custom domains for invite URLs.**
- **Analytics on invite opens or RSVP click-through rates.**

## Further Notes

- **Neon setup steps** will be provided separately when implementation begins (project creation, pooled vs direct connection strings, branch-per-environment, env var wiring for Netlify).
- **Google Places API** requires a Google Cloud project with the Places API enabled and a restricted API key. The setup steps will be documented before the location-picker UI is implemented.
- **Argon2id on Netlify:** ensure the chosen Argon2 package does not require native compilation in the deploy environment. A Rust-binding package (e.g. `@node-rs/argon2`) avoids the post-install compile step that breaks on Netlify.
- **TypeORM on serverless:** every Netlify function invocation is a fresh process, so the connection must go through Neon's pooler endpoint. Connection limits per function instance should be set conservatively (1–2).
- **Future extensibility hooks already in scope:** the `event_type` discriminator, the `protected` invite flag placeholder, the `EmailService` port abstraction, and the single-owner ownership column (`owner_user_id`) that can be supplemented with a collaborators table without migration of existing rows.
- **Security checklist** to keep in mind during implementation: rate-limit RSVP submissions per token; rate-limit login attempts per email/IP; never log raw JWTs or password reset tokens; ensure all host-facing resolvers enforce ownership; validate uploaded Excel files by size and MIME type; reject malformed cell content; never trust client-provided invitee IDs in RSVP submissions (the token is the only identifier).
