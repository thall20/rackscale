import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getScenarioWithResult, getProject } from "@/lib/supabase-projects";
import { useAuth } from "@/contexts/AuthContext";
import { calculateScenario } from "@/lib/calculateScenario";
import type { RedundancyType, CoolingType } from "@/lib/calculateScenario";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Server, Download,
  Zap, ThermometerSnowflake, DollarSign, Activity,
  AlertTriangle, CheckCircle2, Lightbulb, MapPin, Calendar,
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
  return "text-red-600";
}

function healthBarColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

const RISK_BADGE: Record<string, string> = {
  "High Risk":     "bg-red-600 text-white",
  "Medium Risk":   "bg-orange-500 text-white",
  "Cost Risk":     "bg-yellow-500 text-black",
  "Planning Risk": "bg-blue-500 text-white",
  "Valid Design":  "bg-green-600 text-white",
};

const RISK_SECTION_BG: Record<string, string> = {
  "High Risk":     "bg-red-50 border-red-200",
  "Medium Risk":   "bg-orange-50 border-orange-200",
  "Cost Risk":     "bg-yellow-50 border-yellow-200",
  "Planning Risk": "bg-blue-50 border-blue-200",
  "Valid Design":  "bg-green-50 border-green-200",
};

const RISK_ICON_COLOR: Record<string, string> = {
  "High Risk":     "text-red-600",
  "Medium Risk":   "text-orange-500",
  "Cost Risk":     "text-yellow-600",
  "Planning Risk": "text-blue-500",
  "Valid Design":  "text-green-600",
};

