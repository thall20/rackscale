import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  Loader2,
  CreditCard,
} from "lucide-react";
import { RackScaleLogo } from "@/components/RackScaleLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/useAuth";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    setLocation("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    { label: "Billing", href: "/billing", icon: CreditCard },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const NavLinks = () => (
    <>
      <div className="mb-8 px-2">
        <RackScaleLogo size="sm" />
      </div>
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
              <div
                className={`flex items-center px-4 py-3 rounded-md cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto pt-8 space-y-1">
        {user && (
          <div className="px-4 py-2 text-xs text-muted-foreground truncate" data-testid="user-email">
            {user.email}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-4 py-3 rounded-md cursor-pointer transition-colors text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
          data-testid="nav-logout"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r bg-sidebar p-4 z-10">
        <NavLinks />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-background flex items-center px-4 z-20">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2" data-testid="mobile-menu-btn">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4 flex flex-col bg-sidebar border-r-0">
            <NavLinks />
          </SheetContent>
        </Sheet>
        <RackScaleLogo size="sm" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:pl-64 pt-16 md:pt-0 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
