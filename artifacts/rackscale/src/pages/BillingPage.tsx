import { useState } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { listAllScenariosWithProject } from "@/lib/supabase-projects";
import {
  PLANS, getCurrentPlan,
  getPlanTier, type PlanId,
} from "@/lib/plans";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Lock, Zap, Users, Star,
  CreditCard, ArrowUpRight,
} from "lucide-react";

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free: Star,
  pro: Zap,
  team: Users,
};

export default function BillingPage() {
  const { companyId } = useAuth();
  const [currentPlan] = useState<PlanId>(getCurrentPlan);
  const currentTier = getPlanTier(currentPlan);

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["allScenarios", companyId],
    queryFn: () => listAllScenariosWithProject(100),
    enabled: !!companyId,
  });

  const scenarioCount = scenarios?.length ?? 0;
  const usagePct = currentTier.scenarioLimit
    ? Math.min(100, Math.round((scenarioCount / currentTier.scenarioLimit) * 100))
    : 0;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto w-full space-y-10">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Plan</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and usage limits.
          </p>
        </div>

        {/* ── Current plan summary ─────────────────────────────────────── */}
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
                    <span className="text-xl font-bold">{currentTier.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {currentTier.price}{currentTier.id !== "free" ? "/mo" : ""}
                    </Badge>
                  </div>
                </div>
              </div>
              {currentPlan !== "team" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled className="pointer-events-none opacity-60" size="sm">
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        {currentPlan === "free" ? "Upgrade to Pro" : "Upgrade to Team"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Stripe integration coming soon.</TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-5 space-y-4">
            {/* Usage bar — only for free plan */}
            {currentTier.scenarioLimit !== null && (
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
                      {scenarioCount} / {currentTier.scenarioLimit}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      usagePct >= 100 ? "bg-destructive"
                        : usagePct >= 66 ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
                {usagePct >= 100 && (
                  <p className="text-xs text-destructive mt-2 font-medium">
                    Scenario limit reached. Upgrade to Pro to create more.
                  </p>
                )}
              </div>
            )}

            {/* Feature list */}
            <div>
              <p className="text-sm font-medium mb-2">Included in your plan</p>
              <ul className="space-y-1.5">
                {currentTier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* ── Plan comparison cards ─────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">All Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PLANS.map((plan) => {
              const Icon = PLAN_ICONS[plan.id];
              const isCurrent = plan.id === currentPlan;
              const isUpgrade = !isCurrent && (
                (currentPlan === "free") ||
                (currentPlan === "pro" && plan.id === "team")
              );
              const isDowngrade = !isCurrent && !isUpgrade;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative border rounded-2xl p-6 flex flex-col gap-4 transition-all",
                    plan.highlighted && !isCurrent
                      ? "border-primary/50 shadow-md shadow-primary/5"
                      : "border-border",
                    isCurrent && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10"
                  )}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {/* Badges */}
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    {isCurrent && (
                      <Badge className="bg-green-600 text-white text-xs">Current</Badge>
                    )}
                    {plan.highlighted && !isCurrent && (
                      <Badge className="bg-primary text-primary-foreground text-xs">Popular</Badge>
                    )}
                  </div>

                  {/* Plan name & price */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        isCurrent ? "bg-green-100" : "bg-muted"
                      )}>
                        <Icon className={cn("h-4 w-4", isCurrent ? "text-green-600" : "text-muted-foreground")} />
                      </div>
                      <span className="font-bold text-base">{plan.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">/{plan.priceNote}</span>
                    </div>
                  </div>

                  {/* Scenario limit */}
                  <div className={cn(
                    "text-xs px-2.5 py-1 rounded-full inline-flex w-fit font-medium",
                    plan.scenarioLimit === null
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {plan.scenarioLimit === null
                      ? "Unlimited scenarios"
                      : `${plan.scenarioLimit} scenarios`}
                  </div>

                  {/* Feature list */}
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
                        className="w-full border-green-500/50 text-green-600 hover:bg-green-50"
                        disabled
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Active Plan
                      </Button>
                    ) : isDowngrade ? (
                      <Button variant="ghost" className="w-full text-muted-foreground" disabled>
                        <Lock className="h-4 w-4 mr-2" /> Downgrade
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block w-full">
                            <Button
                              className={cn(
                                "w-full pointer-events-none opacity-70",
                                plan.highlighted && "bg-primary text-primary-foreground"
                              )}
                              variant={plan.highlighted ? "default" : "outline"}
                              disabled
                              data-testid={`btn-upgrade-${plan.id}`}
                            >
                              {plan.cta}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Stripe integration coming soon.</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer note ──────────────────────────────────────────────── */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          Payments are processed securely via Stripe. All plans include a 14-day money-back guarantee.
          Stripe integration coming soon.
        </p>
      </div>
    </SidebarLayout>
  );
}
