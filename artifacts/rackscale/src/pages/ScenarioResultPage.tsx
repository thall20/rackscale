import { useMemo } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getScenarioWithResult, getProject } from "@/lib/supabase-projects";
import { useAuth } from "@/contexts/useAuth";
import { calculateScenario } from "@/lib/calculateScenario";
import type { RedundancyType, CoolingType } from "@/lib/calculateScenario";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Zap, ThermometerSnowflake, DollarSign,
  Activity, AlertTriangle, CheckCircle2, Lightbulb,
  GitCompare, Pencil, Download, FolderOpen,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

const RISK_STYLES: Record<string, { bar: string; badge: string; alert: string; icon: string }> = {
  "High Risk":     { bar: "bg-destructive",     badge: "bg-destructive text-destructive-foreground",   alert: "border-destructive/50 bg-destructive/5",       icon: "text-destructive" },
  "Medium Risk":   { bar: "bg-orange-500",       badge: "bg-orange-500 text-white",                     alert: "border-orange-400/50 bg-orange-50/50",          icon: "text-orange-500" },
  "Cost Risk":     { bar: "bg-yellow-500",       badge: "bg-yellow-500 text-black",                     alert: "border-yellow-400/50 bg-yellow-50/50",          icon: "text-yellow-600" },
  "Planning Risk": { bar: "bg-blue-500",         badge: "bg-blue-500 text-white",                       alert: "border-blue-400/50 bg-blue-50/50",              icon: "text-blue-500" },
  "Valid Design":  { bar: "bg-green-500",        badge: "bg-green-600 text-white",                      alert: "border-green-400/50 bg-green-50/50",            icon: "text-green-600" },
};

function healthColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

function healthBarColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-destructive";
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ScenarioResultPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const id = params.id as string;
  const { companyId } = useAuth();

  const enabled = !!(projectId && id && companyId);

  const { data: scenarioData, isLoading: scenarioLoading, isError: scenarioError } = useQuery({
    queryKey: ["scenario", projectId, id],
    queryFn: () => getScenarioWithResult(projectId, id),
    enabled,
  });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const isLoading = scenarioLoading || projectLoading;
  const scenario = scenarioData ?? null;

  // Re-run the calculation from stored inputs so we always have fresh output
  const calc = useMemo(() => {
    if (!scenario) return null;
    return calculateScenario({
      rackCount: scenario.rack_count,
      kwPerRack: scenario.avg_power_per_rack_kw,
      growthBufferPercent: scenario.growth_buffer_pct,
      redundancyType: scenario.redundancy_level as RedundancyType,
      coolingType: scenario.cooling_type as CoolingType,
      costPerMw: scenario.cost_per_mw,
      costPerRack: scenario.cost_per_rack,
    });
  }, [scenario]);

  const riskStyle = calc ? (RISK_STYLES[calc.riskLevel] ?? RISK_STYLES["Valid Design"]) : null;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto w-full space-y-8">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm" className="mb-3 -ml-3 text-muted-foreground" data-testid="btn-back">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
              </Button>
            </Link>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-5 w-40" />
              </div>
            ) : scenario ? (
              <>
                <h1 className="text-3xl font-bold tracking-tight truncate">{scenario.name}</h1>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span>{project?.name ?? "—"}</span>
                </div>
              </>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link href={`/projects/${projectId}/compare?a=${id}`}>
              <Button variant="outline" size="sm" data-testid="btn-compare">
                <GitCompare className="h-4 w-4 mr-2" /> Compare Scenarios
              </Button>
            </Link>
            <Button variant="outline" size="sm" disabled data-testid="btn-edit">
              <Pencil className="h-4 w-4 mr-2" /> Edit Scenario
            </Button>
            <Link href={`/projects/${projectId}/scenarios/${id}/report`}>
              <Button variant="outline" size="sm" data-testid="btn-export">
                <Download className="h-4 w-4 mr-2" /> Export Report
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Error state ─────────────────────────────────────────────── */}
        {scenarioError && !isLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load this scenario. It may have been deleted or you may not have access.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Loading skeletons ────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────── */}
        {!isLoading && scenario && calc && riskStyle && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Total MW */}
              <Card>
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Total MW
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-3xl font-bold font-mono tracking-tight">
                    {calc.totalMw.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {calc.totalLoadKw.toLocaleString()} kW provisioned
                  </p>
                </CardContent>
              </Card>

              {/* Cooling Tons */}
              <Card>
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ThermometerSnowflake className="h-3.5 w-3.5 text-blue-500" /> Cooling Tons
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-3xl font-bold font-mono tracking-tight">
                    {Math.round(calc.coolingTons).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    TR of thermal capacity
                  </p>
                </CardContent>
              </Card>

              {/* Estimated Cost */}
              <Card>
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-green-600" /> Est. Cost
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-3xl font-bold font-mono tracking-tight">
                    {fmtCurrency(calc.estimatedCost)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total CapEx estimate
                  </p>
                </CardContent>
              </Card>

              {/* Design Health Score */}
              <Card>
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className={cn("text-3xl font-bold font-mono tracking-tight", healthColor(calc.designHealthScore))}>
                    {calc.designHealthScore}<span className="text-base font-normal text-muted-foreground"> / 100</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", healthBarColor(calc.designHealthScore))}
                      style={{ width: `${calc.designHealthScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk alert */}
            <Alert className={cn("border", riskStyle.alert)}>
              <AlertTriangle className={cn("h-4 w-4", riskStyle.icon)} />
              <AlertTitle className="flex items-center gap-2">
                <span>Risk Assessment</span>
                <Badge className={cn("text-xs", riskStyle.badge)}>
                  {calc.riskLevel}
                </Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                {calc.riskMessages.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>No engineering risks detected. Design is within all tolerances.</span>
                  </div>
                ) : (
                  <ul className="space-y-1.5 mt-1">
                    {calc.riskMessages.map((msg, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>

            {/* Recommendation */}
            <div className="flex items-start gap-4 p-5 border rounded-xl bg-muted/30">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Recommendation</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{calc.recommendation}</p>
              </div>
            </div>

            {/* Input assumptions summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Input Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0 text-sm">
                  {[
                    ["Rack Count",      `${scenario.rack_count} racks`],
                    ["kW per Rack",     `${scenario.avg_power_per_rack_kw} kW`],
                    ["Growth Buffer",   `${scenario.growth_buffer_pct}%`],
                    ["IT Load (base)",  `${calc.itLoadKw.toLocaleString()} kW`],
                    ["Growth-Adj. Load",`${calc.growthAdjustedKw.toLocaleString()} kW`],
                    ["Redundancy",      scenario.redundancy_level],
                    ["Utility Feed",    scenario.utility_feed],
                    ["UPS Type",        scenario.ups_type],
                    ["Cooling Type",    scenario.cooling_type],
                    ["Target PUE",      `${scenario.pue_target}`],
                    ["Containment",     scenario.containment_type.replace(/_/g, " ")],
                    ["Cost / MW",       fmtCurrency(scenario.cost_per_mw)],
                    ["Cost / Rack",     fmtCurrency(scenario.cost_per_rack)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="flex justify-between py-2.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium capitalize">{value}</span>
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* No result state */}
        {!isLoading && scenario && !calc && (
          <div className="text-center py-16 border rounded-xl border-dashed">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Results are still being computed. Please refresh in a moment.</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
