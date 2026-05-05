import { useMemo } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { listProjects, listAllScenariosWithProject } from "@/lib/supabase-projects";
import { useAuth } from "@/contexts/useAuth";
import { calculateScenario } from "@/lib/calculateScenario";
import type { ScenarioWithProjectName } from "@/lib/supabase-projects";
import type { RedundancyType, CoolingType, FlooringType } from "@/lib/calculateScenario";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  FolderKanban, Layers, AlertTriangle, Activity,
  Plus, GitCompare, ArrowRight, Server, Building2,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function healthColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

const RISK_BADGE: Record<string, string> = {
  "High Risk":     "bg-destructive text-destructive-foreground",
  "Medium Risk":   "bg-orange-500 text-white",
  "Cost Risk":     "bg-yellow-500 text-black",
  "Planning Risk": "bg-blue-500 text-white",
  "Valid Design":  "bg-green-600 text-white",
};

function calcForScenario(s: ScenarioWithProjectName) {
  return calculateScenario({
    rackCount: s.rack_count,
    kwPerRack: s.avg_power_per_rack_kw,
    growthBufferPercent: s.growth_buffer_pct,
    redundancyType: s.redundancy_level as RedundancyType,
    coolingType: s.cooling_type as CoolingType,
    costPerMw: s.cost_per_mw,
    costPerRack: s.cost_per_rack,
    facilityConstraintsEnabled: s.facility_constraints_enabled ?? false,
    sqftPerFloor: s.sqft_per_floor ?? undefined,
    floorsUsed: s.floors_used ?? undefined,
    floorLevel: s.floor_level ?? undefined,
    flooringType: (s.flooring_type as FlooringType) ?? undefined,
    serverSpacingFt: s.server_spacing_ft ?? undefined,
    ceilingHeightFt: s.ceiling_height_ft ?? undefined,
  });
}

