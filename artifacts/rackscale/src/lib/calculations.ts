const HOURS_PER_YEAR = 8760;
const CO2_KG_PER_KWH = 0.42;
const SQFT_PER_RACK = 14;
const DEFAULT_POWER_COST_PER_KWH = 0.10;

export type RiskFlag = {
  level: "low" | "medium" | "high" | "critical";
  category: "power" | "cooling" | "capacity" | "redundancy";
  message: string;
  recommendation: string;
};

export type ScenarioInput = {
  rackCount: number;
  kwPerRack: number;
  growthBufferPct: number;
  redundancyType: "N" | "N+1" | "2N";
  utilityFeed: "single" | "dual";
  upsType: "centralized" | "distributed";
  coolingType: "air" | "hybrid" | "liquid";
  pueTarget: number;
  containmentType: "none" | "hot_aisle" | "cold_aisle";
  costPerMw: number;
  costPerRack: number;
};

export type ScenarioResult = {
  totalItLoadKw: number;
  totalPowerDrawKw: number;
  coolingCapacityRequiredKw: number;
  estimatedAnnualCostUsd: number;
  carbonFootprintMtCo2: number;
  efficiencyRating: string;
  riskFlags: RiskFlag[];
  overallRiskLevel: "low" | "medium" | "high" | "critical";
};

function round2(n: number) { return Math.round(n * 100) / 100; }

function pueEfficiencyRating(pue: number): string {
  if (pue <= 1.2) return "A+";
  if (pue <= 1.4) return "A";
  if (pue <= 1.6) return "B";
  if (pue <= 2.0) return "C";
  return "D";
}

function worstLevel(flags: RiskFlag[]): "low" | "medium" | "high" | "critical" {
  const order = ["low", "medium", "high", "critical"] as const;
  if (flags.length === 0) return "low";
  return flags.reduce((worst, f) =>
    order.indexOf(f.level) > order.indexOf(worst) ? f.level : worst,
    "low" as "low" | "medium" | "high" | "critical"
  );
}

export function computeScenario(input: ScenarioInput): ScenarioResult {
  const {
    rackCount, kwPerRack, growthBufferPct,
    redundancyType, utilityFeed,
    coolingType, pueTarget, containmentType,
    costPerMw, costPerRack,
  } = input;

  // Apply growth buffer to base IT load
  const growthMultiplier = 1 + growthBufferPct / 100;
  const baseItLoad = rackCount * kwPerRack;
  const totalItLoadKw = round2(baseItLoad * growthMultiplier);
  const totalPowerDrawKw = round2(totalItLoadKw * pueTarget);
  const coolingCapacityRequiredKw = round2(totalItLoadKw * (pueTarget - 1));

  // Containment improves PUE by reducing effective overhead
  const containmentBonus = containmentType === "none" ? 0 : containmentType === "hot_aisle" ? 0.05 : 0.08;
  const effectivePue = Math.max(1.0, pueTarget - containmentBonus);
  const effectivePowerDraw = totalItLoadKw * effectivePue;

  const estimatedAnnualCostUsd = Math.round(
    effectivePowerDraw * HOURS_PER_YEAR * DEFAULT_POWER_COST_PER_KWH
  );
  const carbonFootprintMtCo2 = round2(
    (totalPowerDrawKw * HOURS_PER_YEAR * CO2_KG_PER_KWH) / 1000
  );
  const efficiencyRating = pueEfficiencyRating(pueTarget);

  // ── Risk flags ──────────────────────────────────────────────────────────
  const flags: RiskFlag[] = [];
  const totalSqft = rackCount * SQFT_PER_RACK;
  const powerDensityKwPerSqft = baseItLoad / totalSqft;

  // Cooling risks
  if (kwPerRack > 20 && coolingType === "air") {
    flags.push({
      level: "critical",
      category: "cooling",
      message: `${kwPerRack} kW/rack exceeds the air cooling limit of 20 kW/rack`,
      recommendation: "Switch to liquid or hybrid cooling for densities above 20 kW/rack.",
    });
  } else if (kwPerRack > 15 && coolingType === "air") {
    flags.push({
      level: "high",
      category: "cooling",
      message: `${kwPerRack} kW/rack is at the upper boundary for air cooling`,
      recommendation: "Consider hybrid cooling or increased airflow capacity.",
    });
  }

  if (containmentType === "none" && kwPerRack > 10) {
    flags.push({
      level: "medium",
      category: "cooling",
      message: "No aisle containment configured for medium-to-high density racks",
      recommendation: "Hot-aisle or cold-aisle containment significantly improves cooling efficiency.",
    });
  }

  // PUE / power risks
  if (pueTarget > 2.0) {
    flags.push({
      level: "high",
      category: "power",
      message: `PUE of ${pueTarget} is well above the industry average of 1.5`,
      recommendation: "Optimize cooling and power distribution to reduce PUE.",
    });
  } else if (pueTarget > 1.6) {
    flags.push({
      level: "medium",
      category: "power",
      message: `PUE of ${pueTarget} is above the recommended target of 1.5`,
      recommendation: "Review cooling infrastructure efficiency.",
    });
  }

  // Redundancy risks
  if (redundancyType === "N" && totalItLoadKw > 500) {
    flags.push({
      level: "high",
      category: "redundancy",
      message: "N (no redundancy) is insufficient for a load exceeding 500 kW IT",
      recommendation: "Upgrade to N+1 or 2N to protect critical workloads.",
    });
  }

  if (utilityFeed === "single" && totalItLoadKw > 200) {
    flags.push({
      level: "high",
      category: "redundancy",
      message: "Single utility feed is a single point of failure for this load level",
      recommendation: "Add a second utility feed or size backup generation accordingly.",
    });
  }

  // Capacity risks
  if (powerDensityKwPerSqft > 2) {
    flags.push({
      level: "medium",
      category: "capacity",
      message: `High floor power density: ${powerDensityKwPerSqft.toFixed(2)} kW/sqft`,
      recommendation: "Review floor load ratings and power distribution architecture.",
    });
  }

  if (totalItLoadKw > 5000) {
    flags.push({
      level: "medium",
      category: "capacity",
      message: "Total IT load exceeds 5 MW — hyperscale considerations apply",
      recommendation: "Review utility agreements, backup generation, and water usage effectiveness.",
    });
  }

  if (growthBufferPct > 50) {
    flags.push({
      level: "low",
      category: "capacity",
      message: `Growth buffer of ${growthBufferPct}% adds significant over-provisioning`,
      recommendation: "Validate growth projections against business planning data.",
    });
  }

  // CapEx note (informational, not a risk)
  const totalCapex = (totalItLoadKw / 1000) * costPerMw + rackCount * costPerRack;
  if (totalCapex > 50_000_000) {
    flags.push({
      level: "low",
      category: "capacity",
      message: `Estimated CapEx of $${(totalCapex / 1_000_000).toFixed(1)}M for this configuration`,
      recommendation: "Validate against approved capital budget before proceeding.",
    });
  }

  return {
    totalItLoadKw,
    totalPowerDrawKw,
    coolingCapacityRequiredKw,
    estimatedAnnualCostUsd,
    carbonFootprintMtCo2,
    efficiencyRating,
    riskFlags: flags,
    overallRiskLevel: worstLevel(flags),
  };
}
