# CoachForge

CoachForge is a Phase 1 single-trainer coaching workspace for assigning guided programs, unlocking modules manually, and making client progress visible. It includes a public marketing page, role-aware Google OAuth, SQL-backed persistence, a client course view, and a trainer command center.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Express + tRPC 11
- Drizzle ORM + MySQL/TiDB
- Google OAuth for authentication
- Supabase Storage for file uploads
- Vitest for server tests

## Run locally

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in every value (database, `JWT_SECRET`, Google OAuth client ID/secret, Supabase URL/service role key). See the comments in that file for where to get each one.
3. Start the development server with `pnpm dev`.
4. Open the public marketing page at `/`.
5. Open `/demo` to review the seeded end-to-end Phase 1 flow without signing in. The demo creates one trainer, one client, one course, four modules, course access, and module progress in SQL when the snapshot is first requested.
6. Open `/workspace` to enter the real OAuth-backed workspace. Trainer access is based on the existing `admin` role; regular authenticated users are treated as clients.

Useful commands:

```bash
pnpm check
pnpm test
pnpm build
pnpm drizzle-kit generate
```

## New feature routes

The private tools route is `/tools`. Trainers can use it to create draft courses with a first module, generate invite tokens, and review recent client check-ins and logs from the Feedback queue. Trainers can edit notes and reply in lightweight feedback threads. Clients can use it to log workouts, weight, meals, and weekly check-ins; the client view now includes date-range filters, lightweight weight and workout trend charts with exact-value hover tooltips, an activity calendar, and in-app notifications when trainer feedback is posted. Invite redemption lives at `/invite?token=...`; the token is created by the trainer invite flow and can be passed to an email provider for delivery.

## Phase 1 acceptance flow

The seeded demo supports the approved milestone path:

1. Switch to **Trainer view** and review the seeded client roster, intake acknowledgement, and course progress.
2. Manually unlock the next locked module.
3. Switch to **Client view** and see the newly unlocked content.
4. Mark the unlocked module complete.
5. Switch back to **Trainer view** and confirm the completion state is visible.

The client onboarding disclaimer is shown in the demo client view when the stored acknowledgement is absent. The product language makes clear that the trainer has full access to client information. The schema stores goals, starting weight, and an optional labs note in the client profile; later lab workflows are not implemented.

## Product scope

Included: trainer login, client login, role-aware access, public marketing content, trainer branding, package overview, testimonials/proof, contact/request-access CTA, client invite creation and redemption, intake profile fields, disclaimer acknowledgement, client roster, course access, module locking, manual unlocks, client completion, trainer progress visibility, course/module draft creation, pause/cancel status procedure, workout logs, weight entries, food logs, weekly check-ins, date-filtered weight/workout trend charts with tooltips, activity calendar, client notifications, editable trainer feedback, threaded feedback replies, and demo seed data.

Payments and checkout are intentionally not implemented. Access is granted by the trainer.

## Assumptions

- One trainer is represented by the existing `admin` role. The application does not implement multi-trainer organizations or marketplace behavior.
- The preview demo uses deterministic `demo-trainer` and `demo-client` records and is intentionally public for review convenience; production operations should be authenticated and the demo route should be disabled or protected before a public launch.
- Invite creation persists an invite token. Email delivery and invite redemption UI are represented by the procedure and are intentionally kept light in Phase 1.
- Course attachments are represented by module content URLs. A future file-storage pass can add PDF/file uploads without storing bytes in SQL.
- Basic report export and richer settings UI are deferred because they are not required for the milestone acceptance path.
- The disclaimer is acknowledgement-only; it is not legal advice or a substitute for the trainer's final privacy and consent language.

## No secrets

No `.env` files or credentials are committed. Copy `.env.example` to `.env` and provide your own values for every deployment.
