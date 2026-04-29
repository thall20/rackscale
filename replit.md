# RackScale Workspace

## Overview

RackScale is a SaaS web app for data center designers to model rack density, calculate power/cooling requirements, compare scenarios, and view risk flags.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + wouter (routing)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: localStorage-based (simulated auth, upgrade to Supabase/Clerk when ready)

## Features

- Landing page (marketing)
- Login / Sign Up (localStorage auth)
- Dashboard with stats, activity feed, risk summary
- Projects CRUD (list, create, detail)
- Scenarios CRUD (list, create, results view)
- Scenario comparison (side-by-side)
- Settings page
- Power/cooling calculation engine with risk flag detection

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Architecture

```
artifacts/
  api-server/          # Express 5 API server
    src/routes/
      projects.ts      # Projects CRUD
      scenarios.ts     # Scenarios CRUD + comparison
      dashboard.ts     # Dashboard stats, activity, risk summary
    src/lib/
      calculations.ts  # Power/cooling calculation engine + risk flags
  rackscale/           # React + Vite frontend (preview path: /)
    src/pages/         # All pages
    src/components/    # Shared components (SidebarLayout, etc.)

lib/
  api-spec/openapi.yaml  # OpenAPI spec (source of truth)
  api-client-react/      # Generated React Query hooks
  api-zod/               # Generated Zod validation schemas
  db/src/schema/
    projects.ts          # Projects table
    scenarios.ts         # Scenarios table
```

## Calculation Engine

The calculation engine (`artifacts/api-server/src/lib/calculations.ts`) computes:
- Total IT load (kW) = rackCount × avgKwPerRack
- Total power draw (kW) = totalItLoad × PUE
- Cooling capacity required (kW) = totalItLoad × (PUE - 1)
- Annual cost (USD) = totalPowerDraw × 8760h × $0.10/kWh
- CO2 emissions (kg/yr) = totalPowerDraw × 8760h × 0.42 kg/kWh
- Risk flags: auto-detected from density, PUE, redundancy, and capacity thresholds

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
