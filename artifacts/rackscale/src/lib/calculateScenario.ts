export type RedundancyType = "N" | "N+1" | "2N";
export type CoolingType = "air" | "hybrid" | "liquid";
export type RiskLevel = "High Risk" | "Medium Risk" | "Cost Risk" | "Planning Risk" | "Valid Design";
export type FlooringType = "Slab" | "Raised Floor" | "Structural Grid" | "Other";
export type PhysicalFitStatus = "Good Fit" | "Review Recommended" | "High Risk" | "Not Evaluated";
export type FacilityRiskMessage = { level: "info" | "warning" | "critical"; message: string };

export type ScenarioInput = {
  rackCount: number;
  kwPerRack: number;
  growthBufferPercent: number;
  redundancyType: RedundancyType;
  coolingType: CoolingType;
  costPerMw: number;
  costPerRack: number;
  // ── Facility Constraints (all optional) ──────────────────────────────────
  facilityConstraintsEnabled?: boolean;
  sqftPerFloor?: number | null;
  floorLevel?: number | null;
  floorsUsed?: number | null;
  flooringType?: FlooringType | null;
  serverSpacingFt?: number | null;
  ceilingHeightFt?: number | null;
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
  // ── Facility Constraints outputs ─────────────────────────────────────────
  totalAvailableSqft: number | null;
  estimatedRackFootprintSqft: number | null;
  spaceUtilizationPercent: number | null;
  physicalFitStatus: PhysicalFitStatus;
  facilityRiskMessages: FacilityRiskMessage[];
};

const REDUNDANCY_MULTIPLIERS: Record<RedundancyType, number> = {
  N: 1,
  "N+1": 1.25,
  "2N": 2,
};

const RACK_WIDTH_FT = 2;
const RACK_DEPTH_FT = 3;
const DEFAULT_AISLE_FT = 3;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function evaluateFacilityConstraints(
  input: ScenarioInput
): Pick<
  ScenarioOutput,
  | "totalAvailableSqft"
  | "estimatedRackFootprintSqft"
  | "spaceUtilizationPercent"
  | "physicalFitStatus"
  | "facilityRiskMessages"
> {
  const NOT_EVALUATED = {
    totalAvailableSqft: null,
    estimatedRackFootprintSqft: null,
    spaceUtilizationPercent: null,
    physicalFitStatus: "Not Evaluated" as PhysicalFitStatus,
    facilityRiskMessages: [] as FacilityRiskMessage[],
  };

  const {
    facilityConstraintsEnabled,
    sqftPerFloor,
    floorsUsed,
    floorLevel,
    flooringType,
    serverSpacingFt,
    ceilingHeightFt,
    rackCount,
    kwPerRack,
  } = input;

  // Guard: only run when explicitly enabled and all required fields are present.
  // serverSpacingFt is required (not defaulted) because it directly drives the
  // footprint formula and an assumption here would silently skew results.
  if (
    !facilityConstraintsEnabled ||
    !sqftPerFloor ||
    sqftPerFloor <= 0 ||
    !floorsUsed ||
    floorsUsed <= 0 ||
    serverSpacingFt == null ||
    serverSpacingFt <= 0 ||
    !rackCount ||
    rackCount <= 0
  ) {
    return NOT_EVALUATED;
  }

  // ── Space calculations ───────────────────────────────────────────────────
  // NOTE: These are MVP planning assumptions for early-stage feasibility review
  // and do not replace stamped engineering analysis.

  // Total usable floor area across all occupied floors.
  const totalAvailableSqft = Math.round(sqftPerFloor * floorsUsed);

  // Per-rack footprint model: 25 sq ft base (rack body + immediate clearance)
  // plus 4 sq ft per foot of server row spacing (hot/cold aisle contribution).
  const estimatedSqftPerRack = 25 + serverSpacingFt * 4;
  const estimatedRackFootprintSqft = Math.round(rackCount * estimatedSqftPerRack);

  // Space utilization: rack footprint as a percentage of total available area.
  // Rounded to 1 decimal place for display precision.
  const spaceUtilizationPercent =
    Math.round((estimatedRackFootprintSqft / totalAvailableSqft) * 1000) / 10;

  // ── Physical fit status ──────────────────────────────────────────────────
  let physicalFitStatus: PhysicalFitStatus;
  if (spaceUtilizationPercent > 90) {
    physicalFitStatus = "High Risk";
  } else if (spaceUtilizationPercent > 70) {
    physicalFitStatus = "Review Recommended";
  } else {
    physicalFitStatus = "Good Fit";
  }

  // ── Facility risk messages ───────────────────────────────────────────────
  const facilityRiskMessages: FacilityRiskMessage[] = [];

  if (spaceUtilizationPercent > 90) {
    facilityRiskMessages.push({
      level: "critical",
      message: `Rack footprint uses ${spaceUtilizationPercent}% of available floor space — physical fit is infeasible. Reduce rack count or expand floor area.`,
    });
  } else if (spaceUtilizationPercent > 70) {
    facilityRiskMessages.push({
      level: "warning",
      message: `Rack footprint uses ${spaceUtilizationPercent}% of available floor space — limited room for hot/cold aisle clearances and future expansion.`,
    });
  }

  if (flooringType === "Slab" && kwPerRack > 15) {
    facilityRiskMessages.push({
      level: "warning",
      message: `Slab flooring at ${kwPerRack} kW/rack limits under-floor cable management and cooling distribution — raised floor or structural grid is recommended.`,
    });
  }

  if (ceilingHeightFt != null && ceilingHeightFt < 10) {
    facilityRiskMessages.push({
      level: "warning",
      message: `Ceiling height of ${ceilingHeightFt} ft may be insufficient for standard 7 ft racks plus overhead cable tray clearances.`,
    });
  }

  if (floorLevel != null && floorLevel > 1) {
    facilityRiskMessages.push({
      level: "info",
      message: `Scenario is planned for floor level ${floorLevel} — verify structural load capacity for rack weight and power distribution routing.`,
    });
  }

  return {
    totalAvailableSqft,
    estimatedRackFootprintSqft,
    spaceUtilizationPercent,
    physicalFitStatus,
    facilityRiskMessages,
  };
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

  // ── Facility constraints ─────────────────────────────────────────────────
  const facilityOutput = evaluateFacilityConstraints(input);

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
    ...facilityOutput,
  };
}
