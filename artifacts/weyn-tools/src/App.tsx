import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
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

function NameGate({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [done, setDone] = useState(() => !!localStorage.getItem("weyn-name"));
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (location === "/admin" || done) return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name"); return; }
    setLoading(true);
    setError("");
    try {
      await fetch("/api/register-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      localStorage.setItem("weyn-name", name.trim());
      setDone(true);
    } catch {
      setError("Something went wrong, try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "var(--surface)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-1">
          <span
            className="block font-mono text-2xl font-bold tracking-widest animate-red-breathe select-none"
            style={{ letterSpacing: "0.22em" }}
          >
            WEYN
          </span>
          <span className="block font-mono text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
            / TOOLS
          </span>
        </div>

        {/* Card */}
        <div
          className="p-6 space-y-5"
          style={{ border: "1px solid var(--line)", borderRadius: "12px", background: "var(--surface-2)" }}
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Enter your name
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              You only need to do this once.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Your name"
              autoFocus
              maxLength={50}
              className="w-full px-3 py-2.5 text-sm transition-all duration-200"
              style={{
                border: error ? "1px solid #ef4444" : "1px solid var(--line)",
                borderRadius: "8px",
                background: "var(--surface)",
                color: "var(--text-primary)",
                outline: "none",
              }}
              onFocus={(e) => { if (!error) e.target.style.borderColor = "var(--red-accent)"; }}
              onBlur={(e) => { if (!error) e.target.style.borderColor = "var(--line)"; }}
            />
            {error && (
              <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold transition-all duration-200"
              style={{
                borderRadius: "8px",
                border: "1.5px solid var(--red-accent)",
                background: loading ? "transparent" : "var(--red-accent)",
                color: loading ? "var(--text-muted)" : "#fff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
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
                <NameGate>
                  <Navbar />
                  <main className="flex-1">
                    <Router />
                  </main>
                </NameGate>
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
