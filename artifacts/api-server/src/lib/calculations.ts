const ELECTRICITY_COST_PER_KWH = 0.10;
const HOURS_PER_YEAR = 8760;
const CO2_KG_PER_KWH = 0.42;
const SQFT_PER_RACK = 14;

export type RiskFlag = {
  level: "low" | "medium" | "high" | "critical";
  category: "power" | "cooling" | "capacity" | "redundancy";
  message: string;
  recommendation: string;
};

export type ScenarioResults = {
  totalItLoad: number;
  totalPowerDraw: number;
  coolingCapacityRequired: number;
  estimatedAnnualCost: number;
  powerDensityKwPerSqft: number;
  co2EmissionsKgPerYear: number;
  riskFlags: RiskFlag[];
};

export function computeScenarioResults(
  rackCount: number,
  avgKwPerRack: number,
  coolingType: "air" | "liquid" | "hybrid",
  redundancyLevel: "N" | "N+1" | "2N",
  pueTarget: number
): ScenarioResults {
  const totalItLoad = rackCount * avgKwPerRack;
  const totalPowerDraw = totalItLoad * pueTarget;
  const coolingCapacityRequired = totalItLoad * (pueTarget - 1);
  const estimatedAnnualCost = totalPowerDraw * HOURS_PER_YEAR * ELECTRICITY_COST_PER_KWH;
  const totalSqft = rackCount * SQFT_PER_RACK;
  const powerDensityKwPerSqft = totalItLoad / totalSqft;
  const co2EmissionsKgPerYear = totalPowerDraw * HOURS_PER_YEAR * CO2_KG_PER_KWH;

  const riskFlags: RiskFlag[] = [];

  if (avgKwPerRack > 20 && coolingType === "air") {
    riskFlags.push({
      level: "critical",
      category: "cooling",
      message: `Average rack density of ${avgKwPerRack}kW/rack exceeds air cooling limits`,
      recommendation: "Switch to liquid or hybrid cooling for densities above 20kW/rack",
    });
  } else if (avgKwPerRack > 15 && coolingType === "air") {
    riskFlags.push({
      level: "high",
      category: "cooling",
      message: `Average rack density of ${avgKwPerRack}kW/rack is at the upper limit for air cooling`,
      recommendation: "Consider hybrid cooling or increased airflow infrastructure",
    });
  }

  if (pueTarget > 2.0) {
    riskFlags.push({
      level: "high",
      category: "power",
      message: `PUE of ${pueTarget} is significantly above industry average (1.5)`,
      recommendation: "Optimize cooling systems and power distribution to reduce PUE",
    });
  } else if (pueTarget > 1.6) {
    riskFlags.push({
      level: "medium",
      category: "power",
      message: `PUE of ${pueTarget} is above the recommended target of 1.5`,
      recommendation: "Review cooling infrastructure efficiency",
    });
  }

  if (redundancyLevel === "N" && totalItLoad > 500) {
    riskFlags.push({
      level: "high",
      category: "redundancy",
      message: "No redundancy (N) for a high-load environment exceeding 500kW IT load",
      recommendation: "Upgrade to N+1 or 2N redundancy to protect critical workloads",
    });
  }

  if (powerDensityKwPerSqft > 2) {
    riskFlags.push({
      level: "medium",
      category: "capacity",
      message: `High floor power density of ${powerDensityKwPerSqft.toFixed(2)}kW/sqft`,
      recommendation: "Review floor load ratings and power distribution architecture",
    });
  }

  if (totalItLoad > 5000) {
    riskFlags.push({
      level: "medium",
      category: "capacity",
      message: "Total IT load exceeds 5MW — hyperscale considerations apply",
      recommendation: "Review utility supply agreements, backup generation, and water usage",
    });
  }

  return {
    totalItLoad: Math.round(totalItLoad * 100) / 100,
    totalPowerDraw: Math.round(totalPowerDraw * 100) / 100,
    coolingCapacityRequired: Math.round(coolingCapacityRequired * 100) / 100,
    estimatedAnnualCost: Math.round(estimatedAnnualCost),
    powerDensityKwPerSqft: Math.round(powerDensityKwPerSqft * 1000) / 1000,
    co2EmissionsKgPerYear: Math.round(co2EmissionsKgPerYear),
    riskFlags,
  };
}
