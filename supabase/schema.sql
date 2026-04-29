-- =============================================================================
-- RackScale — Supabase Database Schema
-- =============================================================================
-- Run this file in the Supabase SQL editor to set up the full schema.
-- Order matters: referenced tables must exist before foreign keys are created.
-- =============================================================================

-- Enable the pgcrypto extension for gen_random_uuid()
create extension if not exists "pgcrypto";


-- =============================================================================
-- TABLE: companies
-- =============================================================================
-- Represents an organisation that subscribes to RackScale.
-- Every user profile belongs to exactly one company.
-- Every project is scoped to one company.
-- =============================================================================
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),

  -- Human-readable company name shown in the UI
  name        text not null,

  -- Optional website / domain used for display purposes
  domain      text,

  -- Soft metadata
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.companies              is 'Tenant organisations. Every user and project is scoped to a company.';
comment on column public.companies.id           is 'UUID primary key.';
comment on column public.companies.name         is 'Display name of the company.';
comment on column public.companies.domain       is 'Optional corporate domain (e.g. acme.com).';
comment on column public.companies.created_at   is 'Row creation timestamp (UTC).';
comment on column public.companies.updated_at   is 'Row last-modified timestamp (UTC).';


-- =============================================================================
-- TABLE: profiles
-- =============================================================================
-- One-to-one extension of auth.users (Supabase managed auth table).
-- Stores application-level user data and links each user to a company.
-- =============================================================================
create table if not exists public.profiles (
  -- Must match the UUID of the corresponding auth.users row
  id          uuid primary key references auth.users (id) on delete cascade,

  -- FK to companies — every profile belongs to one company
  company_id  uuid not null references public.companies (id) on delete restrict,

  full_name   text,
  avatar_url  text,
  job_title   text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.profiles              is 'Application-level user data extending auth.users. Each profile is tied to one company.';
comment on column public.profiles.id           is 'UUID — must equal the corresponding auth.users.id.';
comment on column public.profiles.company_id   is 'FK to companies. Determines which company data this user can access.';
comment on column public.profiles.full_name    is 'User display name.';
comment on column public.profiles.avatar_url   is 'URL of the user avatar image.';
comment on column public.profiles.job_title    is 'Optional job title shown on the profile.';
comment on column public.profiles.created_at   is 'Row creation timestamp (UTC).';
comment on column public.profiles.updated_at   is 'Row last-modified timestamp (UTC).';

-- Index: look up all profiles for a company
create index if not exists profiles_company_id_idx on public.profiles (company_id);


-- =============================================================================
-- TABLE: projects
-- =============================================================================
-- A data-center design project, owned by a company.
-- One project can contain many scenarios (design alternatives).
-- =============================================================================
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),

  -- Every project belongs to one company
  company_id  uuid not null references public.companies (id) on delete cascade,

  -- Human-readable project name (e.g. "NYC DC Expansion Phase 2")
  name        text not null,

  -- Optional free-text description of the project goal
  description text,

  -- Project lifecycle status
  status      text not null default 'active'
                check (status in ('active', 'archived', 'draft')),

  -- Physical location of the data centre being modelled
  location    text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.projects              is 'Data-center design projects scoped to a company.';
comment on column public.projects.id           is 'UUID primary key.';
comment on column public.projects.company_id   is 'FK to companies. All scenarios inherit this company scope.';
comment on column public.projects.name         is 'Short display name of the project.';
comment on column public.projects.description  is 'Optional longer description of project goals.';
comment on column public.projects.status       is 'Lifecycle status: active | archived | draft.';
comment on column public.projects.location     is 'Physical data-centre location (city, region, etc.).';
comment on column public.projects.created_at   is 'Row creation timestamp (UTC).';
comment on column public.projects.updated_at   is 'Row last-modified timestamp (UTC).';

create index if not exists projects_company_id_idx on public.projects (company_id);


