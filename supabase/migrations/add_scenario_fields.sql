-- =============================================================================
-- Migration: Add extended scenario input fields
-- Run this in the Supabase SQL Editor if you already applied schema.sql
-- =============================================================================

alter table public.scenarios
  add column if not exists growth_buffer_pct  numeric(5,2)  not null default 20,
  add column if not exists utility_feed       text          not null default 'dual'
    check (utility_feed in ('single', 'dual')),
  add column if not exists ups_type           text          not null default 'centralized'
    check (ups_type in ('centralized', 'distributed')),
  add column if not exists containment_type   text          not null default 'none'
    check (containment_type in ('none', 'hot_aisle', 'cold_aisle')),
  add column if not exists cost_per_mw        numeric(14,2) not null default 0,
  add column if not exists cost_per_rack      numeric(12,2) not null default 0;

comment on column public.scenarios.growth_buffer_pct is 'Capacity growth buffer applied on top of base IT load (0–100 %).';
comment on column public.scenarios.utility_feed      is 'Utility feed topology: single | dual.';
comment on column public.scenarios.ups_type          is 'UPS architecture: centralized | distributed.';
comment on column public.scenarios.containment_type  is 'Aisle containment strategy: none | hot_aisle | cold_aisle.';
comment on column public.scenarios.cost_per_mw       is 'CapEx cost per MW of IT load (USD).';
comment on column public.scenarios.cost_per_rack     is 'CapEx cost per rack (USD).';
