import { useMemo, useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Link, useParams, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getProject, listScenarios } from "@/lib/supabase-projects";
import { useAuth } from "@/contexts/useAuth";
import { calculateScenario } from "@/lib/calculateScenario";
import type { Scenario } from "@/lib/supabase-projects";
import type { ScenarioOutput, RedundancyType, CoolingType, FlooringType, PhysicalFitStatus } from "@/lib/calculateScenario";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, GitCompare, Trophy, Lightbulb,
  TrendingDown, TrendingUp, Minus, Plus,
} from "lucide-react";

// ── Formatting ─────────────────────────────────────────────────────────────

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

// ── Risk ranking (lower = better) ─────────────────────────────────────────

const RISK_RANK: Record<string, number> = {
  "Valid Design":   0,
  "Planning Risk":  1,
  "Cost Risk":      2,
  "Medium Risk":    3,
  "High Risk":      4,
};

// ── Physical fit ranking (lower index = better) ────────────────────────────

const FIT_RANK: Record<string, number> = {
  "Good Fit":           0,
  "Review Recommended": 1,
  "High Risk":          2,
  "Not Evaluated":      99,
};

function fitStatusColor(status: string): string {
  if (status === "Good Fit") return "text-green-600";
  if (status === "Review Recommended") return "text-amber-600";
  if (status === "High Risk") return "text-destructive";
  return "text-muted-foreground";
}

const RISK_BADGE: Record<string, string> = {
  "High Risk":     "bg-destructive text-destructive-foreground",
  "Medium Risk":   "bg-orange-500 text-white",
  "Cost Risk":     "bg-yellow-500 text-black",
  "Planning Risk": "bg-blue-500 text-white",
  "Valid Design":  "bg-green-600 text-white",
};

// ── Metric definitions ─────────────────────────────────────────────────────

type WinDir = "lower" | "higher" | "lowerRisk" | "lowerFit" | null;

type MetricRow = {
  label: string;
  getVal: (s: Scenario, o: ScenarioOutput) => number | string;
  format: (v: number | string) => React.ReactNode;
  winDir: WinDir;
  winLabel: string;
};

const METRICS: MetricRow[] = [
  {
    label: "Rack Count",
    getVal: (s) => s.rack_count,
    format: (v) => `${Number(v).toLocaleString()} racks`,
    winDir: null,
    winLabel: "",
  },
  {
    label: "kW per Rack",
    getVal: (s) => s.avg_power_per_rack_kw,
    format: (v) => `${v} kW`,
    winDir: null,
    winLabel: "",
  },
  {
    label: "Total MW",
    getVal: (_, o) => o.totalMw,
    format: (v) => `${Number(v).toFixed(2)} MW`,
    winDir: "lower",
    winLabel: "lower total MW",
  },
  {
    label: "Cooling Tons",
    getVal: (_, o) => Math.round(o.coolingTons),
    format: (v) => `${Number(v).toLocaleString()} TR`,
    winDir: null,
    winLabel: "",
  },
  {
    label: "Estimated Cost",
    getVal: (_, o) => o.estimatedCost,
    format: (v) => fmtCurrency(Number(v)),
    winDir: "lower",
    winLabel: "lower cost",
  },
  {
    label: "Cooling Type",
    getVal: (s) => s.cooling_type,
    format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
    winDir: null,
    winLabel: "",
  },
  {
    label: "Redundancy",
    getVal: (s) => s.redundancy_level,
    format: (v) => String(v),
    winDir: null,
    winLabel: "",
  },
  {
    label: "Risk Level",
    getVal: (_, o) => o.riskLevel,
    format: (v) => (
      <Badge className={cn("text-xs", RISK_BADGE[String(v)] ?? "")}>
        {String(v)}
      </Badge>
    ),
    winDir: "lowerRisk",
    winLabel: "lower risk",
  },
  {
    label: "Design Health",
    getVal: (_, o) => o.designHealthScore,
    format: (v) => (
      <span className={cn("font-mono font-bold", healthColor(Number(v)))}>
        {v} / 100
      </span>
    ),
    winDir: "higher",
    winLabel: "a higher health score",
  },
];

// ── Facility metric definitions ────────────────────────────────────────────

