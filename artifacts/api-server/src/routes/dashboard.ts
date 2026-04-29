import { Router, type IRouter } from "express";
import { db, projectsTable, scenariosTable } from "@workspace/db";
import { computeScenarioResults } from "../lib/calculations";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const scenarios = await db.select().from(scenariosTable);

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalScenarios = scenarios.length;

  let totalItLoadKw = 0;
  let criticalRiskCount = 0;
  let totalPue = 0;

  for (const s of scenarios) {
    const results = computeScenarioResults(
      s.rackCount,
      s.avgKwPerRack,
      s.coolingType as "air" | "liquid" | "hybrid",
      s.redundancyLevel as "N" | "N+1" | "2N",
      s.pueTarget
    );
    totalItLoadKw += results.totalItLoad;
    criticalRiskCount += results.riskFlags.filter((f) => f.level === "critical").length;
    totalPue += s.pueTarget;
  }

  const avgPue = scenarios.length > 0 ? totalPue / scenarios.length : 0;

  res.json({
    totalProjects,
    activeProjects,
    totalScenarios,
    totalItLoadKw: Math.round(totalItLoadKw * 100) / 100,
    criticalRiskCount,
    avgPue: Math.round(avgPue * 100) / 100,
  });
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const recentProjects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.createdAt))
    .limit(5);

  const recentScenarios = await db
    .select({
      id: scenariosTable.id,
      name: scenariosTable.name,
      projectId: scenariosTable.projectId,
      createdAt: scenariosTable.createdAt,
      updatedAt: scenariosTable.updatedAt,
    })
    .from(scenariosTable)
    .orderBy(desc(scenariosTable.updatedAt))
    .limit(5);

  const projectMap = new Map(recentProjects.map((p) => [p.id, p.name]));

  const projectActivity = recentProjects.map((p) => ({
    id: `project-created-${p.id}`,
    type: "project_created" as const,
    message: `Project "${p.name}" was created`,
    projectId: p.id,
    projectName: p.name,
    timestamp: p.createdAt.toISOString(),
  }));

  const scenarioActivity = recentScenarios.map((s) => ({
    id: `scenario-${s.id}`,
    type: "scenario_created" as const,
    message: `Scenario "${s.name}" was added`,
    projectId: s.projectId,
    projectName: projectMap.get(s.projectId) ?? "Unknown Project",
    timestamp: s.updatedAt.toISOString(),
  }));

  const allActivity = [...projectActivity, ...scenarioActivity]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  res.json(allActivity);
});

router.get("/dashboard/risk-summary", async (_req, res): Promise<void> => {
  const scenarios = await db.select().from(scenariosTable);

  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  const allRisks: Array<{
    level: "low" | "medium" | "high" | "critical";
    category: "power" | "cooling" | "capacity" | "redundancy";
    message: string;
    recommendation: string;
  }> = [];

  for (const s of scenarios) {
    const results = computeScenarioResults(
      s.rackCount,
      s.avgKwPerRack,
      s.coolingType as "air" | "liquid" | "hybrid",
      s.redundancyLevel as "N" | "N+1" | "2N",
      s.pueTarget
    );
    for (const risk of results.riskFlags) {
      if (risk.level === "critical") critical++;
      else if (risk.level === "high") high++;
      else if (risk.level === "medium") medium++;
      else low++;
      allRisks.push(risk);
    }
  }

  const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const topRisks = allRisks
    .sort((a, b) => levelOrder[a.level] - levelOrder[b.level])
    .slice(0, 5);

  res.json({ critical, high, medium, low, topRisks });
});

export default router;