-- =============================================================================
-- TABLE: scenarios
-- =============================================================================
-- A specific rack-density / infrastructure design within a project.
-- Multiple scenarios per project allow side-by-side comparison.
-- Stores the input parameters; computed outputs live in scenario_results.
-- =============================================================================
create table if not exists public.scenarios (
  id                    uuid primary key default gen_random_uuid(),

  -- Parent project
  project_id            uuid not null references public.projects (id) on delete cascade,

  -- Human-readable name (e.g. "High-density GPU cluster")
  name                  text not null,
  description           text,

  -- ── Input parameters ──────────────────────────────────────────────────────

  -- Number of racks being modelled
  rack_count            integer not null default 1 check (rack_count > 0),

  -- Average IT power draw per rack (kW)
  avg_power_per_rack_kw numeric(10,2) not null default 10,

  -- Target Power Usage Effectiveness ratio (1.0 = perfectly efficient)
  pue_target            numeric(4,3) not null default 1.4 check (pue_target >= 1.0),

  -- Electricity cost in USD per kWh
  power_cost_per_kwh    numeric(8,4) not null default 0.08,

  -- Cooling technology used (air | liquid | hybrid)
  cooling_type          text not null default 'air'
                          check (cooling_type in ('air', 'liquid', 'hybrid')),

  -- Optional redundancy tier label (e.g. N, N+1, 2N)
  redundancy_level      text not null default 'N+1',

  -- ── Extended scenario inputs ───────────────────────────────────────────────

  -- Growth buffer applied on top of base IT load (0–100 %)
  growth_buffer_pct     numeric(5,2)  not null default 20,

  -- Utility feed topology: single | dual
  utility_feed          text          not null default 'dual'
                          check (utility_feed in ('single', 'dual')),

  -- UPS architecture: centralized | distributed
  ups_type              text          not null default 'centralized'
                          check (ups_type in ('centralized', 'distributed')),

  -- Aisle containment strategy: none | hot_aisle | cold_aisle
  containment_type      text          not null default 'none'
                          check (containment_type in ('none', 'hot_aisle', 'cold_aisle')),

  -- CapEx cost per MW of IT load (USD)
  cost_per_mw           numeric(14,2) not null default 0,

  -- CapEx cost per rack (USD)
  cost_per_rack         numeric(12,2) not null default 0,

  -- ── Lifecycle ─────────────────────────────────────────────────────────────
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table  public.scenarios                     is 'Design scenarios within a project. Each scenario captures a specific rack-density configuration.';
comment on column public.scenarios.id                  is 'UUID primary key.';
comment on column public.scenarios.project_id          is 'FK to projects. Inherits the project company scope.';
comment on column public.scenarios.name                is 'Short display name of the scenario.';
comment on column public.scenarios.description         is 'Optional description of design intent.';
comment on column public.scenarios.rack_count          is 'Number of racks in this scenario.';
comment on column public.scenarios.avg_power_per_rack_kw is 'Average IT power draw per rack in kilowatts.';
comment on column public.scenarios.pue_target          is 'Target Power Usage Effectiveness (e.g. 1.4 means 40 pct overhead).';
comment on column public.scenarios.power_cost_per_kwh  is 'Local electricity cost in USD per kWh.';
comment on column public.scenarios.cooling_type        is 'Cooling method: air | liquid | hybrid.';
comment on column public.scenarios.redundancy_level    is 'Power redundancy configuration label (e.g. N+1, 2N).';
comment on column public.scenarios.created_at          is 'Row creation timestamp (UTC).';
comment on column public.scenarios.updated_at          is 'Row last-modified timestamp (UTC).';

create index if not exists scenarios_project_id_idx on public.scenarios (project_id);


-- =============================================================================
-- TABLE: scenario_results
-- =============================================================================
-- Computed engineering outputs for a scenario.
-- One result row per scenario (upserted whenever a scenario is recalculated).
-- Stores both the numeric outputs and the structured risk-flag JSON array.
-- =============================================================================
create table if not exists public.scenario_results (
  id                          uuid primary key default gen_random_uuid(),

  -- One-to-one relationship with scenarios
  scenario_id                 uuid not null unique references public.scenarios (id) on delete cascade,

  -- ── Computed power metrics ────────────────────────────────────────────────

  -- Total IT load across all racks (kW)
  total_it_load_kw            numeric(12,2) not null,

  -- Total facility power including PUE overhead (kW)
  total_power_draw_kw         numeric(12,2) not null,

  -- Cooling capacity required to dissipate heat (kW)
  cooling_capacity_required_kw numeric(12,2) not null,

  -- ── Cost & sustainability metrics ─────────────────────────────────────────

  -- Estimated annual energy cost (USD)
  estimated_annual_cost_usd   numeric(16,2) not null,

  -- Carbon footprint estimate in metric tons CO₂ per year
  carbon_footprint_mt_co2     numeric(12,2),

  -- Efficiency rating label derived from PUE (e.g. A, B, C)
  efficiency_rating           text,

  -- ── Risk analysis ─────────────────────────────────────────────────────────
  -- JSON array of risk flag objects: [{id, severity, category, message, recommendation}]
  risk_flags                  jsonb not null default '[]'::jsonb,

  -- Overall risk level summarised from risk_flags
  overall_risk_level          text not null default 'low'
                                check (overall_risk_level in ('low', 'medium', 'high', 'critical')),

  -- ── Lifecycle ─────────────────────────────────────────────────────────────
  -- Timestamp of the calculation run that produced these results
  calculated_at               timestamptz not null default now(),

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table  public.scenario_results                           is 'Computed engineering outputs for a scenario. One row per scenario, upserted on recalculation.';
comment on column public.scenario_results.id                        is 'UUID primary key.';
comment on column public.scenario_results.scenario_id               is 'FK to scenarios (unique — one result per scenario).';
comment on column public.scenario_results.total_it_load_kw          is 'Total IT power load across all racks (kW).';
comment on column public.scenario_results.total_power_draw_kw       is 'Total facility power draw including PUE overhead (kW).';
comment on column public.scenario_results.cooling_capacity_required_kw is 'Cooling capacity needed to dissipate heat (kW).';
comment on column public.scenario_results.estimated_annual_cost_usd is 'Estimated annual energy cost in USD.';
comment on column public.scenario_results.carbon_footprint_mt_co2   is 'Estimated annual carbon footprint in metric tons CO2.';
comment on column public.scenario_results.efficiency_rating         is 'Letter grade efficiency rating derived from PUE.';
comment on column public.scenario_results.risk_flags                is 'JSONB array of risk flag objects with severity, category, message, and recommendation fields.';
comment on column public.scenario_results.overall_risk_level        is 'Highest risk level across all flags: low | medium | high | critical.';
comment on column public.scenario_results.calculated_at             is 'Timestamp of the last calculation run.';
comment on column public.scenario_results.created_at                is 'Row creation timestamp (UTC).';
comment on column public.scenario_results.updated_at                is 'Row last-modified timestamp (UTC).';

create index if not exists scenario_results_scenario_id_idx on public.scenario_results (scenario_id);


-- =============================================================================
-- TRIGGERS — keep updated_at current automatically
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is 'Trigger function: sets updated_at to now() on every UPDATE.';

create or replace trigger companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create or replace trigger scenarios_updated_at
  before update on public.scenarios
  for each row execute function public.set_updated_at();

create or replace trigger scenario_results_updated_at
  before update on public.scenario_results
  for each row execute function public.set_updated_at();


-- =============================================================================
-- HELPER FUNCTION — resolve a user's company_id from auth.uid()
-- =============================================================================
-- Used by RLS policies below to avoid repeating the sub-select.
-- Security definer so it can read profiles regardless of RLS on that table.
-- =============================================================================
create or replace function public.my_company_id()
returns uuid language sql stable security definer as $$
  select company_id from public.profiles where id = auth.uid()
$$;

comment on function public.my_company_id is 'Returns the company_id of the currently authenticated user. Used in RLS policies.';


-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================
-- Policy pattern:
--   • companies  — a user may see/modify only their own company row
--   • profiles   — a user may see/modify only profiles in their company
--   • projects   — a user may see/modify only projects in their company
--   • scenarios  — a user may see/modify only scenarios whose project belongs
--                  to their company
--   • scenario_results — same company-scoping via scenarios → projects
--
-- Service-role key (used by the API server) bypasses RLS automatically.
-- =============================================================================

alter table public.companies       enable row level security;
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.scenarios       enable row level security;
alter table public.scenario_results enable row level security;


-- ── companies ────────────────────────────────────────────────────────────────

create policy "companies: users can view their own company"
  on public.companies for select
  using (id = public.my_company_id());

create policy "companies: users can update their own company"
  on public.companies for update
  using (id = public.my_company_id());


-- ── profiles ─────────────────────────────────────────────────────────────────

create policy "profiles: users can view profiles in their company"
  on public.profiles for select
  using (company_id = public.my_company_id());

create policy "profiles: users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());


-- ── projects ─────────────────────────────────────────────────────────────────

create policy "projects: users can view projects in their company"
  on public.projects for select
  using (company_id = public.my_company_id());

create policy "projects: users can insert projects for their company"
  on public.projects for insert
  with check (company_id = public.my_company_id());

create policy "projects: users can update projects in their company"
  on public.projects for update
  using (company_id = public.my_company_id());

create policy "projects: users can delete projects in their company"
  on public.projects for delete
  using (company_id = public.my_company_id());


-- ── scenarios ────────────────────────────────────────────────────────────────

create policy "scenarios: users can view scenarios in their company"
  on public.scenarios for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.company_id = public.my_company_id()
    )
  );