const FACILITY_METRICS: MetricRow[] = [
  {
    label: "Facility Constraints",
    getVal: (s) => s.facility_constraints_enabled ? "Enabled" : "Disabled",
    format: (v) => (
      <span className={v === "Enabled" ? "text-green-700 font-medium" : "text-muted-foreground"}>
        {String(v)}
      </span>
    ),
    winDir: null,
    winLabel: "",
  },
  {
    label: "Physical Fit Status",
    getVal: (_, o) => (o.physicalFitStatus as string),
    format: (v) => (
      <span className={cn("font-medium", fitStatusColor(String(v)))}>{String(v)}</span>
    ),
    winDir: "lowerFit",
    winLabel: "a better physical fit",
  },
  {
    label: "Sqft per Floor",
    getVal: (s) => s.sqft_per_floor ?? SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : `${Number(v).toLocaleString()} sqft`,
    winDir: null,
    winLabel: "",
  },
  {
    label: "Floors Used",
    getVal: (s) => s.floors_used ?? SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : String(v),
    winDir: null,
    winLabel: "",
  },
  {
    label: "Total Available Sqft",
    getVal: (_, o) => o.totalAvailableSqft ?? SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : `${Number(v).toLocaleString()} sqft`,
    winDir: null,
    winLabel: "",
  },
  {
    label: "Est. Rack Footprint",
    getVal: (_, o) => o.estimatedRackFootprintSqft ?? SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : `${Number(v).toLocaleString()} sqft`,
    winDir: null,
    winLabel: "",
  },
  {
    label: "Space Utilization",
    getVal: (_, o) => o.spaceUtilizationPercent ?? SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : `${v}%`,
    winDir: "lower",
    winLabel: "lower space utilization",
  },
  {
    label: "Server Spacing",
    getVal: (s) => s.server_spacing_ft ?? SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : `${v} ft`,
    winDir: "higher",
    winLabel: "higher server spacing",
  },
  {
    label: "Ceiling Height",
    getVal: (s) => s.ceiling_height_ft ?? SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : `${v} ft`,
    winDir: "higher",
    winLabel: "higher ceiling height",
  },
  {
    label: "Flooring Type",
    getVal: (s) => s.flooring_type ?? "—",
    format: (v) => String(v),
    winDir: null,
    winLabel: "",
  },
  {
    label: "Facility Risk Count",
    getVal: (s, o) => s.facility_constraints_enabled ? o.facilityRiskMessages.length : SENTINEL,
    format: (v) => Number(v) === SENTINEL ? "—" : String(v),
    winDir: "lower",
    winLabel: "fewer facility risks",
  },
];

// ── Winner logic ───────────────────────────────────────────────────────────

const SENTINEL = -1; // returned by getVal when a facility metric is unavailable

function cellWinner(
  aVal: number | string,
  bVal: number | string,
  dir: WinDir
): "a" | "b" | "tie" {
  if (!dir) return "tie";
  if (dir === "lower") {
    const a = Number(aVal), b = Number(bVal);
    if (a === SENTINEL || b === SENTINEL) return "tie";
    return a < b ? "a" : b < a ? "b" : "tie";
  }
  if (dir === "higher") {
    const a = Number(aVal), b = Number(bVal);
    if (a === SENTINEL || b === SENTINEL) return "tie";
    return a > b ? "a" : b > a ? "b" : "tie";
  }
  if (dir === "lowerRisk") {
    const a = RISK_RANK[String(aVal)] ?? 99;
    const b = RISK_RANK[String(bVal)] ?? 99;
    return a < b ? "a" : b < a ? "b" : "tie";
  }
  if (dir === "lowerFit") {
    const a = FIT_RANK[String(aVal)] ?? 99;
    const b = FIT_RANK[String(bVal)] ?? 99;
    if (a === 99 || b === 99) return "tie";
    return a < b ? "a" : b < a ? "b" : "tie";
  }
  return "tie";
}

