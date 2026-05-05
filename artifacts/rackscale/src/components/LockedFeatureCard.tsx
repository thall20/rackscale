import { Link } from "wouter";
import { Lock, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompanyPlan } from "@/lib/plans";

export type LockedFeatureCardProps = {
  featureName: string;
  requiredPlan?: CompanyPlan;
  description: string;
  children?: React.ReactNode;
  className?: string;
};

const PLAN_BADGE_STYLES: Record<string, string> = {
  Pro: "bg-primary text-primary-foreground",
  Team: "bg-violet-600 text-white",
  Enterprise: "bg-slate-800 text-white",
};

export function LockedFeatureCard({
  featureName,
  requiredPlan = "Pro",
  description,
  children,
  className,
}: LockedFeatureCardProps) {
  const badgeStyle = PLAN_BADGE_STYLES[requiredPlan] ?? PLAN_BADGE_STYLES["Pro"];
  const ctaText = requiredPlan === "Pro" ? "Upgrade to Pro" : `Upgrade to ${requiredPlan}`;

  return (
    <Card
      className={cn("relative overflow-hidden border-border/80", className)}
      data-testid={`locked-feature-${featureName}`}
    >
      {/* Optional blurred children preview */}
      {children && (
        <div className="relative" aria-hidden="true">
          <div className="select-none pointer-events-none blur-sm opacity-40 saturate-50">
            {children}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
        </div>
      )}

      {/* Lock overlay */}
      <CardHeader className={cn("pb-3", children ? "pt-4" : "pt-6")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-foreground">{featureName}</span>
                <Badge className={cn("text-[10px] px-1.5 py-0 h-4", badgeStyle)}>
                  {requiredPlan}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>

      <CardFooter className="pt-0">
        <Link href="/billing" className="w-full">
          <Button size="sm" className="w-full gap-1.5" data-testid={`btn-unlock-${featureName}`}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            {ctaText}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
