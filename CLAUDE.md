# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SNCMT: a multi-tenant school & college management SaaS (Bangladesh; Bangla and English). Three apps in one repo:

- `server/`: Express 5 + Prisma 7 (PostgreSQL) API, TypeScript, ESM.
- `client/`: Next.js 15 (App Router) website: the marketing site, the platform admin and every school's site.
- `mobile/`: Flutter Android app for guardians/students and teachers only. School admins use the website.

## Commands

Server (`cd server`):

- `npm run dev`: starts a local Redis (`scripts/dev-redis.mjs`) and the API (`tsx watch src/server.ts`) on :5000.
- `npm run typecheck`: `tsc --noEmit`. This is the server's only static check. There is no linter and no test suite.
- `npm run build`: `prisma generate` + an esbuild bundle to `dist/server.js`.
- `npm run db:deploy` / `db:status` / `db:seed`: apply migrations, check them, seed. The seed loads modules, packages, permissions and the platform admin.
- `npx prisma generate`: run it after any schema change. The client is generated into `server/generated/prisma` (gitignored) and imported from `lib/prisma.ts`.
- New migration: `npx prisma migrate dev --name <name>` against a **local** database only. Never run `migrate dev` against the hosted DB; apply migrations there with `db:deploy`. `prisma.config.ts` uses `DIRECT_URL` (falling back to `DATABASE_URL`) for migrations.

Client (`cd client`): `npm run dev` (:3000), `npm run build`, `npm run lint` (ESLint). There are no tests.

Mobile (`cd mobile`): `flutter analyze`, `flutter test`, and `flutter test test/family_test.dart` for a single file. CI runs both. To run against the local API: `adb reverse tcp:5000 tcp:5000` (repeat after every reconnect or install), then `flutter run --dart-define=API_ORIGIN=http://localhost:5000`. Strings live in `lib/l10n/app_en.arb` and `app_bn.arb`; `flutter gen-l10n` regenerates them.

Whole stack: `docker compose up -d --build` (web, api, redis); migrations: `docker compose run --rm migrate`. Root `.env` holds the domain and port settings; API secrets go in `server/.env`.

Android release: GitHub Actions → "Build Android APK" (manual dispatch). It publishes to the public repo `sncmt/sncmt-app`. The version name comes from `mobile/pubspec.yaml` and the build number is the run number. Details are in `mobile/store/README.md`.

## Architecture

### Tenancy is by hostname

- `sncmt.com` / `localhost:3000`: the marketing site.
- `admin.<domain>`: the platform admin.
- `<code>.<domain>`: one school. In development that is `abc.localhost:3000`.

`server/src/app/utils/domain.ts` and `client/lib/tenant.ts` mirror each other; keep them in sync.

- `client/middleware.ts` rewrites each host to an internal folder: `app/(marketing)`, `app/platform/*` or `app/school/*`. Those folders are never reachable by their own URL. The middleware's session check is only a fast redirect based on a readable flag cookie; real authorization happens on the server.
- The browser always calls `/api/v1` on the page's own host. Next (`next.config.ts` rewrites) proxies it to Express. There is **no CORS**. Instead, `verifyOrigin` blocks cross-site writes, and Express reads the school from `req.hostname` (with `trust proxy`, so via X-Forwarded-Host). Cookies are host-only.
- The mobile app calls `https://<code>.sncmt.com/api/v1` through the same proxy. Locally it calls Express directly with the Host header set to `<code>.localhost`.

### Auth

- There are two session types:
  - `PLATFORM`: an APP_ADMIN user.
  - `SCHOOL`: a member of one school.
- Each session type has its own cookies.
- `authenticate("SCHOOL")` in `server/src/app/middlewares/auth.ts` checks that the token's school matches the hostname's school.
- A platform admin can act inside a school with a platform session plus the `X-School-Id` header (TENANT_ADMIN mode); `memberOnly` routes forbid this.
- Mobile clients send `X-Client: mobile`. Login and refresh then return `data.tokens` in the body instead of setting cookies, and later calls use `Authorization: Bearer`. A Bearer request is always a school session and never mixes with cookies. A 409 on refresh means a parallel refresh race.
- Password changes and logout-all set `User.tokensValidAfter`, which revokes older access tokens.

### Academic year tracks (school / college)

- `School.institutionType` (set by the platform admin): `SCHOOL`, `COLLEGE` or `SCHOOL_AND_COLLEGE`. The last one runs two year lines side by side (school Jan–Dec, college Jun–May).
- Every `SchoolClass` and `AcademicYear` has a `track` (`SCHOOL` | `COLLEGE`). A class is taught only in years of its own track. Each track has its own current year. Years overlap only across tracks, never within one.
- Never query `academicYear.findFirst({ isCurrent: true })` directly. Use `server/src/app/shared/academicYears.ts`:
  - `requireYear` / `findYear`: the given year, else the current year of the class's track or of the asked `track`;
  - `currentYears` and `yearsCovering(date)`: one year per track;
  - `assertClassesInTrack`: call it on every write that stores both a year and a class.
- List endpoints accept `?track=`. With no year and no track, they cover every track's current year.
- Promotion stays inside a track: the highest class of each track graduates.
- Client: `useTrack()` / `useInstitutionTracks()` (`lib/school/tracks.ts`), `<TrackSwitch>` and `useYearLabel()` (`components/school/years/TrackSwitch.tsx`), `yearsOfTrack` / `currentYearOf` / `classesOfTrack`. Ordinary schools never see a switch.

