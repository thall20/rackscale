import { Router, type IRouter } from "express";
import { eq, count, ilike, and } from "drizzle-orm";
import { db, projectsTable, scenariosTable } from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  ListProjectsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let whereClause = undefined;
  if (query.data.search) {
    whereClause = ilike(projectsTable.name, `%${query.data.search}%`);
  }
  if (query.data.status) {
    const statusFilter = eq(projectsTable.status, query.data.status);
    whereClause = whereClause ? and(whereClause, statusFilter) : statusFilter;
  }

  const projects = await db
    .select()
    .from(projectsTable)
    .where(whereClause)
    .orderBy(projectsTable.createdAt);

  const scenarioCounts = await db
    .select({
      projectId: scenariosTable.projectId,
      count: count(),
    })
    .from(scenariosTable)
    .groupBy(scenariosTable.projectId);

  const countMap = new Map(scenarioCounts.map((s) => [s.projectId, Number(s.count)]));

  const result = projects.map((p) => ({
    ...p,
    scenarioCount: countMap.get(p.id) ?? 0,
  }));

  res.json(result);
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.insert(projectsTable).values(parsed.data).returning();
  res.status(201).json({ ...project, scenarioCount: 0 });
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [scenarioCount] = await db
    .select({ count: count() })
    .from(scenariosTable)
    .where(eq(scenariosTable.projectId, project.id));

  res.json({ ...project, scenarioCount: Number(scenarioCount?.count ?? 0) });
});

router.put("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [scenarioCount] = await db
    .select({ count: count() })
    .from(scenariosTable)
    .where(eq(scenariosTable.projectId, project.id));

  res.json({ ...project, scenarioCount: Number(scenarioCount?.count ?? 0) });
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
