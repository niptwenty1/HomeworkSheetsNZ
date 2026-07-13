# HomeWorksheets — Apps Script → Next.js + Supabase migration

This repo contains the migration of the original Google Apps Script homework workflow into the Next.js app. The goal was to move generation, persistence and sending into the app and Supabase, and to run scheduled jobs on Vercel.

This README summarizes what changed, how the pieces fit together, the database schema, the server routes you can call, example requests, environment variables, and suggested cron schedules.

---

## High-level overview

- Frontend: remains the Next.js app (signup page, public pages).
- Backend / generation: server-side Claude call now lives in `app/lib/homeworkGeneration.ts` and is triggered by `POST /api/homework/generate-weekly`.
- Persistence: Supabase now stores students, curriculum, generated homework and send logs.
- Sending: emails are sent through a provider-agnostic mail layer in `app/lib/email.ts`. Gmail SMTP is the default provider, with Resend available as a switchable alternative via configuration.
- Cron: Vercel scheduled routes call the server routes to generate and send homework.
 - Resend/Retry: resends are now flagged on the `signups` row (`resend` boolean and optional `resend_date`, `resend_reason`). The resend API marks a student for resend and the processor cron reads `signups` where `resend = true`.

---

## Files of interest

- `app/lib/homeworkGeneration.ts` — builds the Claude prompt and calls the Claude API, unchanged prompt logic.
- `app/lib/supabaseHomeworkData.ts` — Supabase helpers (students, curriculum, homework rows, sent email logging, resend helpers).
- `app/lib/homeworkEmail.ts` — builds HTML email and completion signature.
- `app/lib/email.ts` — provider-agnostic mail helper that uses Gmail SMTP by default and can switch to Resend via configuration.
- `app/api/homework/generate-weekly/route.ts` — server route that triggers Claude and saves rows to Supabase.
- `app/api/cron/generate-weekly/route.ts` — cron trigger route that enqueues weekly generation tasks (one task per year level).
- `app/api/cron/generate-weekly-worker/route.ts` — worker route that processes one queued generation task.
- `app/api/cron/send-homework/route.ts` — cron route that finds today's homework and sends emails to students.
- `app/api/homework/resend/route.ts` — API to enqueue a resend request for a specific student/date.
- `app/api/cron/process-resends/route.ts` — cron route that processes pending resends.
- `db/supabase_tables.sql` — SQL schema additions: `homework_entries`, `sent_emails`, `curriculum_items` (and updated `signups`, `completions`). Note: `resend_requests` has been removed and resends are now flagged on `signups`.

---

## Supabase tables

- `signups` — students (child_name, email, year_level, difficulty_level, days, ...) now include resend fields: `resend` (boolean), `resend_date` (text), `resend_reason` (text), `resend_requested_at` (timestamptz)
- `homework_entries` — generated homework rows; columns match spreadsheet headers:
  - `date`, `day`, `maths_topic`, `maths_instructions`, `maths_questions` (array), `maths_word_problem`, `reading_title`, `reading_text`, `reading_questions` (array), `writing_type`, `writing_prompt`, `writing_word_count`, `grammar_topic`, `grammar_instruction`, `grammar_exercise`, `year_level`, `generated_at`
- `sent_emails` — records of send attempts: `email`, `name`, `year`, `date`, `status`, `provider_response`, `created_at`
- `curriculum_items` — migrated curriculum content (used by the Claude prompt)
- `claude_usage_logs` — per-run Claude token usage and status for weekly generation (`source_route`, `year_level`, `reference_date`, `input_tokens`, `output_tokens`, `total_tokens`, `status`, `error_message`)
- `homework_generation_queue` — queued weekly generation tasks (`reference_date`, `year_level`, `status`, `attempts`, `last_error`, timestamps)
- `completions` — previously existing table used when students click completion link

---

## Environment variables

Set the following in your deployment environment and in `.env` for local testing. Keep secrets secret.

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for server operations
- `MAIL_PROVIDER` — mail provider to use (`gmail` by default, or `resend`)
- `GMAIL_USER` — Gmail account used for SMTP delivery
- `GMAIL_APP_PASSWORD` — Gmail app password for SMTP auth
- `RESEND_API_KEY` — your Resend API key (required if `MAIL_PROVIDER=resend`)
- `MAILERLITE_API_KEY` — MailerLite API key used to sync each new signup as a subscriber
- `MAILERLITE_GROUP_ID` or `MAILERLITE_GROUP_IDS` — optional MailerLite group id (or comma-separated ids) used when adding subscribers
- `FROM_EMAIL` — sender email (used in the `From` field)
- `FROM_NAME` — optional display name shown in the `From` field (e.g. `Miss Mum - Home School`)
- `REPLY_TO_EMAIL` — reply-to address
- `EMAIL_NOTIFICATIONS_ENABLED` — optional channel toggle for cron summaries (`true` by default)
- `TELEGRAM_NOTIFICATIONS_ENABLED` — enable Telegram cron summaries (`false` by default)
- `TELEGRAM_SIGNUP_ALERTS_ENABLED` — enable Telegram alert on each successful signup (defaults to `TELEGRAM_NOTIFICATIONS_ENABLED`)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token from BotFather
- `TELEGRAM_CHAT_ID` — single Telegram chat/group ID for notifications
- `TELEGRAM_CHAT_IDS` — optional comma-separated list of chat/group IDs (overrides `TELEGRAM_CHAT_ID`)
- `CRON_SECRET` — secret used by cron routes to authorize Vercel scheduled calls
- `HOMEWORK_SIGNUP_SECRET` — existing secret used for protected teacher actions (also used for enqueueing resends)
- `COMPLETE_SECRET_KEY` — secret used to sign completion links (used by `app/api/register-completion/route.ts`)
- `COMPLETION_WEB_APP_URL` — base URL students are redirected to when they click the completion link
- `CLAUDE_API_KEY` (or `ANTHROPIC_API_KEY`) — Claude / Anthropic API key
- `CLAUDE_MODEL` and `CLAUDE_MAX_TOKENS` — optional model/tokens settings
- `MAX_TOKENS` — fallback token limit if `CLAUDE_MAX_TOKENS` is not set

