# SaffHire Dashboard — Phase 1A

Private internal SaffHire review dashboard foundation.

## Phase 1A includes

- Simple private login
- Admin, reviewer, and supervisor roles
- Dashboard shell
- Case list
- Create case form
- Copy/paste criminal court or national database record text
- Case detail page
- Human decision buttons
- Supervisor review queue
- Document library placeholder
- Admin users page
- Admin audit logs page
- Soft archive and admin-only soft delete
- Supabase SQL migration
- OpenAI placeholder for Phase 1B
- TazWorks placeholder for later phase

## Phase 1A does not include yet

- OpenAI review
- PDF upload and extraction
- Citation-backed AI answers
- TazWorks live connection
- Client portal
- Client-specific rule engine

## SQL migration

Run this file in Supabase SQL Editor before testing case save:

```text
supabase/migrations/001_phase_1a_private_foundation.sql
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

## Important security note

Phase 1A uses simple environment-variable based login. Use strong credentials and long random session values. For production use by more staff, move to database-managed users or Supabase Auth in a later phase.
