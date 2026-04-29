export type RedundancyType = "N" | "N+1" | "2N";
export type CoolingType = "air" | "hybrid" | "liquid";
export type RiskLevel = "High Risk" | "Medium Risk" | "Cost Risk" | "Planning Risk" | "Valid Design";

export type ScenarioInput = {
  rackCount: number;
  kwPerRack: number;
  growthBufferPercent: number;
  redundancyType: RedundancyType;
  coolingType: CoolingType;
  costPerMw: number;
  costPerRack: number;
};

export type ScenarioOutput = {
  itLoadKw: number;
  growthAdjustedKw: number;
  totalLoadKw: number;
  totalMw: number;
  coolingTons: number;
  estimatedCost: number;
  designHealthScore: number;
  riskLevel: RiskLevel;
  riskMessages: string[];
  recommendation: string;
};

const REDUNDANCY_MULTIPLIERS: Record<RedundancyType, number> = {
  N: 1,
  "N+1": 1.25,
  "2N": 2,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateScenario(input: ScenarioInput): ScenarioOutput {
  const {
    rackCount,
    kwPerRack,
    growthBufferPercent,
    redundancyType,
    coolingType,
    costPerMw,
    costPerRack,
  } = input;

  // ── Core calculations ────────────────────────────────────────────────────
  const itLoadKw = round2(rackCount * kwPerRack);
  const growthAdjustedKw = round2(itLoadKw * (1 + growthBufferPercent / 100));
  const redundancyMultiplier = REDUNDANCY_MULTIPLIERS[redundancyType];
  const totalLoadKw = round2(growthAdjustedKw * redundancyMultiplier);
  const totalMw = round2(totalLoadKw / 1000);
  const coolingTons = round2(growthAdjustedKw / 3.517);
  const estimatedCost = Math.round(totalMw * costPerMw + rackCount * costPerRack);

  // ── Risk evaluation ──────────────────────────────────────────────────────
  const riskMessages: string[] = [];
  let riskLevel: RiskLevel = "Valid Design";

  if (coolingType === "air" && kwPerRack > 20) {
    riskLevel = "High Risk";
    riskMessages.push(
      `Air cooling cannot reliably support ${kwPerRack} kW/rack — exceeds the 20 kW/rack limit.`
    );
  }

  if (coolingType === "hybrid" && kwPerRack > 50) {
    if (riskLevel !== "High Risk") riskLevel = "Medium Risk";
    riskMessages.push(
      `Hybrid cooling at ${kwPerRack} kW/rack exceeds the recommended 50 kW/rack ceiling.`
    );
  }

  if (coolingType === "liquid" && kwPerRack < 20) {
    if (riskLevel === "Valid Design") riskLevel = "Cost Risk";
    riskMessages.push(
      `Liquid cooling at ${kwPerRack} kW/rack is cost-inefficient — consider air cooling below 20 kW/rack.`
    );
  }

  if (growthBufferPercent < 10) {
    if (riskLevel === "Valid Design") riskLevel = "Planning Risk";
    riskMessages.push(
      `Growth buffer of ${growthBufferPercent}% is below the recommended 10% minimum, limiting future headroom.`
    );
  }

  // ── Design health score ──────────────────────────────────────────────────
  let designHealthScore = 100;

  if (riskLevel === "High Risk") designHealthScore -= 25;
  if (riskLevel === "Medium Risk") designHealthScore -= 15;
  if (riskLevel === "Cost Risk") designHealthScore -= 10;
  if (growthBufferPercent < 10) designHealthScore -= 15;
  if (redundancyType === "2N") designHealthScore -= 10;

  designHealthScore = Math.max(0, designHealthScore);

  // ── Recommendation ───────────────────────────────────────────────────────
  let recommendation: string;

  if (riskLevel === "High Risk") {
    recommendation =
      "Switch to liquid or hybrid cooling — air cooling cannot handle this rack density. Re-evaluate before proceeding.";
  } else if (riskLevel === "Medium Risk") {
    recommendation =
      "Hybrid cooling is nearing its density limit. Consider moving to direct liquid cooling to maintain headroom.";
  } else if (riskLevel === "Cost Risk") {
    recommendation =
      "Liquid cooling at this density adds capital cost without thermal necessity. Air or hybrid cooling is more cost-effective here.";
  } else if (riskLevel === "Planning Risk") {
    recommendation =
      "Increase the growth buffer to at least 10–20% to avoid capacity constraints during scaling phases.";
  } else if (redundancyType === "2N") {
    recommendation =
      "Design is valid but 2N redundancy doubles infrastructure cost. Confirm business-continuity requirements justify the investment.";
  } else {
    recommendation =
      "Design is within all engineering tolerances. Proceed with detailed infrastructure planning.";
  }

  return {
    itLoadKw,
    growthAdjustedKw,
    totalLoadKw,
    totalMw,
    coolingTons,
    estimatedCost,
    designHealthScore,
    riskLevel,
    riskMessages,
    recommendation,
  };
}
