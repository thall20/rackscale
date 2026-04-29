// ── Plan tier definitions ────────────────────────────────────────────────────

export type PlanId = "free" | "pro" | "team";

export type PlanTier = {
  id: PlanId;
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
];

export const FREE_SCENARIO_LIMIT = 3;

// ── Plan hook (localStorage placeholder until Stripe) ────────────────────────

const STORAGE_KEY = "rackscale_plan";

export function getCurrentPlan(): PlanId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "pro" || stored === "team") return stored;
  } catch {
    // ignore
  }
  return "free";
}

export function getPlanTier(id: PlanId): PlanTier {
  return PLANS.find((p) => p.id === id)!;
}

export function isAtScenarioLimit(plan: PlanId, scenarioCount: number): boolean {
  const tier = getPlanTier(plan);
  if (tier.scenarioLimit === null) return false;
  return scenarioCount >= tier.scenarioLimit;
}
