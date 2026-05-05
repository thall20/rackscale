import type { CompanyPlan } from "./plans";

/** Normalise any falsy / unknown value to "Free" so all checks are null-safe. */
function resolve(plan: CompanyPlan | null | undefined): CompanyPlan {
  if (plan === "Pro" || plan === "Team" || plan === "Enterprise") return plan;
  return "Free";
}

/** Edit Scenario: Pro, Team, Enterprise */
export function canEditScenario(plan: CompanyPlan | null | undefined): boolean {
  const p = resolve(plan);
  return p === "Pro" || p === "Team" || p === "Enterprise";
}

/** Facility Constraints: Pro, Team, Enterprise */
export function canUseFacilityConstraints(plan: CompanyPlan | null | undefined): boolean {
  const p = resolve(plan);
  return p === "Pro" || p === "Team" || p === "Enterprise";
}

/** Full Scenario Comparison: Pro, Team, Enterprise */
export function canUseFullScenarioComparison(plan: CompanyPlan | null | undefined): boolean {
  const p = resolve(plan);
  return p === "Pro" || p === "Team" || p === "Enterprise";
}

/** Report Export (PDF): Pro, Team, Enterprise */
export function canUseReportExport(plan: CompanyPlan | null | undefined): boolean {
  const p = resolve(plan);
  return p === "Pro" || p === "Team" || p === "Enterprise";
}

/** Team Workspace (multi-user, roles): Team, Enterprise */
export function canUseTeamWorkspace(plan: CompanyPlan | null | undefined): boolean {
  const p = resolve(plan);
  return p === "Team" || p === "Enterprise";
}

/** Workflow Integrations: Enterprise only */
export function canUseWorkflowIntegrations(plan: CompanyPlan | null | undefined): boolean {
  return resolve(plan) === "Enterprise";
}

/**
 * Max scenarios for a given plan.
 * Returns null for unlimited (Pro / Team / Enterprise).
 * Returns 3 for Free or any unknown plan.
 */
export function getScenarioLimit(plan: CompanyPlan | null | undefined): number | null {
  const p = resolve(plan);
  if (p === "Pro" || p === "Team" || p === "Enterprise") return null;
  return 3;
}
