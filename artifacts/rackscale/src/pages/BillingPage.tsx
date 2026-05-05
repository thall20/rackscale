import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { useQuery } from "@tanstack/react-query";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import { listAllScenariosWithProject } from "@/lib/supabase-projects";
import type { CompanyPlan } from "@/lib/plans";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Lock, Zap, Users, Building2, Star,
  CreditCard, ArrowUpRight, Info,
} from "lucide-react";

// ── Plan definitions ──────────────────────────────────────────────────────────

type PlanDef = {
  id: CompanyPlan;
  name: string;
  price: string;
  priceNote: string;
  scenarioLimit: number | null;
  features: string[];
  cta: string;
  ctaVariant: "default" | "outline" | "ghost";
  highlighted?: boolean;
  icon: React.ElementType;
};

const PLAN_DEFS: PlanDef[] = [
  {
    id: "Free",
    name: "Free",
    price: "$0",
    priceNote: "forever",
    scenarioLimit: 3,
    icon: Star,
    features: [
      "3 scenarios",
      "Basic scenario modeling",
      "Power, cooling & cost outputs",
      "Basic risk flags",
    ],
    cta: "Current Plan",
    ctaVariant: "outline",
  },
  {
    id: "Pro",
    name: "Pro",
    price: "$99",
    priceNote: "per month",
    scenarioLimit: null,
    icon: Zap,
    highlighted: true,
    features: [
      "Unlimited scenarios",
      "Facility Constraints Review",
      "Full scenario comparison",
      "Enhanced recommendations",
      "Export / report preview",
    ],
    cta: "Upgrade to Pro",
    ctaVariant: "default",
  },
  {
    id: "Team",
    name: "Team",
    price: "$299",
    priceNote: "per month",
    scenarioLimit: null,
    icon: Users,
    features: [
      "Everything in Pro",
      "Multi-user company workspace",
      "Shared projects",
      "Team scenario history",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline",
  },
  {
    id: "Enterprise",
    name: "Enterprise",
    price: "Custom",
    priceNote: "contact us",
    scenarioLimit: null,
    icon: Building2,
    features: [
      "Everything in Team",
      "Workflow integrations",
      "Custom assumptions",
      "Priority support",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline",
  },
];

const PLAN_ORDER: CompanyPlan[] = ["Free", "Pro", "Team", "Enterprise"];

function planRank(p: CompanyPlan) {
  return PLAN_ORDER.indexOf(p);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { companyId, plan: currentPlan, planStatus, scenarioLimit } = useCompanyPlan();

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["allScenarios", companyId],
    queryFn: () => listAllScenariosWithProject(100),
    enabled: !!companyId,
  });

  const scenarioCount = scenarios?.length ?? 0;
  const usagePct = scenarioLimit > 0
    ? Math.min(100, Math.round((scenarioCount / scenarioLimit) * 100))
    : 0;

  const currentDef = PLAN_DEFS.find((p) => p.id === currentPlan) ?? PLAN_DEFS[0];
  const isFreePlan = currentPlan === "Free";

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto w-full space-y-10">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Plan</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and usage. Payments via Stripe coming soon.
          </p>
        </div>

        {/* ── Facility Constraints notice ───────────────────────────────── */}
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-foreground">
            <span className="font-semibold">Facility Constraints</span> are available on{" "}
            <span className="font-semibold text-primary">Pro and higher.</span>{" "}
            Upgrade to validate your designs against real-world power, cooling, and space limits.
          </AlertDescription>
        </Alert>

        {/* ── Current plan card ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">
                    Current Plan
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{currentDef.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {currentDef.price}{currentPlan !== "Free" && currentPlan !== "Enterprise" ? "/mo" : ""}
                    </Badge>
                    {planStatus === "trialing" && (
                      <Badge className="text-xs bg-amber-500 text-white">Trial</Badge>
                    )}
                    {planStatus === "past_due" && (
                      <Badge variant="destructive" className="text-xs">Past Due</Badge>
                    )}
                  </div>
                </div>
              </div>
              {isFreePlan && (
                <Button size="sm" variant="outline" className="opacity-60 pointer-events-none" disabled>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Upgrade — coming soon
                </Button>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-5 space-y-4">
            {/* Usage bar — only for free plan */}
            {isFreePlan && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">Scenario usage</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-20" />
                  ) : (
                    <span className={cn(
                      "font-mono font-semibold",
                      usagePct >= 100 ? "text-destructive" : usagePct >= 66 ? "text-amber-600" : "text-foreground"
                    )}>
                      {scenarioCount} / {scenarioLimit}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      usagePct >= 100 ? "bg-destructive" : usagePct >= 66 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                {usagePct >= 100 && (
                  <p className="text-xs text-destructive mt-2 font-medium">
                    Scenario limit reached. Upgrade to Pro to create unlimited scenarios.
                  </p>
                )}
              </div>
            )}

            {/* Feature list */}
            <div>
              <p className="text-sm font-medium mb-2">Included in your plan</p>
              <ul className="space-y-1.5">
                {currentDef.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* ── Plan comparison grid ──────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-1">All Plans</h2>
          <p className="text-sm text-muted-foreground mb-5">
            All plans include access to the core calculation engine. Upgrade for advanced design validation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLAN_DEFS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = plan.id === currentPlan;
              const isUpgrade = !isCurrent && planRank(plan.id) > planRank(currentPlan);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative border rounded-2xl p-6 flex flex-col gap-4 transition-all",
                    plan.highlighted && !isCurrent
                      ? "border-primary/60 shadow-lg shadow-primary/5"
                      : "border-border",
                    isCurrent && "border-green-500/50 bg-green-50/40"
                  )}
                  data-testid={`plan-card-${plan.id.toLowerCase()}`}
                >
                  {/* Top badges */}
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    {isCurrent && (
                      <Badge className="bg-green-600 text-white text-xs">Current</Badge>
                    )}
                    {plan.highlighted && !isCurrent && (
                      <Badge className="bg-primary text-primary-foreground text-xs">Popular</Badge>
                    )}
                  </div>

                  {/* Icon + name */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        isCurrent ? "bg-green-100" : plan.highlighted ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          isCurrent ? "text-green-600" : plan.highlighted ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className="font-bold text-base">{plan.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">{plan.price}</span>
                      {plan.priceNote && (
                        <span className="text-xs text-muted-foreground">/{plan.priceNote}</span>
                      )}
                    </div>
                  </div>

                  {/* Scenario limit pill */}
                  <div className={cn(
                    "text-xs px-2.5 py-1 rounded-full inline-flex w-fit font-medium",
                    plan.scenarioLimit === null
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {plan.scenarioLimit === null ? "Unlimited scenarios" : `${plan.scenarioLimit} scenarios`}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className={cn(
                          "h-4 w-4 shrink-0 mt-0.5",
                          isCurrent ? "text-green-500" : "text-muted-foreground"
                        )} />
                        <span className={isCurrent ? "text-foreground" : "text-muted-foreground"}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="pt-2">
                    {isCurrent ? (
                      <Button
                        variant="outline"
                        className="w-full border-green-500/50 text-green-700 hover:bg-green-50"
                        disabled
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Active Plan
                      </Button>
                    ) : !isUpgrade ? (
                      <Button variant="ghost" className="w-full text-muted-foreground" disabled>
                        <Lock className="h-4 w-4 mr-2" /> Downgrade
                      </Button>
                    ) : plan.id === "Pro" ? (
                      <Button
                        className="w-full"
                        variant="default"
                        disabled
                        data-testid="btn-upgrade-pro"
                      >
                        <ArrowUpRight className="h-4 w-4 mr-2" /> {plan.cta}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled
                        data-testid={`btn-contact-${plan.id.toLowerCase()}`}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="text-center space-y-1 pb-4">
          <p className="text-xs text-muted-foreground">
            Stripe payment integration coming soon. Contact{" "}
            <a href="mailto:sales@juicedatasolutions.com" className="underline underline-offset-2 hover:text-foreground transition-colors">
              sales@juicedatasolutions.com
            </a>{" "}
            to discuss Pro, Team, or Enterprise access.
          </p>
          <p className="text-xs text-muted-foreground">
            All plans include a 14-day money-back guarantee once billing is live.
          </p>
        </div>

      </div>
    </SidebarLayout>
  );
}