### Who takes which subject

- `ClassSubject.type` is per class, group and year:
  - `COMPULSORY`: everyone in the class or group takes it;
  - `OPTIONAL`: a fixed 4th subject;
  - `ELECTIVE`: "main or 4th", e.g. Biology / Higher Math.
- `ElectiveRule` sets how many electives a class or group takes as main (default 1). The rest join the student's 4th list.
- A student's picks: `StudentMainSubject` holds the mains, `StudentOptionalSubject` the 4th.
- Decide who sits, learns or is marked in a subject with `takesSubject` / `isFourthFor` in `server/src/app/shared/subjectChoice.ts`. Never `type === "OPTIONAL"`.
- In results, `isOptional` is per student: the same subject can be one student's main and another's 4th.

### Exams per class: names and the final exam

- There is no separate final result. Each class marks one exam of the year as final (`ExamClass.isFinal`). That exam's published result is the year's result, and promotion reads it.
- Setting the flag moves it from the class's other exam of that year (`setFinal` in `exam.service.ts`), so there is at most one per class.
- An exam can have its own name in one class (`ExamClass.nameEn/nameBn`, e.g. "Test exam" in class 10). Wherever one class is shown, take the name from `classExamName` / `classExam` in `modules/exam/examName.ts` (on the client, `classExamName` in `lib/school/exams.ts`). Pages that span several classes (seat plans, invigilator duties) keep the exam's own name.

### Permissions and paid modules

- Permission codes (e.g. `attendance:mark`, `homework:manage`) belong to **modules**, and schools get modules through subscription packages (`prisma/seeds/data/*.data.ts`).
- `checkPermission` in `middlewares/authorize.ts` requires two things:
  - the module is enabled for the school (this applies to the school super admin too);
  - the user's role grants the code (`SCHOOL_SUPER_ADMIN` grants every code).
- Some rules live inside services instead. For example, subject teachers act on their own subjects and sections without a permission (see the homework service).
- On the client, `hasPermission(me, code)` (`client/lib/auth/permissions.ts`) only hides UI.

### Server layout

- `src/app/modules/<feature>/` uses the pattern `*.route.ts` → `*.controller.ts` → `*.service.ts`, plus `*.validation.ts` (Zod 4).
  - Routes compose `authenticate`, `authorize`/permission checks, `validateRequest({ params, query, body })` and the controller.
  - Controllers wrap handlers in `catchAsync` and reply with `sendResponse` (`{ success, message, meta, data }`).
  - Errors are thrown as `AppError(message, status)` and formatted by `globalErrorHandler`. Validation failures come back as 400 with `errors[{ path, message }]`.
- All routes are mounted in `src/app/routes/index.ts`.
- Family (guardian) endpoints live under `/family` but reuse other modules' handlers. Modules export them, e.g. `familyHomeworkRoute`.
- Two route groups are mounted in `app.ts` **before** the JSON parser and the origin check:
  - `/iclock`: ADMS attendance devices, plain text, no login.
  - `/api/v1/pay/sslcommerz`: payment gateway callbacks.
- Background jobs start in `src/server.ts`: notification reminders, the SMS worker, attendance-device jobs and online-payment reconciliation. All of them stop on SIGTERM/SIGINT.
- Redis is used only for rate limiting.
- Files go to S3-compatible storage (Cloudflare R2, `shared/storage.ts`); images are processed with `sharp`.
- Push uses firebase-admin. It is off unless `FIREBASE_SERVICE_ACCOUNT_PATH` points at the key in `server/certs/` (gitignored).
- The Prisma schema is split across `prisma/schema/*.prisma`, one file per domain.
- `lib/prisma.ts` uses the `pg` adapter, `ipv4first` DNS, and the optional `DATABASE_SSL_CA` for TLS to the hosted DB.

### Client layout

- `client/lib/school/<feature>.ts` holds the types and TanStack Query hooks for one server module. Each file says which server module it mirrors; keep the types in step with the server.
- All requests go through `lib/api/httpClient.ts` (axios, `/api/v1`, `withCredentials`, refresh-on-401, digits normalised to ASCII).
- Error helpers live in `lib/api/errors.ts`: `getErrorMessage` and `getFieldErrors` (which maps server validation errors onto form fields).
- Form schemas are Zod, in `client/zod/`.
- UI is shadcn/Radix (`components/ui`) + Tailwind 4. Feature components live in `components/school/*` and `components/platform/*`.
- i18n uses next-intl with `messages/en.json` and `bn.json`.
  - `en.json` is the source of truth for the types, so a missing key is a type error and both files must have the same keys.
  - The default locale is `bn`. A school's site defaults to the school's own `language`.
- Dates are Bangladesh calendar days, as `"YYYY-MM-DD"` strings.

### Mobile layout

Riverpod 3 + go_router + dio. `lib/core/` holds the API client, token storage, push, theme and the update check. `lib/features/<area>/` pairs a data file (API calls and models) with its `*_screens.dart`. Online fee payment opens SSLCommerz in a WebView. The in-app "Update available" banner reads the GitHub releases of `sncmt/sncmt-app`.
