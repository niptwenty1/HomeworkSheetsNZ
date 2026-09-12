# HomeWorksheets Product and Engineering Roadmap

## Current Baseline

- Next.js App Router application deployed on Vercel.
- Supabase is the system of record for signups, homework entries, completions, send logs, curriculum items, and Claude usage logs.
- Parents currently sign up through a public form and are identified by email; there is no parent portal or parent authentication.
- Google/NextAuth is currently restricted to admins through `ADMIN_EMAILS`.
- Homework generation is performed by Claude and scheduled through Vercel cron routes.
- Homework is sent by cron using the selected delivery days and verified parent email state.
- Completion tracking currently uses signed email/name/date links and stores records in `completions`.
- Initial scale target is 100-200 parents/children.
- Admin functionality is concentrated in `app/admin/page.tsx` and admin API routes.

## Product Outcomes

1. Parents can securely manage their account and children.
2. Parents can understand learning activity and choose curriculum priorities.
3. Staff can monitor delivery, completion, learning coverage, and data quality.
4. Generated homework is accurate, age-appropriate, curriculum-aligned, and reviewable.
5. Personal data and child-related data are minimized, access-controlled, auditable, and recoverable.

## Architecture Direction

Keep one Next.js codebase initially. Use route groups and server-side authorization to separate public, parent, and admin experiences:

```text
app/
  (public)/
  (parent)/portal/
  (admin)/admin/
  api/parent/*
  api/admin/*
  lib/auth/*
  lib/homework/*
  lib/analytics/*
  lib/quality/*
```

Keep Supabase as the primary database and use Row Level Security for parent-owned records. Server-only service-role access should be limited to trusted jobs and admin operations. A separate analytics codebase is not recommended initially; create a separate reporting service only when data volume, team ownership, or compliance requirements justify it.

## Phase 0: Discovery and Data Design

**Timeline:** 1 week

**Actions**

- Define the parent, child, consent, subscription, and verification concepts.
- Decide whether a parent can have multiple children and whether children can have multiple guardians.
- Define the curriculum taxonomy: subject, strand, topic, skill, year-level applicability, and difficulty.
- Define the metrics and their business meaning before building charts.
- Record data retention, deletion, export, and consent requirements.
- Create a threat model and data classification register.

**User stories**

- As a product owner, I can define what “active”, “verified”, “sent”, “opened”, and “completed” mean.
- As a parent, I can understand what information is stored about me and my child.
- As an administrator, I can distinguish operational data from learning analytics.

**Deliverables**

- Approved domain model and event definitions.
- Initial database ERD and migration plan.
- Security and privacy requirements.
- Prioritized MVP backlog.

## Phase 1: Identity, Parent Accounts, and Child Profiles

**Timeline:** 2-3 weeks

**Actions**

- Introduce a real parent identity linked to Supabase Auth rather than treating email as the account key.
- Support one parent managing multiple children and multiple guardians accessing the same child.
- Use password and Google sign-in for parent authentication.
- Keep email verification, but move token state to a controlled account/verification model when ready.
- Add parent profile and child profile tables; migrate existing signups into them.
- Link homework deliveries, completions, preferences, and audit events to `child_id`.
- Add parent login, logout, password reset, and session expiry behavior.
- Do not send homework to the parent email; retain a separate delivery email for each child.

**Suggested entities**

- `parents`: auth user link, name, normalized email, status, consent timestamps.
- `children`: parent link, name, year level, school, active status.
- `child_delivery_preferences`: delivery email, days, timezone, enabled flag.
- `child_guardians`: child-to-parent access relationship and role.
- `child_topic_preferences`: curriculum item/skill, priority, start/end dates.
- `verification_events` and `audit_events`.

**User stories**

- As a parent, I can create and access my account securely.
- As a parent, I can add, edit, pause, and remove a child.
- As a parent, I can see which email and delivery days belong to each child.
- As a parent, I can manage my consent and request account deletion.
- As a second guardian, I can access a child when invited by an authorized parent.

**Acceptance criteria**

- A parent can never read another parent’s child or activity data.
- Parent data access is enforced by database RLS, not only UI checks.
- Existing signups can be migrated without losing delivery history.
- A child is identified by stable ID rather than email/name combinations.

