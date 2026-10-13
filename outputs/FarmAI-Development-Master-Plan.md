# FarmAI Development Master Plan

**Audit date:** 12 October 2026  
**Scope audited:** production site `farmai-mvp.vercel.app`, local `main` at `9dcaeb7`, and the current Node test suite.

## Executive decision

FarmAI is a functioning **AI-guidance MVP**, not yet a farm operating system. The right next release is a focused "Farmer Foundation" release: authenticated farmer accounts, durable farm records, and a single farm dashboard. Build the five priority modules on that shared foundation rather than adding them as separate pages backed only by browser storage.

Do **not** describe My Farm, Crop Doctor, Farm Weather, Crop Diary, or Smart Reminders as already available. They are proposed modules. Existing photo analysis is a useful starting point for Crop Doctor, but it does not save a diagnosis, track a case, use a farm record, or provide weather-aware recommendations.

## Audit summary

| Area | Status | Evidence / limitation |
|---|---|---|
| Production app loads | Verified | Home page loaded; language controls, sector cards, and Photo Check entry are visible. |
| Agriculture crop setup | Verified UI flow | Agriculture opens crop selection (Rice, Cotton, Maize, Groundnut, Other) and requires a crop before continuing. |
| Photo Check UI | Verified UI flow | Photo Check opens upload/camera controls, optional question, Clear, and Send. No image or AI request was submitted during the audit, so live inference is not claimed as verified. |
| Sector chat | Implemented, inference unverified | Browser code posts to `/api/chat`; server calls Gemini with text/image context. A live request was intentionally not sent because it would consume the deployed project's quota. |
| Telugu, English, Hindi selection | Implemented UI | All three controls are present; language choice is stored in browser storage. Full output-quality testing remains required. |
| Fisheries and Livestock | Implemented as guided chat intake | Current code collects fish/animal details and sends them to the same AI endpoint. README is stale: it says Livestock is next release, while code and production UI expose it. |
| Conversation and profile persistence | Partial / device-only | History and farm inputs use `localStorage`; no login, server database, sharing, multi-device recovery, or deletion controls. |
| PWA/offline shell | Partial | A manifest and cache worker exist, but current app code unregisters service workers on load. AI chat cannot work offline. |
| Automated tests | Insufficient | `npm test` passes 2 API guard tests only (empty input and missing key). There are no UI, storage, accessibility, security, provider-mock, or end-to-end tests. |
| Security and abuse protection | Blocking before broad pilot | The public AI endpoint has no authentication, rate limit, request logging/redaction policy, or server-side user ownership checks. |

## Current technical baseline

* Client: single-page vanilla HTML/CSS/JavaScript in `public/`.
* Server: Node HTTP server locally; Vercel function-style `api/chat.js` in deployment.
* AI: Gemini multimodal request with a fallback model and careful crop/animal safety instructions.
* Data: browser `localStorage` only.
* Delivery: Vercel deployment; PWA manifest/service-worker files present.

### Architecture risks to resolve first

1. `public/app.js` is about 2,291 lines with repeated localization/flow code. Break it into feature modules before adding product logic.
2. Browser-only data is not a farmer record system and can disappear when browser data is cleared or a phone changes.
3. The AI endpoint can be exhausted or abused because it is public and unauthenticated.
4. The image upload limit is client/server size based, but there is no image retention/deletion policy or malware/abuse strategy.
5. The service worker is explicitly unregistered by client code; decide whether offline installability is actually in scope and test it intentionally.

## Product foundation — Release 0 (must precede priority features)