// ── Small layout components ─────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">
        {children}
      </h2>
      <div className="h-px bg-slate-200" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-mono font-semibold text-slate-800 capitalize ml-4 text-right">
        {value}
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ExportReportPage() {
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

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Toolbar (not printed) ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href={`/projects/${projectId}/scenarios/${id}`}>
            <Button variant="ghost" size="sm" className="text-slate-600">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Results
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    disabled
                    className="pointer-events-none opacity-50"
                    data-testid="btn-download-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">PDF export coming soon.</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Document ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto my-8 mb-16 px-4 print:my-0 print:px-0">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden print:shadow-none print:rounded-none">

          {isLoading ? (
            <div className="p-10 space-y-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : scenarioError || !scenario || !calc ? (
            <div className="p-16 text-center">
              <Server className="mx-auto h-10 w-10 text-slate-300 mb-4" />
              <p className="text-slate-700 font-medium mb-1">
                {scenarioError ? "Failed to load scenario" : "Scenario not found"}
              </p>
              <p className="text-slate-500 text-sm">
                {scenarioError
                  ? "It may have been deleted or you may not have access."
                  : "Results are unavailable for this scenario."}
              </p>
            </div>
          ) : (
            <>
              {/* ── Report header ──────────────────────────────────────── */}
              <div className="bg-slate-900 px-10 py-8 flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 rounded-lg p-2.5">
                    <Server className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="text-white text-xl font-bold tracking-tight">RackScale</span>
                    <p className="text-slate-400 text-xs mt-0.5">Engineering Design Report</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold text-lg leading-tight truncate max-w-xs">
                    {scenario.name}
                  </p>
                  <p className="text-slate-400 text-xs mt-1 flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" /> Generated {generatedDate}
                  </p>
                </div>
              </div>

              <div className="px-10 py-8 space-y-10">

                {/* ── Project overview ───────────────────────────────── */}
                <section>
                  <SectionHeading>Project Overview</SectionHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                    <Row label="Project" value={project?.name ?? "—"} />
                    <Row label="Scenario" value={scenario.name} />
                    {project?.location && (
                      <Row
                        label="Location"
                        value={project.location}
                      />
                    )}
                    <Row
                      label="Project Status"
                      value={project?.status ?? "—"}
                    />
                    <Row label="Report Date" value={generatedDate} />
                  </div>
                  {project?.description && (
                    <p className="mt-3 text-sm text-slate-500 italic leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </section>

                {/* ── Scenario assumptions ───────────────────────────── */}
                <section>
                  <SectionHeading>Scenario Assumptions</SectionHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                    {[
                      ["Rack Count",          `${scenario.rack_count} racks`],
                      ["kW per Rack",          `${scenario.avg_power_per_rack_kw} kW`],
                      ["Growth Buffer",        `${scenario.growth_buffer_pct}%`],
                      ["IT Load (base)",       `${calc.itLoadKw.toLocaleString()} kW`],
                      ["Growth-Adjusted Load", `${calc.growthAdjustedKw.toLocaleString()} kW`],
                      ["Redundancy Level",     scenario.redundancy_level],
                      ["Utility Feed",         scenario.utility_feed],
                      ["UPS Type",             scenario.ups_type],
                      ["Cooling Type",         scenario.cooling_type],
                      ["Target PUE",           `${scenario.pue_target}`],
                      ["Aisle Containment",    scenario.containment_type.replace(/_/g, " ")],
                      ["Cost / MW",            fmtCurrency(scenario.cost_per_mw)],
                      ["Cost / Rack",          fmtCurrency(scenario.cost_per_rack)],
                    ].map(([label, value]) => (
                      <Row key={label} label={label} value={value} />
                    ))}
                  </div>
                </section>

                {/* ── Calculated results ─────────────────────────────── */}
                <section>
                  <SectionHeading>Calculated Results</SectionHeading>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

                    {/* Total MW */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total MW</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-900">
                        {calc.totalMw.toFixed(2)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {calc.totalLoadKw.toLocaleString()} kW provisioned
                      </p>
                    </div>

                    {/* Cooling Tons */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ThermometerSnowflake className="h-3.5 w-3.5 text-sky-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cooling TR</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-900">
                        {Math.round(calc.coolingTons).toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Tons of refrigeration</p>
                    </div>

                    {/* Estimated Cost */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <DollarSign className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Est. Cost</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-900">
                        {fmtCurrency(calc.estimatedCost)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Total CapEx estimate</p>
                    </div>

                    {/* Health Score */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Activity className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health</span>
                      </div>
                      <div className={cn("text-2xl font-bold font-mono", healthColor(calc.designHealthScore))}>
                        {calc.designHealthScore}
                        <span className="text-sm font-normal text-slate-400"> / 100</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", healthBarColor(calc.designHealthScore))}
                          style={{ width: `${calc.designHealthScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Risk analysis ──────────────────────────────────── */}
                <section>
                  <SectionHeading>Risk Analysis</SectionHeading>
                  <div className={cn(
                    "border rounded-xl p-5",
                    RISK_SECTION_BG[calc.riskLevel] ?? "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className={cn(
                        "h-5 w-5 shrink-0",
                        RISK_ICON_COLOR[calc.riskLevel] ?? "text-slate-500"
                      )} />
                      <span className="font-semibold text-slate-800">Risk Assessment</span>
                      <Badge className={cn("text-xs ml-1", RISK_BADGE[calc.riskLevel] ?? "")}>
                        {calc.riskLevel}
                      </Badge>
                    </div>
                    {calc.riskMessages.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-700 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>No engineering risks detected. Design is within all tolerances.</span>
                      </div>
                    ) : (
                      <ul className="space-y-2 mt-1">
                        {calc.riskMessages.map((msg, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                            <span className={cn(
                              "mt-1.5 h-2 w-2 rounded-full shrink-0",
                              RISK_BADGE[calc.riskLevel]?.includes("red") ? "bg-red-500"
                                : RISK_BADGE[calc.riskLevel]?.includes("orange") ? "bg-orange-500"
                                : RISK_BADGE[calc.riskLevel]?.includes("yellow") ? "bg-yellow-500"
                                : "bg-blue-500"
                            )} />
                            {msg}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                {/* ── Recommendation ─────────────────────────────────── */}
                <section>
                  <SectionHeading>Recommendation</SectionHeading>
                  <div className="flex items-start gap-4 p-5 border border-blue-100 rounded-xl bg-blue-50/60">
                    <div className="bg-blue-100 rounded-lg p-2 shrink-0">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed pt-0.5">
                      {calc.recommendation}
                    </p>
                  </div>
                </section>

                {/* ── Divider ────────────────────────────────────────── */}
                <Separator className="bg-slate-200" />

                {/* ── Footer disclaimer ──────────────────────────────── */}
                <footer className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Server className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Disclaimer</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        This report is for early-stage planning only and does not replace stamped
                        engineering review. All capacity, cost, and risk figures are estimates
                        derived from parametric modeling inputs. Engage a licensed professional
                        engineer before making procurement, construction, or operational decisions
                        based on this analysis. RackScale makes no warranty, express or implied,
                        regarding the accuracy or completeness of these results.
                      </p>
                      <p className="text-xs text-slate-300 mt-2">
                        Generated by RackScale · {generatedDate}
                      </p>
                    </div>
                  </div>
                </footer>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
