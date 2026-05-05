-- =============================================================================
-- Migration: Add company-level plan support
-- Safe to run multiple times — all statements use IF NOT EXISTS / DO blocks.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1. Add plan column (allowed values: Free, Pro, Team, Enterprise)
alter table public.companies
  add column if not exists plan text not null default 'Free';

-- Apply check constraint only if it does not already exist
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'companies'
      and constraint_name = 'companies_plan_check'
  ) then
    alter table public.companies
      add constraint companies_plan_check
        check (plan in ('Free', 'Pro', 'Team', 'Enterprise'));
  end if;
end;
$$;

-- 2. Add plan_status column (allowed values: active, trialing, past_due, canceled)
alter table public.companies
  add column if not exists plan_status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'companies'
      and constraint_name = 'companies_plan_status_check'
  ) then
    alter table public.companies
      add constraint companies_plan_status_check
        check (plan_status in ('active', 'trialing', 'past_due', 'canceled'));
  end if;
end;
$$;

-- 3. Add scenario_limit column
alter table public.companies
  add column if not exists scenario_limit integer not null default 3;

-- 4. Backfill existing rows (safe no-op if already set)
update public.companies
set
  plan           = coalesce(plan, 'Free'),
  plan_status    = coalesce(plan_status, 'active'),
  scenario_limit = coalesce(scenario_limit, 3)
where
  plan           is null
  or plan_status is null
  or scenario_limit is null;

-- 5. Column comments
comment on column public.companies.plan           is 'Subscription plan tier: Free | Pro | Team | Enterprise.';
comment on column public.companies.plan_status    is 'Billing status: active | trialing | past_due | canceled.';
comment on column public.companies.scenario_limit is 'Max scenarios allowed under this plan (-1 = unlimited).';