## Phase 2: Parent Portal and Topic Preferences

**Timeline:** 3-4 weeks

**Actions**

- Build `/portal` with account summary, child switcher, activity history, and preferences.
- Show homework received, attempted/completed, completion rate, recent topics, and activity by date.
- Add curriculum browsing filtered by the child’s year level.
- Allow parents to choose focus topics with priority and optional duration.
- Give selected topics higher priority while preserving normal curriculum rotation.
- Expire topic priorities after a configurable number of weeks or a selected end date.
- Change generation to receive explicit assigned topics selected by application logic, not merely a “do not repeat” prompt.
- Record topic assignments and generation outcomes for explainability.

**User stories**

- As a parent, I can see how many homework sets my child received and completed.
- As a parent, I can see topics practiced by subject and date.
- As a parent, I can choose one or more curriculum topics for extra focus.
- As a parent, I can pause or change a focus topic.
- As a parent, I can see a progress summary and topics already covered without needing full homework-content history.

**Acceptance criteria**

- Dashboard numbers are derived from durable delivery/completion events.
- Preferences affect future generation only and do not rewrite historical homework.
- A parent sees only curriculum choices valid for that child’s year level.
- Every generated homework entry records its assigned curriculum topic IDs.
- A parent’s topic priorities expire according to the configured end date or duration.

## Phase 3: Delivery and Progress Data Foundation

**Timeline:** 2 weeks, overlapping Phase 2

**Actions**

- Replace email/name/date completion identity with `child_id` and `homework_delivery_id`.
- Initially treat a matching completion record in the homework completion database as “completed”; student uploads and review are future scope.
- Add delivery records with statuses: queued, sent, failed, bounced, opened if provider supports it, completed.
- Add idempotency keys for sends, for example `child_id + homework_entry_id + delivery_type`.
- Preserve the current resend workflow but make it ID-based end to end.
- Add timezone-aware scheduling and clear handling for missing delivery days.

**Suggested entities**

- `homework_assignments`: child, homework entry, assignment reason, assigned topic IDs.
- `homework_deliveries`: assignment, recipient, provider message ID, status, timestamps.
- `homework_completions`: child, assignment, completed timestamp, source.
- `generation_runs`: request, model, prompt version, output, review status, cost metadata.

## Phase 4: Admin Analytics Dashboard

**Timeline:** 3-4 weeks

**Recommendation:** Keep analytics in the existing Next.js codebase initially, but use a separate admin route group and server-side query layer. Do not expose raw Supabase tables to the browser.

**Actions**

- Add an analytics section to the existing admin dashboard with role-aware navigation.
- Add filters for date range, year level, school, child, parent, subject, topic, delivery status, and completion status.
- Add views for active/verified parents, children, delivery success, failure rate, completion rate, topic coverage, and missing data.
- Use server-side pagination and aggregate queries/materialized views for performance.
- Restrict parent contact details and child data to authorized staff roles.
- Export only approved fields and log exports.

**User stories**

- As an administrator, I can filter homework activity by date, year, school, topic, and status.
- As an administrator, I can identify students with repeated delivery failures.
- As an administrator, I can compare sent versus completed homework.
- As an administrator, I can inspect the topics practiced by a child.
- As an administrator, I can export a controlled report for a legitimate purpose.
- Analytics, exports, content approval, and support access are admin-only initially.

**Separate codebase decision rule**

Stay in this codebase until one of these becomes true: analytics has a different release cadence/team, query load harms the app, a warehouse/BI tool is required, or stricter isolation is required. At that point, replicate sanitized events to a warehouse rather than giving a second app direct service-role access to production tables.

## Phase 5: Content Quality and Review Agent

**Timeline:** 3-5 weeks for a useful first version

**Actions**

- Define a quality rubric before building an agent: mathematical correctness, answerability, curriculum fit, year-level suitability, reading comprehension alignment, grammar correctness, safety, duplication, and formatting.
- Store generated content and review results before delivery when practical.
- Use deterministic validators first: schema validation, required fields, question counts, date alignment, curriculum IDs, prohibited content rules, and arithmetic checks where feasible.
- Use a separate review model or review prompt for semantic checks; never let the generator self-certify silently.
- Assign statuses such as `draft`, `review-passed`, `review-needs-human`, `rejected`, and `published`.
- Add a human review queue for failed or low-confidence content.
- Keep model, prompt version, review result, and source data for auditability.

