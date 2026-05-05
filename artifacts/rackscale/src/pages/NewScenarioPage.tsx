import { useState } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { useLocation, Link, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createScenario, createScenarioResult, listAllScenariosWithProject } from "@/lib/supabase-projects";
import { computeScenario } from "@/lib/calculations";
import { calculateScenario } from "@/lib/calculateScenario";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import { getScenarioLimit, canUseFacilityConstraints } from "@/lib/featureAccess";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription,
  FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Layers, Zap, Snowflake,
  DollarSign, CheckCircle2, AlertCircle, Loader2,
  Lock, ArrowUpRight, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1 — Capacity
  name: z.string().min(1, "Scenario name is required."),
  description: z.string().optional(),
  rackCount: z.coerce.number().min(1, "Must have at least 1 rack.").max(10000),
  kwPerRack: z.coerce.number().min(0.5, "Minimum 0.5 kW/rack.").max(200),
  growthBufferPct: z.coerce.number().min(0).max(100),
  // Step 2 — Power
  redundancyType: z.enum(["N", "N+1", "2N"]),
  utilityFeed: z.enum(["single", "dual"]),
  upsType: z.enum(["centralized", "distributed"]),
  // Step 3 — Cooling
  coolingType: z.enum(["air", "hybrid", "liquid"]),
  pueTarget: z.coerce.number().min(1.0, "PUE must be ≥ 1.0").max(3.0, "PUE must be ≤ 3.0"),
  containmentType: z.enum(["none", "hot_aisle", "cold_aisle"]),
  // Step 4 — Cost
  costPerMw: z.coerce.number().min(0),
  costPerRack: z.coerce.number().min(0),
  // Step 5 — Facility Constraints (all optional; validated conditionally on submit)
  sqftPerFloor: z.coerce.number().optional(),
  floorLevel: z.coerce.number().optional(),
  floorsUsed: z.coerce.number().optional(),
  flooringType: z.enum(["Slab", "Raised Floor", "Structural Grid", "Other"]).optional(),
  serverSpacingFt: z.coerce.number().optional(),
  ceilingHeightFt: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Capacity",  icon: Layers,    fields: ["name","description","rackCount","kwPerRack","growthBufferPct"] },
  { label: "Power",     icon: Zap,       fields: ["redundancyType","utilityFeed","upsType"] },
  { label: "Cooling",   icon: Snowflake, fields: ["coolingType","pueTarget","containmentType"] },
  { label: "Cost",      icon: DollarSign,fields: ["costPerMw","costPerRack"] },
  { label: "Facility",  icon: Building2, fields: [] },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewScenarioPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [facilityEnabled, setFacilityEnabled] = useState(false);

  // ── Plan gate ────────────────────────────────────────────────────────────
  const { companyId, plan } = useCompanyPlan();
  const effectiveLimit = getScenarioLimit(plan);
  const hasFacility = canUseFacilityConstraints(plan);

  const { data: allScenarios, isLoading: scenariosLoading } = useQuery({
    queryKey: ["allScenarios", companyId],
    queryFn: () => listAllScenariosWithProject(100),
    enabled: !!companyId,
  });

  const scenarioCount = allScenarios?.length ?? 0;
  const atLimit = !scenariosLoading && effectiveLimit !== null && scenarioCount >= effectiveLimit;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      rackCount: 20,
      kwPerRack: 10,
      growthBufferPct: 20,
      redundancyType: "N+1",
      utilityFeed: "dual",
      upsType: "centralized",
      coolingType: "air",
      pueTarget: 1.5,
      containmentType: "hot_aisle",
      costPerMw: 5000000,
      costPerRack: 15000,
    },
    mode: "onTouched",
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // 0. Pre-flight: re-check limit at submission time
      const fresh = await listAllScenariosWithProject(100);
      const freshLimit = getScenarioLimit(plan);
      if (freshLimit !== null && fresh.length >= freshLimit) {
        throw new Error(
          `You've reached the Free plan limit of ${freshLimit} scenarios. Upgrade to Pro to create unlimited scenarios and unlock advanced design validation.`
        );
      }

      const fcEnabled = facilityEnabled && hasFacility;

      // 1. Save scenario
      const scenario = await createScenario({
        project_id: projectId,
        name: values.name,
        description: values.description,
        rack_count: values.rackCount,
        avg_power_per_rack_kw: values.kwPerRack,
        pue_target: values.pueTarget,
        cooling_type: values.coolingType,
        redundancy_level: values.redundancyType,
        growth_buffer_pct: values.growthBufferPct,
        utility_feed: values.utilityFeed,
        ups_type: values.upsType,
        containment_type: values.containmentType,
        cost_per_mw: values.costPerMw,
        cost_per_rack: values.costPerRack,
        facility_constraints_enabled: fcEnabled,
        sqft_per_floor: fcEnabled ? (values.sqftPerFloor ?? null) : null,
        floor_level: fcEnabled ? (values.floorLevel ?? null) : null,
        floors_used: fcEnabled ? (values.floorsUsed ?? null) : null,
        flooring_type: fcEnabled ? (values.flooringType ?? null) : null,
        server_spacing_ft: fcEnabled ? (values.serverSpacingFt ?? null) : null,
        ceiling_height_ft: fcEnabled ? (values.ceilingHeightFt ?? null) : null,
      });

      // 2. Core power / cost metrics
      const result = computeScenario({
        rackCount: values.rackCount,
        kwPerRack: values.kwPerRack,
        growthBufferPct: values.growthBufferPct,
        redundancyType: values.redundancyType,
        utilityFeed: values.utilityFeed,
        upsType: values.upsType,
        coolingType: values.coolingType,
        pueTarget: values.pueTarget,
        containmentType: values.containmentType,
        costPerMw: values.costPerMw,
        costPerRack: values.costPerRack,
      });

      // 2b. Facility constraints engine
      const facilityResult = calculateScenario({
        rackCount: values.rackCount,
        kwPerRack: values.kwPerRack,
        growthBufferPercent: values.growthBufferPct,
        redundancyType: values.redundancyType,
        coolingType: values.coolingType,
        costPerMw: values.costPerMw,
        costPerRack: values.costPerRack,
        facilityConstraintsEnabled: fcEnabled,
        sqftPerFloor: fcEnabled ? values.sqftPerFloor : undefined,
        floorLevel: fcEnabled ? values.floorLevel : undefined,
        floorsUsed: fcEnabled ? values.floorsUsed : undefined,
        flooringType: fcEnabled ? values.flooringType : undefined,
        serverSpacingFt: fcEnabled ? values.serverSpacingFt : undefined,
        ceilingHeightFt: fcEnabled ? values.ceilingHeightFt : undefined,
      });

      // 3. Save result
      await createScenarioResult({
        scenario_id: scenario.id,
        total_it_load_kw: result.totalItLoadKw,
        total_power_draw_kw: result.totalPowerDrawKw,
        cooling_capacity_required_kw: result.coolingCapacityRequiredKw,
        estimated_annual_cost_usd: result.estimatedAnnualCostUsd,
        carbon_footprint_mt_co2: result.carbonFootprintMtCo2,
        efficiency_rating: result.efficiencyRating,
        risk_flags: result.riskFlags,
        overall_risk_level: result.overallRiskLevel,
        total_available_sqft: facilityResult.totalAvailableSqft,
        estimated_rack_footprint_sqft: facilityResult.estimatedRackFootprintSqft,
        space_utilization_percent: facilityResult.spaceUtilizationPercent,
        physical_fit_status: facilityResult.physicalFitStatus,
        facility_risk_messages: facilityResult.facilityRiskMessages,
      });

      return scenario;
    },
    onSuccess: (scenario) => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      setLocation(`/projects/${projectId}/scenarios/${scenario.id}`);
    },
    onError: (err: Error) => {
      setSubmitError(err.message);
    },
  });

  // Advance to next step after validating current step's fields
  const handleNext = async () => {
    const fields = STEPS[step].fields as readonly (keyof FormValues)[];
    const valid =
      fields.length > 0
        ? await form.trigger([...fields] as (keyof FormValues)[])
        : true;
    if (valid) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const onSubmit = (values: FormValues) => {
    // Validate facility fields when the toggle is on
    if (facilityEnabled && hasFacility) {
      let hasErrors = false;
      if (!values.sqftPerFloor || values.sqftPerFloor <= 0) {
        form.setError("sqftPerFloor", { message: "Must be greater than 0." });
        hasErrors = true;
      }
      if (!values.floorLevel || values.floorLevel < 1) {
        form.setError("floorLevel", { message: "Must be at least 1." });
        hasErrors = true;
      }
      if (!values.floorsUsed || values.floorsUsed < 1) {
        form.setError("floorsUsed", { message: "Must be at least 1." });
        hasErrors = true;
      }
      if (!values.serverSpacingFt || values.serverSpacingFt <= 0) {
        form.setError("serverSpacingFt", { message: "Must be greater than 0." });
        hasErrors = true;
      }
      if (!values.ceilingHeightFt || values.ceilingHeightFt <= 0) {
        form.setError("ceilingHeightFt", { message: "Must be greater than 0." });
        hasErrors = true;
      }
      if (hasErrors) return;
    }
    setSubmitError(null);
    mutation.mutate(values);
  };

  // ── Plan gate render ─────────────────────────────────────────────────────

  if (atLimit) {
    return (
      <SidebarLayout>
        <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
            </Button>
          </Link>

          <div className="flex flex-col items-center text-center py-16 px-8 border-2 border-dashed rounded-2xl bg-muted/10">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
              <Lock className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Scenario limit reached</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              You've reached the Free plan limit of {effectiveLimit} scenarios. Upgrade to Pro to create unlimited scenarios and unlock advanced design validation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/billing">
                <Button data-testid="btn-upgrade-cta">
                  <ArrowUpRight className="h-4 w-4 mr-2" /> View Upgrade Options
                </Button>
              </Link>
              <Link href={`/projects/${projectId}`}>
                <Button variant="outline">Back to Project</Button>
              </Link>
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SidebarLayout>
      <div className="p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* Page header */}
        <div>
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-4 text-muted-foreground" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">New Scenario</h1>
          <p className="text-muted-foreground">Configure a design scenario to model power, cooling, and cost.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            const isFacilityStep = i === 4;
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => done && setStep(i)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2",
                    done && "cursor-pointer"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary bg-primary/10 text-primary",
                    !active && !done && "border-muted-foreground/30 text-muted-foreground bg-muted/20"
                  )}>
                    {done
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    <span className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                    {isFacilityStep && !hasFacility && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1 leading-tight">Pro</span>
                    )}
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-1 transition-colors",
                    i < step ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* ── Step 1: Capacity ── */}
            {step === 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <CardTitle>Capacity</CardTitle>
                  </div>
                  <CardDescription>Define the scale and growth expectations of this scenario.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scenario Name</FormLabel>
                      <FormControl><Input placeholder="e.g. High-Density GPU Cluster" {...field} data-testid="input-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the design intent or hypothesis..." rows={2} className="resize-none" {...field} data-testid="input-desc" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="rackCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rack Count</FormLabel>
                        <FormControl><Input type="number" {...field} data-testid="input-rack-count" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="kwPerRack" render={({ field }) => (
                      <FormItem>
                        <FormLabel>kW per Rack</FormLabel>
                        <FormControl><Input type="number" step="0.5" {...field} data-testid="input-kw-per-rack" /></FormControl>
                        <FormDescription>0.5 – 200 kW</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="growthBufferPct" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Growth Buffer %</FormLabel>
                        <FormControl><Input type="number" min="0" max="100" {...field} data-testid="input-growth" /></FormControl>
                        <FormDescription>Future headroom</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 2: Power ── */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle>Power</CardTitle>
                  </div>
                  <CardDescription>Configure redundancy, utility feed, and UPS topology.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField control={form.control} name="redundancyType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redundancy Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-redundancy"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="N">N — No Redundancy</SelectItem>
                          <SelectItem value="N+1">N+1 — Concurrent Maintainable</SelectItem>
                          <SelectItem value="2N">2N — Fully Fault Tolerant</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="utilityFeed" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utility Feed</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-utility"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single">Single Feed</SelectItem>
                          <SelectItem value="dual">Dual Feed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="upsType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPS Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ups"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="centralized">Centralized UPS</SelectItem>
                          <SelectItem value="distributed">Distributed UPS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Cooling ── */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Snowflake className="h-5 w-5 text-primary" />
                    <CardTitle>Cooling</CardTitle>
                  </div>
                  <CardDescription>Set the thermal management strategy and efficiency target.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField control={form.control} name="coolingType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cooling Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cooling"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="air">Air (CRAC/CRAH)</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="liquid">Direct Liquid (DLC)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pueTarget" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target PUE</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} data-testid="input-pue" /></FormControl>
                      <FormDescription>Power Usage Effectiveness — 1.0 is ideal, 1.5 is industry average</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="containmentType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Containment Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-containment"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="hot_aisle">Hot Aisle Containment</SelectItem>
                          <SelectItem value="cold_aisle">Cold Aisle Containment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* ── Step 4: Cost ── */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <CardTitle>Cost</CardTitle>
                  </div>
                  <CardDescription>Enter capital cost estimates to calculate total CapEx.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField control={form.control} name="costPerMw" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per MW (USD)</FormLabel>
                      <FormControl><Input type="number" step="100000" {...field} data-testid="input-cost-mw" /></FormControl>
                      <FormDescription>Capital cost per MW of total IT load capacity</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="costPerRack" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Rack (USD)</FormLabel>
                      <FormControl><Input type="number" step="1000" {...field} data-testid="input-cost-rack" /></FormControl>
                      <FormDescription>Hardware and infrastructure cost per rack unit</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* ── Step 5: Facility Constraints ── */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle>Facility Constraints</CardTitle>
                    {!hasFacility && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs font-semibold">
                        Pro
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Validate physical space and structural constraints for your data center design.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!hasFacility ? (
                    /* ── Locked (Free plan) ── */
                    <div className="flex flex-col items-center text-center py-10 px-6 rounded-xl border-2 border-dashed bg-muted/10 space-y-4">
                      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1">Pro feature</p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Facility Constraints are available on Pro and higher. Validate floor area, spacing, ceiling height, and flooring type against your rack design.
                        </p>
                      </div>
                      <Link href="/billing">
                        <Button size="sm" data-testid="btn-upgrade-facility">
                          <ArrowUpRight className="h-4 w-4 mr-2" /> Upgrade to Pro
                        </Button>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        You can still run the analysis without facility constraints.
                      </p>
                    </div>
                  ) : (
                    /* ── Unlocked (Pro / Team / Enterprise) ── */
                    <div className="space-y-5">
                      {/* Toggle */}
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                        <Switch
                          id="facility-toggle"
                          checked={facilityEnabled}
                          onCheckedChange={setFacilityEnabled}
                          data-testid="switch-facility"
                        />
                        <label
                          htmlFor="facility-toggle"
                          className="text-sm font-medium cursor-pointer select-none"
                        >
                          Enable Facility Constraints Review
                        </label>
                      </div>

                      {/* Fields — shown only when enabled */}
                      {facilityEnabled && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="sqftPerFloor" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sq ft per Floor</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" step="100" placeholder="e.g. 10000" {...field} data-testid="input-sqft" />
                                </FormControl>
                                <FormDescription>Usable floor area available for racks and supporting infrastructure.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="floorsUsed" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Floors Used</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" step="1" placeholder="e.g. 2" {...field} data-testid="input-floors-used" />
                                </FormControl>
                                <FormDescription>Number of floors included in this scenario.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="floorLevel" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Floor Level</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" step="1" placeholder="e.g. 1" {...field} data-testid="input-floor-level" />
                                </FormControl>
                                <FormDescription>The building level where this deployment is located.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="flooringType" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Flooring Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-flooring">
                                      <SelectValue placeholder="Select flooring type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Slab">Slab</SelectItem>
                                    <SelectItem value="Raised Floor">Raised Floor</SelectItem>
                                    <SelectItem value="Structural Grid">Structural Grid</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>Used to flag potential structural or raised-floor review needs.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="serverSpacingFt" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Server Spacing (ft)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0.5" step="0.5" placeholder="e.g. 4" {...field} data-testid="input-spacing" />
                                </FormControl>
                                <FormDescription>Approximate spacing between racks/rows for access, airflow, and serviceability.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="ceilingHeightFt" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ceiling Height (ft)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" step="0.5" placeholder="e.g. 12" {...field} data-testid="input-ceiling" />
                                </FormControl>
                                <FormDescription>Used to identify potential airflow and cooling constraints.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground border-t pt-4">
                    Facility Constraints are intended for preliminary planning review and do not replace stamped engineering analysis.
                  </p>

                  {/* Submit error shown on the final step */}
                  {submitError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Navigation ── */}
            <div className="flex justify-between mt-6">
              <div>
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={handleBack} data-testid="btn-back-step">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Link href={`/projects/${projectId}`}>
                  <Button type="button" variant="ghost">Cancel</Button>
                </Link>
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNext} data-testid="btn-next">
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={mutation.isPending} data-testid="btn-submit">
                    {mutation.isPending
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running Analysis...</>
                      : "Run Analysis"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </SidebarLayout>
  );
}
