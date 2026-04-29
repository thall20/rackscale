import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, scenariosTable } from "@workspace/db";
import {
  CreateScenarioBody,
  UpdateScenarioBody,
  ListScenariosParams,
  GetScenarioParams,
  UpdateScenarioParams,
  DeleteScenarioParams,
  CompareScenariosParams,
  CompareScenariosQueryParams,
} from "@workspace/api-zod";
import { computeScenarioResults } from "../lib/calculations";

const router: IRouter = Router();

function attachResults(s: typeof scenariosTable.$inferSelect) {
  return {
    ...s,
    results: computeScenarioResults(
      s.rackCount,
      s.avgKwPerRack,
      s.coolingType as "air" | "liquid" | "hybrid",
      s.redundancyLevel as "N" | "N+1" | "2N",
      s.pueTarget
    ),
  };
}

router.get("/projects/:projectId/scenarios", async (req, res): Promise<void> => {
  const params = ListScenariosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const scenarios = await db
    .select()
    .from(scenariosTable)
    .where(eq(scenariosTable.projectId, params.data.projectId))
    .orderBy(scenariosTable.createdAt);

  res.json(scenarios);
});

router.post("/projects/:projectId/scenarios", async (req, res): Promise<void> => {
  const params = ListScenariosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateScenarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [scenario] = await db
    .insert(scenariosTable)
    .values({ ...parsed.data, projectId: params.data.projectId })
    .returning();

  res.status(201).json(scenario);
});

router.get("/projects/:projectId/scenarios/:id", async (req, res): Promise<void> => {
  const params = GetScenarioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scenario] = await db
    .select()
    .from(scenariosTable)
    .where(
      and(
        eq(scenariosTable.projectId, params.data.projectId),
        eq(scenariosTable.id, params.data.id)
      )
    );

  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }

  res.json(attachResults(scenario));
});

router.put("/projects/:projectId/scenarios/:id", async (req, res): Promise<void> => {
  const params = UpdateScenarioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateScenarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [scenario] = await db
    .update(scenariosTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(scenariosTable.projectId, params.data.projectId),
        eq(scenariosTable.id, params.data.id)
      )
    )
    .returning();

  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }

  res.json(scenario);
});

router.delete("/projects/:projectId/scenarios/:id", async (req, res): Promise<void> => {
  const params = DeleteScenarioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scenario] = await db
    .delete(scenariosTable)
    .where(
      and(
        eq(scenariosTable.projectId, params.data.projectId),
        eq(scenariosTable.id, params.data.id)
      )
    )
    .returning();

  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/projects/:projectId/compare", async (req, res): Promise<void> => {
  const params = CompareScenariosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = CompareScenariosQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const ids = query.data.ids.split(",").map((id) => id.trim());

  const scenarios = await db
    .select()
    .from(scenariosTable)
    .where(
      and(
        eq(scenariosTable.projectId, params.data.projectId),
        inArray(scenariosTable.id, ids)
      )
    );

  const scenariosWithResults = scenarios.map(attachResults);

  let winner = { scenarioId: scenariosWithResults[0]?.id ?? "", reason: "Only scenario" };
  if (scenariosWithResults.length > 1) {
    const best = scenariosWithResults.reduce((prev, curr) => {
      const prevScore =
        prev.results.estimatedAnnualCost + prev.results.riskFlags.length * 50000;
      const currScore =
        curr.results.estimatedAnnualCost + curr.results.riskFlags.length * 50000;
      return currScore < prevScore ? curr : prev;
    });
    winner = {
      scenarioId: best.id,
      reason: `Lowest combined cost and risk score (annual cost: $${best.results.estimatedAnnualCost.toLocaleString()})`,
    };
  }

  res.json({ projectId: params.data.projectId, scenarios: scenariosWithResults, winner });
});

export default router;
