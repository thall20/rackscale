import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/supabase-projects";
import { useAuth } from "@/contexts/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, MapPin, Calendar, Plus, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectsPage() {
  const { companyId } = useAuth();

  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ["projects", companyId],
    queryFn: listProjects,
    enabled: !!companyId,
  });

  const statusVariant = (status: string) => {
    if (status === "active") return "default" as const;
    if (status === "draft") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">Manage your data center infrastructure designs.</p>
          </div>
          <Link href="/projects/new">
            <Button data-testid="btn-create-project">
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          </Link>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load projects. Please refresh the page.</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))
          ) : !projects || projects.length === 0 ? (
            <div className="col-span-full py-16 text-center border rounded-lg bg-muted/20 border-dashed">
              <Server className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first infrastructure project to begin modeling.
              </p>
              <Link href="/projects/new">
                <Button data-testid="btn-empty-state-create">Create Project</Button>
              </Link>
            </div>
          ) : (
            projects.map((project) => (
              <Card
                key={project.id}
                className="flex flex-col group hover:border-primary/50 transition-colors"
                data-testid={`project-card-${project.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl leading-tight">{project.name}</CardTitle>
                    <Badge variant={statusVariant(project.status)} className="shrink-0">
                      {project.status.toUpperCase()}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {project.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 shrink-0" />
                    {project.location || "Location unspecified"}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2 shrink-0" />
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-muted/50">
                  <Link href={`/projects/${project.id}`} className="w-full">
                    <Button variant="ghost" size="sm" className="w-full" data-testid={`btn-view-${project.id}`}>
                      View Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