create policy "scenarios: users can insert scenarios into their company's projects"
  on public.scenarios for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.company_id = public.my_company_id()
    )
  );

create policy "scenarios: users can update scenarios in their company"
  on public.scenarios for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.company_id = public.my_company_id()
    )
  );

create policy "scenarios: users can delete scenarios in their company"
  on public.scenarios for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.company_id = public.my_company_id()
    )
  );


-- ── scenario_results ─────────────────────────────────────────────────────────

create policy "scenario_results: users can view results in their company"
  on public.scenario_results for select
  using (
    exists (
      select 1
      from public.scenarios s
      join public.projects  p on p.id = s.project_id
      where s.id = scenario_id
        and p.company_id = public.my_company_id()
    )
  );

create policy "scenario_results: users can insert results in their company"
  on public.scenario_results for insert
  with check (
    exists (
      select 1
      from public.scenarios s
      join public.projects  p on p.id = s.project_id
      where s.id = scenario_id
        and p.company_id = public.my_company_id()
    )
  );

create policy "scenario_results: users can update results in their company"
  on public.scenario_results for update
  using (
    exists (
      select 1
      from public.scenarios s
      join public.projects  p on p.id = s.project_id
      where s.id = scenario_id
        and p.company_id = public.my_company_id()
    )
  );

create policy "scenario_results: users can delete results in their company"
  on public.scenario_results for delete
  using (
    exists (
      select 1
      from public.scenarios s
      join public.projects  p on p.id = s.project_id
      where s.id = scenario_id
        and p.company_id = public.my_company_id()
    )
  );


-- =============================================================================
-- AUTO-PROVISION PROFILE ON SIGN-UP
-- =============================================================================
-- When a new user completes Supabase auth sign-up, this trigger automatically
-- inserts a skeleton profile row. The company_id is populated from the
-- user metadata supplied during sign-up (raw_user_meta_data->>'company_id').
-- If no company_id is supplied, the insert is skipped and the app must
-- prompt the user to select / create a company on first login.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  if (new.raw_user_meta_data->>'company_id') is not null then
    insert into public.profiles (id, company_id, full_name, avatar_url)
    values (
      new.id,
      (new.raw_user_meta_data->>'company_id')::uuid,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
  end if;
  return new;
end;
$$;

comment on function public.handle_new_user is 'Trigger: auto-creates a profile row when a new auth user signs up, if company_id is present in user metadata.';

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