| Work item | Change needed | Technology | Priority | Acceptance criteria |
|---|---|---|---|---|
| Product structure | Split monolithic client into `home`, `onboarding`, `chat`, `photo-check`, `farm`, and shared UI modules; preserve the current working flow with regression tests. | Vite + React/TypeScript is recommended for scale; staying vanilla is acceptable only with ES modules and tests. | P0 | Existing home, sector intake, language controls, photo selection, Clear, and chat all work after refactor. |
| Accounts and ownership | Add phone/email sign-in and row-level ownership to all farmer data. Keep guest mode optional but clearly labelled as device-only. | Supabase Auth + Postgres + Row Level Security. | P0 | A farmer can sign in/out; one account cannot read or write another account's farm, diary, photo, or reminder records. |
| Core data model | Create Farmer, Farm, Field, CropCycle, DiaryEntry, PhotoCase, Reminder, WeatherAlert tables plus `created_at`, `updated_at`, and ownership fields. | Supabase Postgres migrations; typed data-access layer. | P0 | Create/read/update/delete works with ownership policies; schema is documented and migration is repeatable. |
| AI edge protection | Move protected calls behind authenticated server endpoints; add per-user/IP quotas, image validation, error tracking, and minimal audit events. | Vercel Functions/Edge Middleware or Supabase Edge Functions; Upstash Redis rate limiting; Sentry. | P0 | Anonymous abusive traffic is throttled; a normal signed-in farmer has clear retry feedback; no API key reaches the browser. |
| Consent and privacy | Add clear consent before saving farm location/photos and a simple "delete my farm data" workflow. | App UI + database deletion job + privacy policy. | P0 | A farmer can see what is saved, delete a photo/case, and delete all account data; no precise location is shared by default. |
| Quality gate | Add unit, component, API and browser tests; define an error-report dashboard. | Vitest, Playwright, GitHub Actions. | P0 | CI runs on every pull request; key onboarding and chat routes pass on mobile-sized viewport. |

## Priority feature plan

### 1. My Farm — first user-facing module

**Status:** Not implemented. Current crop stage, land area, and location forms are temporary chat context stored locally; they are not saved farms or fields.

| Change needed | Technology | Priority | Acceptance criteria |
|---|---|---|---|
| Farm onboarding: farmer name, district/mandal or optional pin, farm name, fields, area/unit, irrigation type, soil type. | Supabase forms + Postgres `farms`/`fields`; location as a district-level default, with optional precise pin later. | P1 | Farmer creates one farm and one or more fields; data persists after sign-out/in and is editable. |
| Crop cycle: field, crop, variety, sowing/transplant date, expected harvest. | `crop_cycles` table; crop catalog seeded for AP/Telangana first. | P1 | One field supports historical and current crop cycles; dashboard shows current crop and days since sowing. |
| Farm dashboard: field cards, next actions, weather status, open Crop Doctor cases, recent diary entries. | Responsive component UI + aggregate API query. | P1 | Empty state guides setup; populated dashboard loads within a practical mobile target and displays only owned data. |

### 2. Crop Doctor — build from Photo Check

**Status:** Partial building block only. Current Photo Check can submit an image to Gemini and has safety instructions, but it has no structured case record, diagnostic confidence policy, treatment follow-up, or expert escalation.

| Change needed | Technology | Priority | Acceptance criteria |
|---|---|---|---|
| Guided case intake: choose farm/field/crop/stage; take/upload 1–3 images; symptom, onset, spread, recent input questions. | Storage bucket with private paths; `photo_cases`, `photo_case_images` tables. | P1 | Case cannot be marked ready without crop and symptom context; photos are private to owner and deletable. |
| Structured AI response: visible observations, possible causes, uncertainty, immediate low-risk action, questions, escalation trigger. | Gemini structured JSON schema; server validation; safety policy versioning. | P1 | Every result labels uncertainty; never presents a photo diagnosis as certain; unsafe dosage/mixing guidance is blocked. |
| Human follow-up flow | "Need an expert" request with anonymised summary, farmer-approved photos, and case ID. | Start with manual admin/expert queue; later integrate university/FPO partners. | P2 | Farmer can request help and see status; no case is shared until they confirm. |
| Outcome feedback | Ask after 3/7 days whether the problem improved and capture optional follow-up photo. | Scheduled in-app task/reminder; case outcome field. | P2 | Follow-up is tied to case and improves future evaluation data without changing past result text. |

### 3. Farm Weather — decision support, not just a forecast

**Status:** Not implemented.

| Change needed | Technology | Priority | Acceptance criteria |
|---|---|---|---|
| Field-level weather source using district/pin selected in My Farm. | A licensed weather API selected after coverage/cost evaluation; server-side proxy/cache. | P1 | Shows observed/current conditions and 7-day forecast with source timestamp and location label. |
| Actionable alerts for rain, heat, wind, humidity and irrigation risk; crop/stage-aware copy. | Rules engine (versioned thresholds) first; AI may explain a rule but must not invent forecast values. | P1 | Alert includes condition, time window, affected field, recommended low-risk action, and dismiss/read state. |
| Reliability controls | Cache responses, show stale data transparently, define fallback when provider is unavailable. | Scheduled fetch/cache; monitoring. | P1 | User sees last-updated time; app never shows an old forecast as current. |