---

## API routes & usage

All routes expect JSON where applicable and are protected with the appropriate secret (see examples).

- `POST /api/homework/generate-weekly`
  - Purpose: Generate a week's homework for a `yearLevel` and store it in Supabase.
  - Payload example:
    ```json
    { "yearLevel": "6", "referenceDate": "2026-07-04" }
    ```
  - Headers: `x-cron-secret: <CRON_SECRET>` (route verifies secret)
  - Response: `{ ok: true, count: <rows written> }`

- `GET or POST /api/cron/generate-weekly`
  - Purpose: Enqueue one weekly generation task per year level (1-10) and dispatch worker runs.
  - Queueing: writes tasks to `homework_generation_queue`.

- `POST /api/cron/generate-weekly-worker`
  - Purpose: Process one queued weekly generation task.
  - Efficiency: worker pre-checks existing `homework_entries` and only calls Claude for missing year/date rows.
  - Retries: failed tasks are re-queued up to a max attempt count.
  - Usage logging: writes one record per worker run to `claude_usage_logs`.
  - Optional query example: `?referenceDate=2026-07-04`
  - Headers: `x-cron-secret: <CRON_SECRET>` or `x-vercel-cron: 1`
  - Response: `{ ok: true, total: <rows written>, generated: [{ yearLevel, count }] }`

- `POST /api/cron/send-homework`
  - Purpose: Send today's homework to all eligible students (reads `signups` and `homework_entries`).
  - Payload: optional `{ "date": "2026-07-03" }` to run for a specific date.
  - Headers: `x-cron-secret: <CRON_SECRET>`
  - Response: summary of prepared/sent emails, e.g. `{ ok: true, date: "2026-07-03", count: 12, sends: [...] }`

-- `POST /api/homework/resend`
  - Purpose: Flag one or more students for a resend (sets `signups.resend = true`) so the processor cron will resend the homework.
  - Payload examples:
    ```json
    { "email": "family@example.com", "date": "2026-07-01", "reason": "bounced" }
    ```
    ```json
    { "emails": ["family@example.com", "other@example.com"], "date": "2026-07-01", "reason": "bounced" }
    ```
    ```json
    { "email": "family@example.com, other@example.com", "date": "2026-07-01", "reason": "bounced" }
    ```
  - Headers: `x-homework-signup-key: <HOMEWORK_SIGNUP_SECRET>` (or `x-cron-secret` depending on your configuration)
  - Response: `{ ok: true, count: <n>, emails: [...] }` on success

-- `POST /api/cron/process-resends`
  - Purpose: Process students flagged with `resend = true` in `signups`, perform sends, log results, and clear the flag.
  - Headers: `x-cron-secret: <CRON_SECRET>`
  - Response: `{ ok: true, processed: <n>, results: [...] }`

---

## Example commands

- Run app locally (from project root):
```bash
npm install
npm run dev
```

- TypeScript check:
```bash
npx tsc --noEmit
```

- Trigger weekly generation (manual):
```bash
curl -X POST https://<your-deploy>/api/homework/generate-weekly \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"yearLevel":"6","referenceDate":"2026-07-04"}'
```

- Trigger daily send (manual):
```bash
curl -X POST https://<your-deploy>/api/cron/send-homework \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{}'   # optional {"date":"YYYY-MM-DD"}
```

- Enqueue a resend request:
```bash
curl -X POST https://<your-deploy>/api/homework/resend \
  -H "x-homework-signup-key: <HOMEWORK_SIGNUP_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"emails":["family@example.com","other@example.com"],"date":"2026-07-01","reason":"bounced"}'
```

- Process resends (run manually or from cron):
```bash
curl -X POST https://<your-deploy>/api/cron/process-resends -H "x-cron-secret: <CRON_SECRET>"
```

---

## Suggested Vercel cron jobs

Create scheduled jobs in Vercel (or any scheduler) to run these endpoints:

- `POST /api/homework/generate-weekly` — Weekly, Sunday 20:00 (generate next week's homework)
- `POST /api/cron/generate-weekly` — Weekly, Sunday 20:00 (generate full-week homework for years 1-10)
- `POST /api/cron/send-homework` — Daily, 07:00 (send homework on allowed days; route will skip non-homework days)
- `POST /api/cron/process-resends` — Every 15 minutes or hourly to process students flagged for resend (`signups.resend = true`)

Note: The `send-homework` route already checks the day-of-week (Mon/Wed/Fri) and student `days` list before sending.

---

## Testing & safety

- Use a staging mail provider and a test Supabase project for trial runs.
- Before enabling production: test end-to-end with one student and a test inbox.
- For Gmail SMTP, create an app password in your Google account and keep it in `GMAIL_APP_PASSWORD` rather than using your normal Google password.
- Add idempotency if desired (recommended): e.g., check `sent_emails` for a student/date before sending, or add a `sent` flag per student+homework row.

---

## Next recommended work

1. Add idempotency protections to avoid double sends (I can implement this).
2. Add admin UI to view `sent_emails` and to flag resends for students from the teacher UI.
3. Optionally add metrics/alerts for failed sends.

---

If you want, I can now implement idempotency (prevent duplicate sends) or add a small admin UI for resends—tell me which to do next.
