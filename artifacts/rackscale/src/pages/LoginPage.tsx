import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Server, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onLogin(values: FormValues) {
    setAuthError(null);
    setIsSubmitting(true);
    const { error } = await signIn(values.email, values.password);
    setIsSubmitting(false);
    if (error) {
      setAuthError(error);
    } else {
      setLocation("/dashboard");
    }
  }

  async function onSignUp(values: FormValues) {
    setAuthError(null);
    setIsSubmitting(true);
    const { error } = await signUp(values.email, values.password);
    setIsSubmitting(false);
    if (error) {
      setAuthError(error);
    } else {
      setAuthError(null);
      setSignUpSuccess(true);
      setActiveTab("login");
      form.reset();
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Server className="h-8 w-8" />
            <span className="text-3xl font-bold tracking-tight text-foreground">RackScale</span>
          </div>
        </div>

        <Card className="shadow-lg border-muted">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAuthError(null); setSignUpSuccess(false); }} className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
              </TabsList>
              <CardTitle className="text-2xl text-center">
                {activeTab === "login" ? "Welcome back" : "Create an account"}
              </CardTitle>
              <CardDescription className="text-center">
                {activeTab === "login"
                  ? "Enter your credentials to access the command center."
                  : "Start designing precision data centers today."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {signUpSuccess && activeTab === "login" && (
                <Alert className="mb-4 border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400" data-testid="signup-success">
                    Account created! Check your email to confirm, then log in.
                  </AlertDescription>
                </Alert>
              )}
              {authError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription data-testid="auth-error">{authError}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="mt-0">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Corporate Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="engineer@company.com"
                              autoComplete="email"
                              {...field}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="current-password"
                              {...field}
                              data-testid="input-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                      data-testid="btn-submit-login"
                    >
                      {isSubmitting ? "Authenticating..." : "Access System"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSignUp)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Corporate Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="engineer@company.com"
                              autoComplete="email"
                              {...field}
                              data-testid="input-signup-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              {...field}
                              data-testid="input-signup-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                      data-testid="btn-submit-signup"
                    >
                      {isSubmitting ? "Creating account..." : "Initialize Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Engineering-grade modeling software. <br />
          <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a>
          {" "}&bull;{" "}
          <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
