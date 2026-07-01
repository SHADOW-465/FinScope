-- FinScope initial schema (PRD-v2 §G)
-- Multi-tenant from day one: every table carries org_id and is RLS-isolated,
-- even though the MVP onboards a single user per org. This is what makes the
-- single-user MVP become a team product later with zero schema rework.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- organizations / users
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branding jsonb not null default '{}'::jsonb,
  retention_policy text not null default 'manual' check (retention_policy in ('immediate','24h','7d','manual')),
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'owner' check (role in ('owner','admin','analyst','viewer')),
  created_at timestamptz not null default now()
);

create index users_org_id_idx on public.users(org_id);

-- ---------------------------------------------------------------------------
-- applicant_cases / consents
-- ---------------------------------------------------------------------------

create table public.applicant_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  applicant_name text not null,
  product_type text not null check (product_type in ('personal','vehicle','gold','msme','lap','working_capital')),
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  tenure_months int not null check (tenure_months > 0),
  interest_rate_annual_pct numeric(5,2),
  status text not null default 'draft' check (status in ('draft','processing','ready','approved','declined','manual_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applicant_cases_org_id_idx on public.applicant_cases(org_id);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  consent_text text not null,
  captured_by uuid references public.users(id) on delete set null,
  captured_at timestamptz not null default now()
);

create index consents_case_id_idx on public.consents(case_id);
create index consents_org_id_idx on public.consents(org_id);

-- ---------------------------------------------------------------------------
-- documents / transactions / counterparties
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  bank_name text,
  file_path text,
  sha256 text,
  page_count int,
  integrity_status text check (integrity_status in ('ok','warning','fail')),
  ocr_used boolean not null default false,
  processing_status text not null default 'pending' check (processing_status in ('pending','processing','done','failed')),
  uploaded_at timestamptz not null default now(),
  delete_after timestamptz
);

create index documents_case_id_idx on public.documents(case_id);
create index documents_org_id_idx on public.documents(org_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  raw_desc text not null default '',
  normalized_desc text,
  credit numeric(14,2) not null default 0,
  debit numeric(14,2) not null default 0,
  balance numeric(14,2) not null,
  category text,
  counterparty text,
  counterparty_type text,
  payment_method text,
  confidence numeric(4,3),
  page_number int,
  ai_enhanced boolean not null default false
);

create index transactions_document_id_idx on public.transactions(document_id);
create index transactions_case_id_idx on public.transactions(case_id);
create index transactions_org_id_idx on public.transactions(org_id);
create index transactions_case_date_idx on public.transactions(case_id, date);

create table public.counterparties (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  canonical_name text not null,
  aliases text[] not null default '{}',
  type text,
  freq int not null default 0,
  total_cr numeric(14,2) not null default 0,
  total_db numeric(14,2) not null default 0
);

create index counterparties_case_id_idx on public.counterparties(case_id);
create index counterparties_org_id_idx on public.counterparties(org_id);

-- ---------------------------------------------------------------------------
-- metrics / risk_results / fraud_indicators / reports
-- ---------------------------------------------------------------------------

create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  metric_id text not null,
  value numeric,
  unit text,
  formula_version text,
  source_refs text[] not null default '{}',
  confidence numeric(4,3)
);

create index metrics_case_id_idx on public.metrics(case_id);
create index metrics_org_id_idx on public.metrics(org_id);

create table public.risk_results (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  overall_score int not null check (overall_score between 0 and 100),
  component_scores jsonb not null default '{}'::jsonb,
  triggered_rules text[] not null default '{}',
  recommendation text,
  policy_profile_id text,
  generated_at timestamptz not null default now()
);

create index risk_results_case_id_idx on public.risk_results(case_id);
create index risk_results_org_id_idx on public.risk_results(org_id);

create table public.fraud_indicators (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  severity text not null check (severity in ('low','medium','high')),
  confidence numeric(4,3),
  evidence_txn_ids uuid[] not null default '{}',
  review_status text not null default 'pending' check (review_status in ('pending','confirmed','dismissed'))
);

create index fraud_indicators_case_id_idx on public.fraud_indicators(case_id);
create index fraud_indicators_org_id_idx on public.fraud_indicators(org_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  version int not null default 1,
  pdf_path text,
  generated_at timestamptz not null default now()
);

