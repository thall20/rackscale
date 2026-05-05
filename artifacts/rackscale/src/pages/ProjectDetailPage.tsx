import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getProject, listScenarios } from "@/lib/supabase-projects";
import { useAuth } from "@/contexts/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Activity, Plus, GitCompare, Settings2, MapPin, Calendar, Zap, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { companyId } = useAuth();

  const { data: project, isLoading: projectLoading, isError: projectError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: !!id && !!companyId,
  });

  const { data: scenarios, isLoading: scenariosLoading, isError: scenariosError } = useQuery({
    queryKey: ["scenarios", id],
    queryFn: () => listScenarios(id),
    enabled: !!id && !!companyId,
  });

  const statusVariant = (status: string) => {
    if (status === "active") return "default" as const;
    if (status === "draft") return "secondary" as const;
    return "outline" as const;
  };

  const anyError = projectError || scenariosError;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Error banner */}
        {anyError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {projectError
                ? "Failed to load project. It may have been deleted or you may not have access."
                : "Failed to load scenarios. Please refresh the page."}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="mb-4 -ml-4 text-muted-foreground" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
            </Button>
          </Link>

          {projectLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ) : project ? (
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                  <Badge variant={statusVariant(project.status)}>{project.status.toUpperCase()}</Badge>
                </div>
                {project.description && (
                  <p className="text-muted-foreground max-w-2xl">{project.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/projects/${id}/scenarios/new`}>
                  <Button data-testid="btn-new-scenario">
                    <Plus className="h-4 w-4 mr-2" /> New Scenario
                  </Button>
                </Link>
                {scenarios && scenarios.length > 1 && (
                  <Link href={`/projects/${id}/compare`}>
                    <Button variant="outline" data-testid="btn-compare">
                      <GitCompare className="h-4 w-4 mr-2" /> Compare
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar details */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : project ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location
                      </p>
                      <p className="text-sm">{project.location || "Not specified"}</p>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Last Updated
                      </p>
                      <p className="text-sm">{new Date(project.updated_at).toLocaleDateString()}</p>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Scenarios
                      </p>
                      <p className="text-sm font-mono">{scenarios?.length ?? 0}</p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Scenarios list */}
          <div className="md:col-span-3">
            <Card className="h-full border-muted/60">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Design Scenarios</CardTitle>
                </div>
                <CardDescription>Different configurations and analyses for this project.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {scenariosLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : !scenarios || scenarios.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Settings2 className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No scenarios yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                      Create your first design scenario to begin modeling power and cooling requirements.
                    </p>
                    <Link href={`/projects/${id}/scenarios/new`}>
                      <Button>Create Scenario</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {scenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                        data-testid={`scenario-row-${scenario.id}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-base font-semibold truncate">{scenario.name}</p>
                          {scenario.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{scenario.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-muted-foreground flex-wrap">
                            <span>{scenario.rack_count} Racks</span>
                            <span>•</span>
                            <span>{scenario.avg_power_per_rack_kw} kW/Rack</span>
                            <span>•</span>
                            <span className="uppercase">{scenario.cooling_type} Cooling</span>
                          </div>
                        </div>
                        <Link href={`/projects/${id}/scenarios/${scenario.id}`}>
                          <Button variant="secondary" size="sm" className="shrink-0">
                            View Results
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
