import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";

import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import NewProjectPage from "@/pages/NewProjectPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import NewScenarioPage from "@/pages/NewScenarioPage";
import ScenarioResultPage from "@/pages/ScenarioResultPage";
import CompareScenariosPage from "@/pages/CompareScenariosPage";
import ExportReportPage from "@/pages/ExportReportPage";
import BillingPage from "@/pages/BillingPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/projects/new" component={NewProjectPage} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/projects/:projectId/scenarios/new" component={NewScenarioPage} />
      <Route path="/projects/:projectId/scenarios/:id" component={ScenarioResultPage} />
      <Route path="/projects/:projectId/compare" component={CompareScenariosPage} />
      <Route path="/projects/:projectId/scenarios/:id/report" component={ExportReportPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
