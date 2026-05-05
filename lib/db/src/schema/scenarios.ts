import { pgTable, text, uuid, integer, real, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const scenariosTable = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  rackCount: integer("rack_count").notNull().default(1),
  avgKwPerRack: real("avg_kw_per_rack").notNull().default(5),
  coolingType: text("cooling_type", { enum: ["air", "liquid", "hybrid"] }).notNull().default("air"),
  redundancyLevel: text("redundancy_level", { enum: ["N", "N+1", "2N"] }).notNull().default("N+1"),
  pueTarget: real("pue_target").notNull().default(1.4),
  // ── Facility Constraints ─────────────────────────────────────────────────
  facilityConstraintsEnabled: boolean("facility_constraints_enabled").notNull().default(false),
  sqftPerFloor: numeric("sqft_per_floor", { precision: 10, scale: 2 }),
  floorLevel: integer("floor_level"),
  floorsUsed: integer("floors_used"),
  flooringType: text("flooring_type", {
    enum: ["Slab", "Raised Floor", "Structural Grid", "Other"],
  }),
  serverSpacingFt: numeric("server_spacing_ft", { precision: 6, scale: 2 }),
  ceilingHeightFt: numeric("ceiling_height_ft", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScenarioSchema = createInsertSchema(scenariosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenariosTable.$inferSelect;
