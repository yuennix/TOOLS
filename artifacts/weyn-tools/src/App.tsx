import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/hooks/use-toast";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ResetLink from "@/pages/reset-link";
import ResetPass from "@/pages/reset-pass";
import Access from "@/pages/access";
import Admin from "@/pages/admin";
import Navbar from "@/components/Navbar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { session } = useAuth();
  if (!session) return <Redirect to="/access" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/access" component={Access} />
      <Route path="/admin" component={Admin} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/reset-link" component={() => <ProtectedRoute component={ResetLink} />} />
      <Route path="/reset-pass" component={() => <ProtectedRoute component={ResetPass} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider>
          <ThemeProvider>
            <AuthProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: "var(--surface)" }}>
                  <div className="scanline-bar" />
                  <Navbar />
                  <main className="flex-1">
                    <Router />
                  </main>
                </div>
              </WouterRouter>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
