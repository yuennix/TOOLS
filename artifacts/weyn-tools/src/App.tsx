import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
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

function hasAccess() {
  return sessionStorage.getItem("weyn-access") === "1";
}

function KeyGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  if (!hasAccess()) {
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
