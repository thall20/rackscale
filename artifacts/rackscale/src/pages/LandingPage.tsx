import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Cpu, BarChart3, ChevronRight, Zap } from "lucide-react";
import { RackScaleLogo, RackIcon } from "@/components/RackScaleLogo";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [loading, user, setLocation]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <RackScaleLogo size="sm" />
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" data-testid="btn-nav-login">Log In</Button>
            </Link>
            <Link href="/login">
              <Button data-testid="btn-nav-signup">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden relative">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                <span>The new standard for data center design</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
                Precision engineering for <br className="hidden md:block"/>
                <span className="text-primary">high-density infrastructure.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                RackScale provides authoritative, engineering-grade modeling for modern data centers. Optimize power density, cooling, and PUE in a unified command environment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="h-14 px-8 text-base font-semibold" data-testid="btn-hero-cta">
                    Start Modeling <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold" data-testid="btn-hero-docs">
                  View Documentation
                </Button>
              </div>
            </div>
          </div>
          
          {/* Abstract geometric background decoration */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full opacity-20 pointer-events-none hidden lg:block">
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-background to-background"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-card border-y">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-bold mb-4 tracking-tight">Command your infrastructure.</h2>
              <p className="text-lg text-muted-foreground">Stop relying on disconnected spreadsheets. Bring your mechanical and electrical constraints into a single source of truth.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Activity,
                  title: "Dynamic Load Modeling",
                  desc: "Calculate total IT load, power draw, and cooling capacity requirements instantly across varying rack densities and redundancy levels."
                },
                {
                  icon: Cpu,
                  title: "Cooling Architecture",
                  desc: "Compare air, liquid, and hybrid cooling systems to hit ambitious PUE targets while maintaining required thermal envelopes."
                },
                {
                  icon: ShieldAlert,
                  title: "Automated Risk Analysis",
                  desc: "Identify critical capacity constraints and single points of failure before construction begins with integrated risk flagging."
                }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-lg border bg-background flex flex-col items-start transition-colors hover:border-primary/50">
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Analytics Section */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-bold mb-6 tracking-tight">Compare scenarios with precision.</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Run side-by-side analyses of different density configurations, redundancy models, and cooling strategies. Let the data dictate the optimal design for your performance and efficiency targets.
              </p>
              <ul className="space-y-4">
                {[
                  "Side-by-side metric comparison",
                  "Automated winner recommendations",
                  "Estimated annual cost analysis",
                  "CO2 emissions projections"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2 w-full">
              <div className="rounded-xl border bg-card p-2 shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50 rounded-xl pointer-events-none"></div>
                <div className="bg-background rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-6 pb-6 border-b">
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span>SCENARIO_COMPARISON_MATRIX</span>
                    </div>
                    <div className="text-xs text-muted-foreground">PROJECT: OMEGA_01</div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-muted-foreground w-1/3">Metric</span>
                      <span className="w-1/3 text-right">Air (N+1)</span>
                      <span className="w-1/3 text-right text-primary">Liquid (2N)</span>
                    </div>
                    {[
                      { label: "PUE", v1: "1.45", v2: "1.15" },
                      { label: "Density", v1: "15 kW/rack", v2: "45 kW/rack" },
                      { label: "Cooling Load", v1: "850 kW", v2: "250 kW" },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between text-sm py-2 border-b border-muted">
                        <span className="text-muted-foreground w-1/3">{row.label}</span>
                        <span className="w-1/3 text-right font-mono">{row.v1}</span>
                        <span className="w-1/3 text-right font-mono font-bold text-primary">{row.v2}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground border-y border-primary-foreground/20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">Ready to build the future?</h2>
            <p className="text-xl opacity-90 mb-10">
              Join top data center engineers using RackScale to model multi-million dollar infrastructure.
            </p>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold" data-testid="btn-bottom-cta">
                Access RackScale
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t bg-card text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <RackIcon size={20} />
            <span className="font-bold tracking-tight">RackScale</span>
          </div>
          <div className="text-sm">
            &copy; {new Date().getFullYear()} RackScale Systems. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
