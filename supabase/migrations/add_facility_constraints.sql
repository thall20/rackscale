-- =============================================================================
-- Migration: Add Facility Constraints columns to scenarios
-- Safe to run multiple times — all statements use ADD COLUMN IF NOT EXISTS.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1. Master toggle — false by default so all existing scenarios are unaffected
alter table public.scenarios
  add column if not exists facility_constraints_enabled boolean not null default false;

-- 2. Floor space
alter table public.scenarios
  add column if not exists sqft_per_floor numeric(10,2);

-- 3. Floor position (which floor the data hall sits on, e.g. 1 = ground)
alter table public.scenarios
  add column if not exists floor_level integer;

-- 4. Number of floors used by this scenario
alter table public.scenarios
  add column if not exists floors_used integer;

-- 5. Flooring type (check constraint added safely below)
alter table public.scenarios
  add column if not exists flooring_type text;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema    = 'public'
      and table_name      = 'scenarios'
      and constraint_name = 'scenarios_flooring_type_check'
  ) then
    alter table public.scenarios
      add constraint scenarios_flooring_type_check
        check (flooring_type in ('Slab', 'Raised Floor', 'Structural Grid', 'Other'));
  end if;
end;
$$;

-- 6. Server row spacing (feet)
alter table public.scenarios
  add column if not exists server_spacing_ft numeric(6,2);

-- 7. Ceiling height (feet)
alter table public.scenarios
  add column if not exists ceiling_height_ft numeric(6,2);

-- 8. Column comments
comment on column public.scenarios.facility_constraints_enabled is 'When true, facility constraint fields are active and used in validation.';
comment on column public.scenarios.sqft_per_floor               is 'Usable square footage per floor (sq ft).';
comment on column public.scenarios.floor_level                   is 'Floor number where the data hall is located (1 = ground floor).';
comment on column public.scenarios.floors_used                   is 'Number of floors occupied by this scenario.';
comment on column public.scenarios.flooring_type                 is 'Floor construction type: Slab | Raised Floor | Structural Grid | Other.';
comment on column public.scenarios.server_spacing_ft             is 'Minimum aisle / server row spacing in feet.';
comment on column public.scenarios.ceiling_height_ft             is 'Clear ceiling height in feet.';
