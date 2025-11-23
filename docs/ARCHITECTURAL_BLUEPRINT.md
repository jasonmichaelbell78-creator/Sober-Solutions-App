# Sober Living Management Architecture & Prompt

This document distills the market research and prompt engineering guidance needed to generate a production-ready Sober Living Home Management System using generative AI tools. It pairs industry context with concrete implementation details so the prompt yields high-quality, compliant code.

## Market & Product Context
- **Recovery residence focus:** Combine property management with clinical accountability (HIPAA/42 CFR Part 2). Leaders like One Step and Behave Health blend EHR-style depth with operational tooling.
- **Success pillars:**
  1. **Phase system precision** controlling privileges by resident stage.
  2. **Randomized toxicology integrity** with weighted, unpredictable selection and chain-of-custody logging.
  3. **RBAC + multi-tenant isolation** to prevent cross-organization data leakage.
- **Experience expectations:** Mobile-first workflows for house managers, outcomes dashboards (e.g., BARC-10 recovery capital trends), and audit-ready change history.

## Core Functional Modules
- **Resident lifecycle:** Lead → Applicant → Active → Alumni → Discharged with JSONB-backed flexible intake fields, configurable phase rules, and conflict-aware bed assignments (property → room → bed with gender/availability/phase checks).
- **Randomized toxicology:** Frequency tiers per phase/risk, seeded pseudo-random draws, blackout/leave exclusion, and chain-of-custody fields (sample ID, witness, collection time, result, substances).
- **Shift operations:** Structured shift logs with census, task checklists, incident/resident tagging, and enforced task completion before closing a shift.
- **Recovery capital:** Normalized survey storage (surveys/questions/responses/answers) to support BARC-10 and future scales, plus longitudinal visualizations.
- **Financials:** Hybrid ledger supporting split payments, proration, grant balances, and audit-ready transaction history.
- **Consent-first privacy:** Granular consent records (scope, recipient, expiration, revocation) and strict data-access gates.

## Technical Stack Constraints
- **Frontend:** Next.js 14 (App Router) with TypeScript, Tailwind CSS, Shadcn UI, React Query, React Hook Form, Zod, date-fns.
- **Backend:** Supabase (PostgreSQL + Auth + Realtime) with Row Level Security for tenant isolation and RBAC.
- **Security:** Every table carries `organization_id`; RLS ties it to JWT claims. Residents with `role = 'resident'` see only themselves; staff/admin roles can view their organization.

## Reference Schema Outline (Supabase/PostgreSQL)
- `organizations`
- `properties` → `rooms` → `beds` (status, gender designations, availability windows)
- `profiles` (linked to `auth.users`, role enum)
- `residents` (phase, admission/discharge, sobriety date, demographics, status)
- `phases` (privilege flags, testing frequency)
- `toxicology_tests` (test metadata, substances array, witness)
- `shift_logs` (start/end, mood, notes, tasks)
- `medication_logs`
- `incidents`
- `consents` (scope/recipient/expiration/revocation)
- `surveys`, `questions`, `responses`, `answers` (e.g., BARC-10)
- `ledgers`, `transactions` (charge/payment/adjustment/refund with source and grant tagging)

**RLS concepts:**
```sql
-- Organization isolation
the organization_id on every row must match the user's org claim.

-- Resident role limitation
residents.policy resident_self_access:
  using (role = 'resident' AND auth.uid() = profile_id);

-- Staff/Admin access
residents.policy org_staff_access:
  using (role IN ('staff','admin') AND organization_id = current_setting('request.jwt.claims'::text)::json->>'org_id');
```

## Algorithm & Workflow Blueprints
- **Daily drug test selector (TypeScript API route):**
  - Input: phase-based frequency map, exclusion statuses.
  - Steps: load active residents + last test date; weight candidates by required tests/week; seed RNG daily; exclude on leave/hospitalized; output resident IDs; log schedule for audit.
- **Bed management grid (React):** property → room → bed tiles; status coloring; click opens Shadcn sheet for assignment with gender/availability checks and server mutation.
- **Shift report form:** Zod schema + React Hook Form; auto census; dynamic checklist; resident-linked notable events; block submission until required tasks checked.
- **Audit logging:** Soft-delete critical records, triggers to capture before/after values for toxicology/financial changes, and immutable history for legal defense.

## Master Prompt Skeleton
1. **Role & Goal:** Instruct the model to act as a senior full-stack architect for HIPAA/42 CFR Part 2 behavioral health SaaS.
2. **Context:** Recovery residence operations (not generic property management).
3. **Tech stack lock:** Next.js 14 App Router + Supabase + TypeScript + Shadcn UI + Tailwind + React Query + RHF + Zod + date-fns.
4. **Deliverables:**
   - Project folder structure.
   - SQL schema with RLS policies for multi-tenancy and RBAC.
   - Core TypeScript interfaces.
   - Weighted randomized drug-testing API logic.
   - Bed grid component and shift report form.
   - Dashboard shell and outcomes visualization hooks.
5. **Guidance:** Require stepwise output (setup → schema → auth → features → UI), consent-first access checks, and explanations for security choices.

Use this blueprint as the canonical reference when generating or extending the sober living management platform.

