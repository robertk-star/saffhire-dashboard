# SaffHire Dashboard — Phase 1B

Private internal SaffHire review dashboard.

## Phase 1B includes

- Phase 1A private login and case review foundation
- Admin-only PDF upload
- Private document library
- PDF text extraction
- Document chunk storage for AI retrieval
- OpenAI case review route
- AI review panel on case detail pages
- Citation-style source output
- Supervisor routing when AI flags review needed
- Real audit-log table page
- Cleanup of temporary Phase 1A test files

## Still not included

- TazWorks live connection
- Client-specific rule engine
- Client portal
- Automatic report changes
- Automatic client/employer notifications

## SQL migrations

Run both migration files in Supabase SQL Editor:

```text
supabase/migrations/001_phase_1a_private_foundation.sql
supabase/migrations/002_phase_1b_documents_ai_review.sql
```

## Local development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Security note

This is an internal staff review app. AI output is guidance only. A SaffHire reviewer must make the final decision.
