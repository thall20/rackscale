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
import { getSupabaseAdmin } from "../lib/supabase-admin";

const FREE_SCENARIO_LIMIT = 3;

/**
 * Enforce plan-based scenario limits.
 * Returns an error string when the request should be blocked, null otherwise.
 * Requires a valid Supabase Bearer token in the Authorization header.
 */
async function checkScenarioLimit(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null; // no token → skip (handled by Supabase RLS)
  const token = authHeader.slice(7);

  const admin = getSupabaseAdmin();

  // 1. Verify token
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return null; // invalid token → let Supabase RLS handle it

  // 2. Get company_id via profile
  const { data: profile } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .maybeSingle() as { data: { company_id: string } | null };
  if (!profile?.company_id) return null;

  // 3. Get company plan
  const { data: company } = await admin
    .from("companies")
    .select("plan, scenario_limit")
    .eq("id", profile.company_id)
    .maybeSingle() as { data: { plan: string; scenario_limit: number } | null };
  if (!company) return null;

  // 4. Paid plans have no limit
  if (company.plan !== "Free") return null;

  // 5. Count existing scenarios for this company (via projects)
  const { count } = await admin
    .from("scenarios")
    .select("id", { count: "exact", head: true })
    .in(
      "project_id",
      (await admin.from("projects").select("id").eq("company_id", profile.company_id)).data?.map((p: { id: string }) => p.id) ?? []
    ) as { count: number | null };

  const limit = company.scenario_limit ?? FREE_SCENARIO_LIMIT;
  if ((count ?? 0) >= limit) {
    return `You've reached the Free plan limit of ${limit} scenarios. Upgrade to Pro to create unlimited scenarios and unlock advanced design validation.`;
  }
  return null;
}

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

  // Plan-based limit enforcement
  const limitError = await checkScenarioLimit(req.headers.authorization);
  if (limitError) {
    res.status(403).json({ error: limitError });
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