**User stories**

- As an administrator, I can see why generated homework passed or failed review.
- As an administrator, I can approve, edit, reject, or regenerate a homework set.
- As a parent, I receive only content that has passed the configured quality gate.
- As an engineer, I can reproduce which prompt and model produced an item.

**Quality gate**

Do not send content when deterministic validation fails. For semantic uncertainty, route to human review or use a conservative retry policy. A review agent reduces risk but does not prove correctness.

## Phase 6: Security, Privacy, and Operational Hardening

**Timeline:** starts in Phase 0; 2-3 weeks for the first hardening release

**Actions**

- Enable and test Supabase RLS for parent-owned data.
- Keep service-role keys server-only; remove secrets from client bundles and rotate exposed credentials.
- Replace shared signup secrets with authenticated sessions and CSRF/origin protections where applicable.
- Add rate limiting for signup, login, verification, resend, and generation endpoints.
- Validate and normalize all input; escape HTML email content; prevent injection and unsafe redirects.
- Add security headers, secure cookies, HTTPS-only production settings, and strict environment separation.
- Minimize child data, avoid unnecessary sensitive fields, and define retention/deletion workflows.
- Add audit logging for admin reads, exports, edits, approvals, and resend actions.
- Add dependency scanning, secret scanning, CI tests, typecheck, lint, migration checks, and backup/restore drills.
- Review provider data-processing terms and privacy obligations relevant to children and New Zealand users.

**Security acceptance criteria**

- Parent authorization is tested with positive and negative cross-account cases.
- Admin roles are explicit; not every admin has export or content-approval privileges.
- Tokens are hashed, single-use, expiring, and never logged.
- Logs contain IDs and statuses rather than email addresses or child details where possible.
- A compromised client cannot query Supabase data outside the user’s RLS policy.

## Suggested Delivery Timeline

| Period | Focus | Outcome |
|---|---|---|
| Week 1 | Discovery, metrics, threat model, data design | Approved scope and schema plan |
| Weeks 2-4 | Parent identity, migration, child profiles | Secure parent account foundation |
| Weeks 5-8 | Parent portal and topic preferences | Parents can view progress and influence future work |
| Weeks 6-9 | Delivery/completion event model | Reliable metrics and ID-based resend flow |
| Weeks 9-12 | Admin analytics MVP | Staff can filter and act on operational data |
| Weeks 10-14 | Quality validators and review queue | Content is gated before delivery |
| Ongoing | Security, privacy, observability, backups | Production readiness improvements |

## Recommended First Backlog

1. Agree on the parent/child domain model and authentication method.
2. Add stable `parent_id`, `child_id`, `assignment_id`, and `delivery_id` concepts before building charts.
3. Migrate completion and resend flows from email identity to stable IDs.
4. Implement parent authentication with RLS and negative authorization tests.
5. Build the smallest parent portal: child switcher, received/completed counts, topic history.
6. Add explicit topic assignment to generation and persist the assignment.
7. Build admin analytics from the same event model.
8. Add deterministic content validators, then the review agent and human queue.
9. Complete the security/privacy release checklist before broad launch.

## Confirmed Product Decisions

- One parent can manage multiple children.
- Multiple guardians can access the same child.
- Homework goes to a separate child delivery email, not the parent login email.
- Parents use password and Google sign-in.
- Parent-selected topics receive higher priority while normal curriculum rotation remains available.
- Topic priorities expire after a configured duration or selected end date.
- Parents see progress summaries and covered topics, not full homework-content history initially.
- Completion currently means a matching record in the homework completion database; student uploads and review are future scope.
- Analytics, exports, content approval, and support access are admin-only initially.
- Every homework set must pass review before it can be sent.
- Initial scale target is 100-200 parents/children.

## Open Product and Compliance Actions

- Define privacy, consent, retention, deletion, and data-export requirements for child data before launch.
- Confirm the acceptable monthly AI and email budget.
- Decide the exact guardian invitation and removal workflow.
- Decide whether Google accounts may be linked to an existing password account by verified email.
