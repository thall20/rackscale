import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user } = useAuth();

  const emailName = user?.email?.split("@")[0] ?? "—";
  const emailDomain = user?.email?.split("@")[1] ?? "—";

  return (
    <SidebarLayout>
      <div className="p-6 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account preferences and notification settings.</p>
        </div>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details from Supabase auth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="p-2 border rounded-md bg-muted/50 text-sm font-mono">{emailName}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Domain</Label>
                    <div className="p-2 border rounded-md bg-muted/50 text-sm font-mono">{emailDomain}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="p-2 border rounded-md bg-muted/50 text-sm font-mono">
                    {user?.email ?? "—"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Account ID</Label>
                  <div className="p-2 border rounded-md bg-muted/50 text-sm font-mono text-muted-foreground truncate">
                    {user?.id ?? "—"}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Profile editing is not available in the current version.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure risk alerts and system messages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="critical-alerts" className="flex flex-col space-y-1">
                    <span>Critical Risk Alerts</span>
                    <span className="font-normal text-sm text-muted-foreground">Receive immediate emails for critical capacity or cooling risks.</span>
                  </Label>
                  <Switch id="critical-alerts" defaultChecked data-testid="switch-critical-alerts" />
                </div>
                <Separator />
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="project-updates" className="flex flex-col space-y-1">
                    <span>Project Updates</span>
                    <span className="font-normal text-sm text-muted-foreground">Weekly digest of project status changes and scenario comparisons.</span>
                  </Label>
                  <Switch id="project-updates" defaultChecked data-testid="switch-project-updates" />
                </div>
                <Separator />
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="system-maintenance" className="flex flex-col space-y-1">
                    <span>System Maintenance</span>
                    <span className="font-normal text-sm text-muted-foreground">Notifications about RackScale platform updates and downtime.</span>
                  </Label>
                  <Switch id="system-maintenance" defaultChecked data-testid="switch-system-maintenance" />
                </div>
              </div>
              <Button disabled>Save Preferences</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible account actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Account deletion and data export are not available in the current version.
              </p>
              <Button variant="destructive" disabled>Delete Account</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
