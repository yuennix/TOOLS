import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/hooks/use-toast";
import { ThemeProvider } from "@/hooks/use-theme";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ResetLink from "@/pages/reset-link";
import ResetPass from "@/pages/reset-pass";
import Admin from "@/pages/admin";
import Navbar from "@/components/Navbar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function VisitTracker() {
  useEffect(() => { fetch("/api/track-visit", { method: "POST" }).catch(() => {}); }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" component={Admin} />
      <Route path="/" component={Home} />
      <Route path="/reset-link" component={ResetLink} />
      <Route path="/reset-pass" component={ResetPass} />
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
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: "var(--surface)" }}>
                <div className="scanline-bar" />
                <VisitTracker />
                <Navbar />
                <main className="flex-1">
                  <Router />
                </main>
              </div>
            </WouterRouter>
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
