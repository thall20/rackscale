// ── Plan tier definitions ────────────────────────────────────────────────────

/** Title-case plan name stored in the companies.plan DB column */
export type CompanyPlan = "Free" | "Pro" | "Team" | "Enterprise";

/** Billing status stored in the companies.plan_status DB column */
export type CompanyPlanStatus = "active" | "trialing" | "past_due" | "canceled";

/** Lowercase id used internally in the UI / legacy localStorage */
export type PlanId = "free" | "pro" | "team" | "enterprise";

export type PlanTier = {
  id: PlanId;
  dbValue: CompanyPlan;
  name: string;
  price: string;
  priceNote: string;
  scenarioLimit: number | null;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

export const PLANS: PlanTier[] = [
  {
    id: "free",
    dbValue: "Free",
    name: "Free",
    price: "$0",
    priceNote: "forever",
    scenarioLimit: 3,
    features: [
      "Up to 3 scenarios",
      "All calculation engines",
      "Risk analysis",
      "Export report (preview)",
    ],
    cta: "Current Plan",
  },
  {
    id: "pro",
    dbValue: "Pro",
    name: "Pro",
    price: "$99",
    priceNote: "per month",
    scenarioLimit: null,
    highlighted: true,
    features: [
      "Unlimited scenarios",
      "All Free features",
      "PDF export",
      "Scenario comparison history",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
  },
  {
    id: "team",
    dbValue: "Team",
    name: "Team",
    price: "$299",
    priceNote: "per month",
    scenarioLimit: null,
    features: [
      "Everything in Pro",
      "Multi-user company access",
      "Role-based permissions",
      "Audit log",
      "Dedicated onboarding",
    ],
    cta: "Upgrade to Team",
  },
  {
    id: "enterprise",
    dbValue: "Enterprise",
    name: "Enterprise",
    price: "Custom",
    priceNote: "contact us",
    scenarioLimit: null,
    features: [
      "Everything in Team",
      "Custom SLA",
      "Dedicated infrastructure",
      "Custom integrations",
      "Account manager",
    ],
    cta: "Contact Sales",
  },
];

export const FREE_SCENARIO_LIMIT = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a DB plan value ("Free") to the UI PlanId ("free") */
export function dbPlanToId(dbPlan: CompanyPlan): PlanId {
  return dbPlan.toLowerCase() as PlanId;
}

/** Convert a UI PlanId ("free") to the DB plan value ("Free") */
export function idToDbPlan(id: PlanId): CompanyPlan {
  return (id.charAt(0).toUpperCase() + id.slice(1)) as CompanyPlan;
}

export function getPlanTier(id: PlanId): PlanTier {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function getPlanTierByDbValue(dbPlan: CompanyPlan): PlanTier {
  return PLANS.find((p) => p.dbValue === dbPlan) ?? PLANS[0];
}

/**
 * Returns true when the scenario count has reached the company's DB-stored
 * scenario_limit. Pass -1 for unlimited.
 */
export function isAtScenarioLimit(scenarioLimit: number, scenarioCount: number): boolean {
  if (scenarioLimit < 0) return false;
  return scenarioCount >= scenarioLimit;
}

// ── Legacy localStorage shim (kept for backward compat until Stripe) ─────────

const STORAGE_KEY = "rackscale_plan";

export function getCurrentPlan(): PlanId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "pro" || stored === "team" || stored === "enterprise") return stored;
  } catch {
    // ignore
  }
  return "free";
}