function runCalc(s: Scenario): ScenarioOutput {
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

// ── Recommendation sentence ────────────────────────────────────────────────

function buildRecommendation(
  nameA: string, sA: Scenario, oA: ScenarioOutput,
  nameB: string, sB: Scenario, oB: ScenarioOutput
): string {
  const winsA: string[] = [];
  const winsB: string[] = [];

  for (const m of [...METRICS, ...FACILITY_METRICS]) {
    if (!m.winDir || !m.winLabel) continue;
    const w = cellWinner(m.getVal(sA, oA), m.getVal(sB, oB), m.winDir);
    if (w === "a") winsA.push(m.winLabel);
    if (w === "b") winsB.push(m.winLabel);
  }

  if (winsA.length === 0 && winsB.length === 0) {
    return `"${nameA}" and "${nameB}" are evenly matched across all key metrics.`;
  }

  const [winner, wins] =
    winsA.length >= winsB.length
      ? [nameA, winsA]
      : [nameB, winsB];

  if (wins.length === 1) {
    return `"${winner}" appears stronger because it has ${wins[0]}.`;
  }
  const last = wins[wins.length - 1];
  const rest = wins.slice(0, -1).join(", ");
  return `"${winner}" appears stronger because it has ${rest}, and ${last}.`;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CompareScenariosPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const search = useSearch();
  const { companyId } = useAuth();

  const qs = new URLSearchParams(search);
  const preA = qs.get("a") ?? "";
  const preB = qs.get("b") ?? "";

  const [selectedA, setSelectedA] = useState(preA);
  const [selectedB, setSelectedB] = useState(preB);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["scenarios", projectId],
    queryFn: () => listScenarios(projectId),
    enabled: !!projectId && !!companyId,
  });

  // Auto-select first two scenarios if none pre-selected
  useEffect(() => {
    if (!scenarios || scenarios.length < 2) return;
    if (!selectedA) setSelectedA(scenarios[0].id);
    if (!selectedB) setSelectedB(scenarios[1].id);
  }, [scenarios]); // eslint-disable-line react-hooks/exhaustive-deps

  const scenarioA = useMemo(
    () => scenarios?.find((s) => s.id === selectedA) ?? null,
    [scenarios, selectedA]
  );
  const scenarioB = useMemo(
    () => scenarios?.find((s) => s.id === selectedB) ?? null,
    [scenarios, selectedB]
  );

  const outputA = useMemo(() => (scenarioA ? runCalc(scenarioA) : null), [scenarioA]);
  const outputB = useMemo(() => (scenarioB ? runCalc(scenarioB) : null), [scenarioB]);

  const ready = !!(scenarioA && scenarioB && outputA && outputB && selectedA !== selectedB);

  // Count wins per side
  const { winCountA, winCountB } = useMemo(() => {
    if (!ready || !scenarioA || !scenarioB || !outputA || !outputB)
      return { winCountA: 0, winCountB: 0 };
    let a = 0, b = 0;
    for (const m of [...METRICS, ...FACILITY_METRICS]) {
      if (!m.winDir) continue;
      const w = cellWinner(m.getVal(scenarioA, outputA), m.getVal(scenarioB, outputB), m.winDir);
      if (w === "a") a++;
      if (w === "b") b++;
    }
    return { winCountA: a, winCountB: b };
  }, [ready, scenarioA, scenarioB, outputA, outputB]);

  const recommendation = useMemo(() => {
    if (!ready || !scenarioA || !scenarioB || !outputA || !outputB) return null;
    return buildRecommendation(
      scenarioA.name, scenarioA, outputA,
      scenarioB.name, scenarioB, outputB
    );
  }, [ready, scenarioA, scenarioB, outputA, outputB]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto w-full space-y-8">

        {/* Header */}
        <div>
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="mb-3 -ml-3 text-muted-foreground" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <GitCompare className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Compare Scenarios</h1>
              {project && (
                <p className="text-sm text-muted-foreground mt-0.5">{project.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Scenario pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["A", "B"] as const).map((side) => {
            const selected = side === "A" ? selectedA : selectedB;
            const other = side === "A" ? selectedB : selectedA;
            const setSelected = side === "A" ? setSelectedA : setSelectedB;
            return (
              <div key={side} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Scenario {side}
                </p>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selected} onValueChange={setSelected}>
                    <SelectTrigger data-testid={`select-${side.toLowerCase()}`}>
                      <SelectValue placeholder={`Select scenario ${side}…`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(scenarios ?? []).map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          disabled={s.id === other}
                        >
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>

        {/* Not enough scenarios */}
        {!isLoading && scenarios && scenarios.length < 2 && (
          <div className="text-center py-16 border rounded-xl border-dashed">
            <GitCompare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium mb-1">Not enough scenarios</p>
            <p className="text-sm text-muted-foreground mb-4">
              You need at least two scenarios to compare.
            </p>
            <Link href={`/projects/${projectId}/scenarios/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> Create a Scenario
              </Button>
            </Link>
          </div>
        )}

        {/* Same scenario warning */}
        {selectedA && selectedB && selectedA === selectedB && (
          <p className="text-center text-sm text-muted-foreground py-4 border rounded-xl border-dashed">
            Select two <em>different</em> scenarios to compare.
          </p>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {ready && scenarioA && scenarioB && outputA && outputB && (
          <>
            {/* Win summary banners */}
            <div className="grid grid-cols-2 gap-4">
              {([
                { name: scenarioA.name, wins: winCountA, other: winCountB, dot: "bg-primary" },
                { name: scenarioB.name, wins: winCountB, other: winCountA, dot: "bg-orange-400" },
              ] as const).map(({ name, wins, other, dot }) => (
                <Card
                  key={name}
                  className={cn(
                    "border transition-colors",
                    wins > other && "border-primary/60 bg-primary/5"
                  )}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    {wins > other && (
                      <Trophy className="h-5 w-5 text-primary shrink-0" />
                    )}
                    <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {wins} metric{wins !== 1 ? "s" : ""} won
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comparison table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Side-by-Side Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground w-[30%]">
                        Metric
                      </th>
                      {[
                        { label: scenarioA.name, dot: "bg-primary" },
                        { label: scenarioB.name, dot: "bg-orange-400" },
                      ].map(({ label, dot }) => (
                        <th key={label} className="text-center px-5 py-3 font-semibold w-[35%]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full", dot)} />
                            {label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((metric, i) => {
                      const vA = metric.getVal(scenarioA, outputA);
                      const vB = metric.getVal(scenarioB, outputB);
                      const w = cellWinner(vA, vB, metric.winDir);
                      const isWinRow = w !== "tie";

                      return (
                        <tr
                          key={metric.label}
                          className={cn(
                            "border-b last:border-0",
                            i % 2 === 0 ? "bg-background" : "bg-muted/10"
                          )}
                        >
                          <td className="px-5 py-3.5 font-medium text-muted-foreground">
                            {metric.label}
                          </td>
                          <td className={cn("px-5 py-3.5 text-center", w === "a" && "bg-green-50 dark:bg-green-950/20")}>
                            <CellContent value={vA} format={metric.format} win={w === "a"} lose={isWinRow && w !== "a"} dir={metric.winDir} />
                          </td>
                          <td className={cn("px-5 py-3.5 text-center", w === "b" && "bg-green-50 dark:bg-green-950/20")}>
                            <CellContent value={vB} format={metric.format} win={w === "b"} lose={isWinRow && w !== "b"} dir={metric.winDir} />
                          </td>
                        </tr>
                      );
                    })}

                    {/* ── Facility Constraints section ── */}
                    <tr className="border-b bg-muted/40">
                      <td colSpan={3} className="px-5 py-2.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Facility Constraints
                        </span>
                      </td>
                    </tr>
                    {FACILITY_METRICS.map((metric, i) => {
                      const vA = metric.getVal(scenarioA, outputA);
                      const vB = metric.getVal(scenarioB, outputB);
                      const w = cellWinner(vA, vB, metric.winDir);
                      const isWinRow = w !== "tie";

                      return (
                        <tr
                          key={metric.label}
                          className={cn(
                            "border-b last:border-0",
                            i % 2 === 0 ? "bg-background" : "bg-muted/10"
                          )}
                        >
                          <td className="px-5 py-3.5 font-medium text-muted-foreground">
                            {metric.label}
                          </td>
                          <td className={cn("px-5 py-3.5 text-center", w === "a" && "bg-green-50 dark:bg-green-950/20")}>
                            <CellContent value={vA} format={metric.format} win={w === "a"} lose={isWinRow && w !== "a"} dir={metric.winDir} />
                          </td>
                          <td className={cn("px-5 py-3.5 text-center", w === "b" && "bg-green-50 dark:bg-green-950/20")}>
                            <CellContent value={vB} format={metric.format} win={w === "b"} lose={isWinRow && w !== "b"} dir={metric.winDir} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Recommendation */}
            {recommendation && (
              <div className="flex items-start gap-4 p-5 border rounded-xl bg-muted/30">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Recommendation</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {recommendation}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

// ── Cell sub-component ─────────────────────────────────────────────────────

function CellContent({
  value,
  format,
  win,
  lose,
  dir,
}: {
  value: number | string;
  format: (v: number | string) => React.ReactNode;
  win: boolean;
  lose: boolean;
  dir: WinDir;
}) {
  const WinIcon =
    dir === "lower" || dir === "lowerRisk" || dir === "lowerFit" ? TrendingDown : TrendingUp;

  return (
    <div className="inline-flex items-center justify-center gap-1.5">
      {win && <WinIcon className="h-3.5 w-3.5 text-green-600 shrink-0" />}
      {lose && <Minus className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
      <span
        className={cn(
          "font-mono",
          win
            ? "font-bold text-green-700 dark:text-green-400"
            : "text-muted-foreground"
        )}
      >
        {format(value)}
      </span>
    </div>
  );
}
