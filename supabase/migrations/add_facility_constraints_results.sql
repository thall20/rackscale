-- =============================================================================
-- Migration: Add Facility Constraints output columns to scenario_results
-- Safe to run multiple times — all statements use ADD COLUMN IF NOT EXISTS.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1. Total usable floor area made available for this scenario (sq ft)
alter table public.scenario_results
  add column if not exists total_available_sqft numeric(10,2);

-- 2. Estimated physical footprint of all racks (sq ft)
alter table public.scenario_results
  add column if not exists estimated_rack_footprint_sqft numeric(10,2);

-- 3. Rack footprint as a percentage of available floor area (0–100+)
alter table public.scenario_results
  add column if not exists space_utilization_percent numeric(6,2);

-- 4. Physical fit assessment (check constraint added safely below)
alter table public.scenario_results
  add column if not exists physical_fit_status text;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema    = 'public'
      and table_name      = 'scenario_results'
      and constraint_name = 'scenario_results_physical_fit_status_check'
  ) then
    alter table public.scenario_results
      add constraint scenario_results_physical_fit_status_check
        check (physical_fit_status in (
          'Good Fit',
          'Review Recommended',
          'High Risk',
          'Not Evaluated'
        ));
  end if;
end;
$$;

-- 5. Structured facility risk messages (array of message objects)
alter table public.scenario_results
  add column if not exists facility_risk_messages jsonb not null default '[]'::jsonb;

-- 6. Column comments
comment on column public.scenario_results.total_available_sqft          is 'Total usable floor area available for this scenario (sq ft). Null when facility constraints are disabled.';
comment on column public.scenario_results.estimated_rack_footprint_sqft  is 'Estimated physical footprint of all racks including spacing (sq ft). Null when facility constraints are disabled.';
comment on column public.scenario_results.space_utilization_percent       is 'Rack footprint as a percentage of available floor area. Null when facility constraints are disabled.';
comment on column public.scenario_results.physical_fit_status             is 'Physical fit assessment: Good Fit | Review Recommended | High Risk | Not Evaluated.';
comment on column public.scenario_results.facility_risk_messages          is 'Array of facility-specific risk message objects generated during calculation.';
