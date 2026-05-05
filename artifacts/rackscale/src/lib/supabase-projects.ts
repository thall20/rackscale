import { supabase } from "./supabase";
import type { RiskFlag } from "./calculations";
import type { CompanyPlan, CompanyPlanStatus } from "./plans";

// ── Company ───────────────────────────────────────────────────────────────────

export type Company = {
  id: string;
  name: string;
  domain: string | null;
  plan: CompanyPlan;
  plan_status: CompanyPlanStatus;
  /** Max scenarios allowed. -1 = unlimited. */
  scenario_limit: number;
  created_at: string;
  updated_at: string;
};

export async function getCompany(companyId: string): Promise<Company> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, domain, plan, plan_status, scenario_limit, created_at, updated_at")
    .eq("id", companyId)
    .single();
  if (error) throw new Error(error.message);
  return data as Company;
}

export type Project = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: "active" | "archived" | "draft";
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type FlooringType = "Slab" | "Raised Floor" | "Structural Grid" | "Other";

export type Scenario = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  rack_count: number;
  avg_power_per_rack_kw: number;
  pue_target: number;
  power_cost_per_kwh: number;
  cooling_type: "air" | "liquid" | "hybrid";
  redundancy_level: string;
  growth_buffer_pct: number;
  utility_feed: "single" | "dual";
  ups_type: "centralized" | "distributed";
  containment_type: "none" | "hot_aisle" | "cold_aisle";
  cost_per_mw: number;
  cost_per_rack: number;
  // ── Facility Constraints (nullable — added post-launch) ───────────────────
  facility_constraints_enabled: boolean;
  sqft_per_floor: number | null;
  floor_level: number | null;
  floors_used: number | null;
  flooring_type: FlooringType | null;
  server_spacing_ft: number | null;
  ceiling_height_ft: number | null;
  created_at: string;
  updated_at: string;
};

export type PhysicalFitStatus =
  | "Good Fit"
  | "Review Recommended"
  | "High Risk"
  | "Not Evaluated";

export type FacilityRiskMessage = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

export type ScenarioResultRow = {
  id: string;
  scenario_id: string;
  total_it_load_kw: number;
  total_power_draw_kw: number;
  cooling_capacity_required_kw: number;
  estimated_annual_cost_usd: number;
  carbon_footprint_mt_co2: number;
  efficiency_rating: string | null;
  risk_flags: RiskFlag[];
  overall_risk_level: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
  // ── Facility Constraints outputs (nullable — added post-launch) ───────────
  total_available_sqft: number | null;
  estimated_rack_footprint_sqft: number | null;
  space_utilization_percent: number | null;
  physical_fit_status: PhysicalFitStatus | null;
  facility_risk_messages: FacilityRiskMessage[];
};

export type ScenarioWithResult = Scenario & {
  scenario_results: ScenarioResultRow | null;
};

export type CreateProjectInput = {
  name: string;
  description?: string;
  location?: string;
  status: "active" | "draft" | "archived";
  company_id: string;
};

export type CreateScenarioInput = {
  project_id: string;
  name: string;
  description?: string;
  rack_count: number;
  avg_power_per_rack_kw: number;
  pue_target: number;
  power_cost_per_kwh?: number;
  cooling_type: "air" | "liquid" | "hybrid";
  redundancy_level: string;
  growth_buffer_pct: number;
  utility_feed: "single" | "dual";
  ups_type: "centralized" | "distributed";
  containment_type: "none" | "hot_aisle" | "cold_aisle";
  cost_per_mw: number;
  cost_per_rack: number;
  // ── Facility Constraints (all optional) ──────────────────────────────────
  facility_constraints_enabled?: boolean;
  sqft_per_floor?: number | null;
  floor_level?: number | null;
  floors_used?: number | null;
  flooring_type?: FlooringType | null;
  server_spacing_ft?: number | null;
  ceiling_height_ft?: number | null;
};

export type CreateScenarioResultInput = {
  scenario_id: string;
  total_it_load_kw: number;
  total_power_draw_kw: number;
  cooling_capacity_required_kw: number;
  estimated_annual_cost_usd: number;
  carbon_footprint_mt_co2: number;
  efficiency_rating: string;
  risk_flags: RiskFlag[];
  overall_risk_level: "low" | "medium" | "high" | "critical";
  // ── Facility Constraints outputs (all optional) ───────────────────────────
  total_available_sqft?: number | null;
  estimated_rack_footprint_sqft?: number | null;
  space_utilization_percent?: number | null;
  physical_fit_status?: PhysicalFitStatus | null;
  facility_risk_messages?: FacilityRiskMessage[];
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await client()
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Project[]) ?? [];
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await client()
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data, error } = await client()
    .from("projects")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export async function listScenarios(projectId: string): Promise<Scenario[]> {
  const { data, error } = await client()
    .from("scenarios")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Scenario[]) ?? [];
}

export async function createScenario(input: CreateScenarioInput): Promise<Scenario> {
  const { data, error } = await client()
    .from("scenarios")
    .insert({ ...input, power_cost_per_kwh: input.power_cost_per_kwh ?? 0.10 })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Scenario;
}

export async function createScenarioResult(
  input: CreateScenarioResultInput
): Promise<ScenarioResultRow> {
  const { data, error } = await client()
    .from("scenario_results")
    .upsert(
      { ...input, calculated_at: new Date().toISOString() },
      { onConflict: "scenario_id" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ScenarioResultRow;
}

export type ScenarioWithProjectName = Scenario & {
  projects: { id: string; name: string } | null;
};

export async function listAllScenariosWithProject(
  limit = 20
): Promise<ScenarioWithProjectName[]> {
  const { data, error } = await client()
    .from("scenarios")
    .select("*, projects(id, name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as ScenarioWithProjectName[]) ?? [];
}

export async function getScenarioWithResult(
  _projectId: string,
  scenarioId: string
): Promise<ScenarioWithResult> {
  const { data, error } = await client()
    .from("scenarios")
    .select("*, scenario_results(*)")
    .eq("id", scenarioId)
    .single();
  if (error) throw new Error(error.message);
  const row = data as Scenario & { scenario_results: ScenarioResultRow[] | null };
  return {
    ...row,
    scenario_results: Array.isArray(row.scenario_results)
      ? (row.scenario_results[0] ?? null)
      : row.scenario_results,
  };
}