function fitStatusColor(status: string): string {
  if (status === "Good Fit") return "text-green-600";
  if (status === "Review Recommended") return "text-amber-600";
  if (status === "High Risk") return "text-destructive";
  return "text-muted-foreground";
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, companyId } = useAuth();
  const firstName = user?.email?.split("@")[0] ?? "there";

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", companyId],
    queryFn: listProjects,
    enabled: !!companyId,
  });

  const { data: scenarios, isLoading: scenariosLoading } = useQuery({
    queryKey: ["allScenarios", companyId],
    queryFn: () => listAllScenariosWithProject(20),
    enabled: !!companyId,
  });

  const isLoading = projectsLoading || scenariosLoading;

  // Compute calculated outputs for every scenario once
  const scenarioCalcs = useMemo(
    () => (scenarios ?? []).map((s) => ({ s, o: calcForScenario(s) })),
    [scenarios]
  );

  // KPI stats
  const totalProjects   = projects?.length ?? 0;
  const totalScenarios  = scenarioCalcs.length;
  const highRiskCount   = scenarioCalcs.filter(
    ({ s, o }) => o.riskLevel === "High Risk" || (s.facility_constraints_enabled && o.physicalFitStatus === "High Risk")
  ).length;
  const facilityRisksCount = scenarioCalcs.filter(
    ({ s, o }) => s.facility_constraints_enabled && o.facilityRiskMessages.length > 0
  ).length;
  const avgHealthScore  = totalScenarios > 0
    ? Math.round(scenarioCalcs.reduce((sum, { o }) => sum + o.designHealthScore, 0) / totalScenarios)
    : null;

  // Most recent project (for deep-linking "New Scenario")
  const firstProject = projects?.[0] ?? null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto w-full space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your infrastructure design portfolio.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/projects/new">
            <Button data-testid="btn-new-project">
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </Link>
          <Link href={firstProject ? `/projects/${firstProject.id}/scenarios/new` : "/projects"}>
            <Button variant="outline" data-testid="btn-new-scenario">
              <Layers className="h-4 w-4 mr-2" /> New Scenario
            </Button>
          </Link>
          <Link href={firstProject ? `/projects/${firstProject.id}/compare` : "/projects"}>
            <Button variant="outline" data-testid="btn-compare">
              <GitCompare className="h-4 w-4 mr-2" /> Compare Scenarios
            </Button>
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Total Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Total Projects
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isLoading ? <Skeleton className="h-9 w-12" /> : (
                <>
                  <div className="text-3xl font-bold font-mono" data-testid="stat-total-projects">
                    {totalProjects}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across your organization</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Scenarios */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Total Scenarios
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isLoading ? <Skeleton className="h-9 w-12" /> : (
                <>
                  <div className="text-3xl font-bold font-mono" data-testid="stat-total-scenarios">
                    {totalScenarios}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Design configurations</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* High-Risk Scenarios */}
          <Card className={cn(highRiskCount > 0 && "border-destructive/40")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                High-Risk
              </CardTitle>
              <AlertTriangle className={cn(
                "h-4 w-4",
                highRiskCount > 0 ? "text-destructive" : "text-muted-foreground"
              )} />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isLoading ? <Skeleton className="h-9 w-12" /> : (
                <>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    highRiskCount > 0 ? "text-destructive" : "text-foreground"
                  )} data-testid="stat-high-risk">
                    {highRiskCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {highRiskCount === 0 ? "No high-risk designs" : "Scenarios requiring attention"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Facility Risks */}
          <Card className={cn(facilityRisksCount > 0 && "border-amber-400/50")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Facility Risks
              </CardTitle>
              <Building2 className={cn(
                "h-4 w-4",
                facilityRisksCount > 0 ? "text-amber-500" : "text-muted-foreground"
              )} />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isLoading ? <Skeleton className="h-9 w-12" /> : (
                <>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    facilityRisksCount > 0 ? "text-amber-600" : "text-foreground"
                  )} data-testid="stat-facility-risks">
                    {facilityRisksCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {facilityRisksCount === 0 ? "No facility flags" : "Scenarios with flags"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Avg Design Health */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Avg Health Score
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {isLoading ? <Skeleton className="h-9 w-16" /> : (
                <>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    avgHealthScore !== null ? healthColor(avgHealthScore) : "text-muted-foreground"
                  )} data-testid="stat-avg-health">
                    {avgHealthScore !== null ? `${avgHealthScore}` : "—"}
                    {avgHealthScore !== null && (
                      <span className="text-base font-normal text-muted-foreground"> / 100</span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    {avgHealthScore !== null && (
                      <div
                        className={cn("h-full rounded-full transition-all", {
                          "bg-green-500": avgHealthScore >= 80,
                          "bg-amber-500": avgHealthScore >= 60 && avgHealthScore < 80,
                          "bg-orange-500": avgHealthScore >= 40 && avgHealthScore < 60,
                          "bg-destructive": avgHealthScore < 40,
                        })}
                        style={{ width: `${avgHealthScore}%` }}
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent scenarios table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Scenarios</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Latest design configurations across all projects.
              </p>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                All Projects <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          {isLoading ? (
            <CardContent className="space-y-3 pt-0">
              {Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          ) : scenarioCalcs.length === 0 ? (
            <CardContent className="pt-0">
              <div className="text-center py-14 border rounded-xl border-dashed bg-muted/10">
                <Server className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground mb-4 text-sm">
                  No scenarios yet. Create a project and run your first analysis.
                </p>
                <Link href="/projects/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Create Project
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    {["Scenario", "Project", "Total MW", "Est. Cost", "Risk Level", "Health"].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                          h === "Scenario" || h === "Project" ? "text-left" : "text-center"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarioCalcs.slice(0, 10).map(({ s, o }, i) => (
                    <tr
                      key={s.id}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/10 transition-colors",
                        i % 2 === 0 ? "bg-background" : "bg-muted/5"
                      )}
                      data-testid={`scenario-row-${s.id}`}
                    >
                      {/* Scenario name */}
                      <td className="px-5 py-3.5">
                        <Link href={`/projects/${s.project_id}/scenarios/${s.id}`}>
                          <span className="font-medium hover:text-primary hover:underline cursor-pointer truncate max-w-[160px] block">
                            {s.name}
                          </span>
                        </Link>
                        {s.facility_constraints_enabled && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 leading-tight">
                              Facility
                            </span>
                            {o.physicalFitStatus !== "Not Evaluated" && (
                              <span className={cn("text-xs font-medium", fitStatusColor(o.physicalFitStatus))}>
                                {o.physicalFitStatus}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Project name */}
                      <td className="px-5 py-3.5">
                        <Link href={`/projects/${s.project_id}`}>
                          <span className="text-muted-foreground hover:text-primary hover:underline cursor-pointer truncate max-w-[140px] block">
                            {s.projects?.name ?? "—"}
                          </span>
                        </Link>
                      </td>

                      {/* Total MW */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-mono">{o.totalMw.toFixed(2)} MW</span>
                      </td>

                      {/* Estimated Cost */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-mono">{fmtCurrency(o.estimatedCost)}</span>
                      </td>

                      {/* Risk Level */}
                      <td className="px-5 py-3.5 text-center">
                        <Badge className={cn("text-xs whitespace-nowrap", RISK_BADGE[o.riskLevel] ?? "")}>
                          {o.riskLevel}
                        </Badge>
                      </td>

                      {/* Health Score */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("font-mono font-bold text-sm", healthColor(o.designHealthScore))}>
                            {o.designHealthScore}
                          </span>
                          <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", {
                                "bg-green-500": o.designHealthScore >= 80,
                                "bg-amber-500": o.designHealthScore >= 60,
                                "bg-orange-500": o.designHealthScore >= 40,
                                "bg-destructive": o.designHealthScore < 40,
                              })}
                              style={{ width: `${o.designHealthScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {scenarioCalcs.length > 10 && (
                <>
                  <Separator />
                  <div className="p-4 text-center">
                    <Link href="/projects">
                      <Button variant="ghost" size="sm">
                        View all {scenarioCalcs.length} scenarios
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </SidebarLayout>
  );
}