### 4. Crop Diary — operational history and economics foundation

**Status:** Not implemented. Current chat history is not a crop diary and Clear deletes it from browser storage.

| Change needed | Technology | Priority | Acceptance criteria |
|---|---|---|---|
| Quick entry types: sowing, irrigation, fertilizer, plant protection, scouting, labour, expense, harvest, note/photo. | `diary_entries` table; controlled entry types; server timestamps. | P1 | Farmer adds an entry in under a minute, assigns it to farm/field/crop cycle, and can edit/delete their own entry. |
| Timeline and filters | Field/crop/date/type filters; simple monthly spend and activity summary. | Indexed Postgres queries + mobile timeline UI. | P1 | Timeline is chronologically correct, filterable, and does not mix fields/crop cycles. |
| Cost capture | Amount, quantity, unit, vendor optional; categories mapped to input/labour/irrigation/other. | Currency-safe numeric fields; reporting query. | P2 | Farmer sees total cost by crop cycle; totals match entries and remain editable. |

### 5. Smart Reminders — start in-app, then notifications

**Status:** Not implemented. There is no reminder record, schedule, notification permission workflow, or background job.

| Change needed | Technology | Priority | Acceptance criteria |
|---|---|---|---|
| Reminder engine: one-time and recurring reminders tied to farm, field, crop cycle or Crop Doctor case. | `reminders` table + scheduled server job/cron. | P2 | Create, snooze, complete, and cancel a reminder; actions survive device changes. |
| In-app task list | Dashboard "Today" and "Upcoming" views before relying on device notifications. | App UI + due-date query. | P2 | Due tasks appear in correct local timezone and completion is recorded. |
| Push/SMS pilot | Add only with explicit opt-in, consent logging, delivery monitoring, and fallback. | Web Push first; SMS only after cost and language review. | P3 | No notification is sent without permission; user can opt out; delivery failures are visible internally. |

## Delivery sequence

| Milestone | Scope | Exit gate |
|---|---|---|
| M0 — Stabilise (1–2 weeks) | Refactor boundaries, database/auth setup, security controls, CI, telemetry. | Existing chat/photo flows regress-tested; no public unthrottled AI endpoint. |
| M1 — Farmer Foundation (2–3 weeks) | My Farm onboarding, fields, crop cycles, dashboard skeleton. | 10 internal test users retain farm data across devices. |
| M2 — Crop Doctor (2–3 weeks) | Structured private cases, safe result contract, photo lifecycle, feedback. | Curated test set reviewed by an agriculture advisor; zero certain-diagnosis claims. |
| M3 — Weather + Diary (2–3 weeks) | Cached weather, crop-aware alerts, diary and costs. | Forecast freshness and diary totals validated in pilot. |
| M4 — Reminders + pilot hardening (2 weeks) | In-app reminders, opt-in notification pilot, analytics, support workflow. | 50–100 farmer pilot with consent, feedback loop, incident process. |

Timelines are planning estimates, not commitments; validate with the team after choosing the weather provider and authentication path.

## Definition of done for every feature

1. Telugu and English UI copy is reviewed; Hindi remains available only where it is equally tested.
2. Mobile experience is tested on a low-end Android-sized viewport and intermittent network.
3. Ownership and deletion behavior is covered by automated tests.
4. Server/API errors are actionable, translated where practical, and do not leak secrets.
5. Analytics collects only agreed product events, not raw prompts/photos by default.
6. Agriculture advice uses explicit uncertainty, safe escalation, and no unverified chemical dosage.

## Immediate next build ticket

**Build M0 + My Farm foundation:** introduce authentication, database migrations, owner-scoped Farm/Field/CropCycle tables, and a mobile My Farm onboarding/dashboard. Keep the present chat and Photo Check available as "Ask FarmAI" tools, but pass the selected field/crop context from the saved profile.

This is the smallest coherent step that makes every later priority feature durable and trustworthy.
