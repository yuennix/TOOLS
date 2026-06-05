import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/hooks/use-toast";
import { ThemeProvider } from "@/hooks/use-theme";
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

function isAccessValid() {
  if (localStorage.getItem("weyn-access") !== "1") return false;
  const expiry = localStorage.getItem("weyn-key-expiry");
  if (expiry && new Date() > new Date(expiry)) return false;
  return true;
}

function clearAccess() {
  localStorage.removeItem("weyn-access");
  localStorage.removeItem("weyn-key-expiry");
}

function KeyGuard({ children }: { children: React.ReactNode }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isAccessValid()) {
    clearAccess();
    return <Redirect to="/access" />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/access" component={Access} />
      <Route path="/admin" component={Admin} />
      <Route path="/">
        <KeyGuard><Home /></KeyGuard>
      </Route>
      <Route path="/reset-link">
        <KeyGuard><ResetLink /></KeyGuard>
      </Route>
      <Route path="/reset-pass">
        <KeyGuard><ResetPass /></KeyGuard>
      </Route>
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