create index reports_case_id_idx on public.reports(case_id);
create index reports_org_id_idx on public.reports(org_id);

-- ---------------------------------------------------------------------------
-- lender_policies / ai_responses / audit_log
-- ---------------------------------------------------------------------------

create table public.lender_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_type text not null check (product_type in ('personal','vehicle','gold','msme','lap','working_capital')),
  name text not null,
  rules jsonb not null,
  created_at timestamptz not null default now()
);

create index lender_policies_org_id_idx on public.lender_policies(org_id);

create table public.ai_responses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.applicant_cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  prompt_version text,
  model text,
  question text,
  answer jsonb,
  referenced_metric_ids text[] not null default '{}',
  referenced_txn_ids uuid[] not null default '{}',
  latency_ms int,
  validated boolean not null default false,
  created_at timestamptz not null default now()
);

create index ai_responses_case_id_idx on public.ai_responses(case_id);
create index ai_responses_org_id_idx on public.ai_responses(org_id);

-- Append-only: no update/delete policy is defined for this table (see RLS
-- section below), so authenticated users can never modify or remove rows.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_id_idx on public.audit_log(org_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — org isolation. Cross-tenant access must be
-- technically impossible (PRD-v2 §A.3 / §G).
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.applicant_cases enable row level security;
alter table public.consents enable row level security;
alter table public.documents enable row level security;
alter table public.transactions enable row level security;
alter table public.counterparties enable row level security;
alter table public.metrics enable row level security;
alter table public.risk_results enable row level security;
alter table public.fraud_indicators enable row level security;
alter table public.reports enable row level security;
alter table public.lender_policies enable row level security;
alter table public.ai_responses enable row level security;
alter table public.audit_log enable row level security;

-- organizations: a user may see/update only their own org.
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = (select org_id from public.users where id = auth.uid()));

create policy organizations_update on public.organizations
  for update to authenticated
  using (id = (select org_id from public.users where id = auth.uid()));

-- users: a user may see other users in their own org.
create policy users_select on public.users
  for select to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()));

create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid());

-- Generic org-scoped policy, reused verbatim for every remaining table:
-- rows are visible/writable only when org_id matches the caller's org.

create policy applicant_cases_all on public.applicant_cases
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy consents_all on public.consents
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy documents_all on public.documents
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy transactions_all on public.transactions
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy counterparties_all on public.counterparties
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy metrics_all on public.metrics
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy risk_results_all on public.risk_results
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy fraud_indicators_all on public.fraud_indicators
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy reports_all on public.reports
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy lender_policies_all on public.lender_policies
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

create policy ai_responses_all on public.ai_responses
  for all to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()))
  with check (org_id = (select org_id from public.users where id = auth.uid()));

-- audit_log: select + insert only. No update/delete policy exists anywhere
-- in this migration, so rows are immutable to every non-superuser role.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (org_id = (select org_id from public.users where id = auth.uid()));

create policy audit_log_insert on public.audit_log
  for insert to authenticated
  with check (org_id = (select org_id from public.users where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- bootstrap_organization — solves the chicken-and-egg problem where a brand
-- new signup has no `users` row yet, so the org-isolation policies above
-- would block them from creating one. SECURITY DEFINER lets this single,
-- narrow operation bypass RLS; every inner statement still scopes strictly to
-- auth.uid(), so it grants no broader privilege than "set up my own org".
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  caller_id uuid := auth.uid();
  caller_email text;
begin
  if caller_id is null then
    raise exception 'bootstrap_organization must be called by an authenticated user';
  end if;

  if exists (select 1 from public.users where id = caller_id) then
    raise exception 'user already belongs to an organization';
  end if;

  select email into caller_email from auth.users where id = caller_id;

  insert into public.organizations (name) values (org_name) returning id into new_org_id;
  insert into public.users (id, org_id, email, role) values (caller_id, new_org_id, coalesce(caller_email, ''), 'owner');

  return new_org_id;
end;
$$;

revoke all on function public.bootstrap_organization(text) from public;
grant execute on function public.bootstrap_organization(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants: RLS policies above are the real access control; these grants only
-- give the `authenticated` role table-level capability to attempt the
-- operations RLS then filters per-row. No update/delete policy on
-- audit_log means those grants are inert for that table.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
