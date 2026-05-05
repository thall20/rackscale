import { Link } from "wouter";
import { Lock, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type UpgradePromptProps = {
  title: string;
  description: string;
  featureName: string;
  ctaText?: string;
  compact?: boolean;
  className?: string;
};

export function UpgradePrompt({
  title,
  description,
  featureName,
  ctaText = "Upgrade to Pro",
  compact = false,
  className,
}: UpgradePromptProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-4 rounded-lg border bg-card px-4 py-3",
          className
        )}
        data-testid={`upgrade-prompt-${featureName}`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0">Pro</Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        </div>
        <Link href="/billing" className="shrink-0">
          <Button size="sm" className="gap-1.5 whitespace-nowrap">
            {ctaText}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center rounded-2xl border-2 border-dashed bg-card px-8 py-14",
        className
      )}
      data-testid={`upgrade-prompt-${featureName}`}
    >
      {/* Icon badge */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-5">
        <Lock className="h-7 w-7 text-primary" />
      </div>

      {/* Plan badge */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <Badge className="text-xs px-2.5">Pro Feature</Badge>
      </div>

      {/* Heading */}
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-8">
        {description}
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/billing">
          <Button data-testid={`btn-upgrade-${featureName}`} className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            {ctaText}
          </Button>
        </Link>
        <Link href="/billing">
          <Button variant="outline">View All Plans</Button>
        </Link>
      </div>
    </div>
  );
}
