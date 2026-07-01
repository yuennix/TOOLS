import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

function adminHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-admin-password": sessionStorage.getItem("weyn-admin-pw") ?? "",
  };
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Admin() {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("weyn-admin") === "1");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [visits, setVisits] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [userList, setUserList] = useState<{ name: string; registeredAt: number }[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { headers: adminHeaders() });
      const data = await res.json();
      setVisits(data.visits ?? 0);
      setUserCount(data.users ?? 0);
    } catch {
      toast({ title: "Error", description: "Failed to load stats", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => { if (authed) loadStats(); }, [authed, loadStats]);

  async function toggleUsers() {
    if (showUsers) { setShowUsers(false); return; }
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", { headers: adminHeaders() });
      const data = await res.json();
      setUserList(data.users ?? []);
      setShowUsers(true);
    } catch {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("weyn-admin", "1");
        sessionStorage.setItem("weyn-admin-pw", pw);
        setAuthed(true);
      } else {
        setPwError(data.error ?? "Wrong password");
      }
    } catch {
      setPwError("Connection error");
    } finally {
      setPwLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--surface)" }}>
        <div className="w-full max-w-xs space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>ADMIN PANEL</p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          </div>
          <div className="p-6 space-y-4" style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)" }}>
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Password</label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setPwError(""); }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm transition-all duration-200"
                  style={{
                    border: pwError ? "1px solid #ef4444" : "1px solid var(--line)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => { if (!pwError) e.target.style.borderColor = "var(--red-accent)"; }}
                  onBlur={(e) => { if (!pwError) e.target.style.borderColor = "var(--line)"; }}
                  autoComplete="current-password"
                />
                {pwError && <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {pwError}</p>}
              </div>
              <LoginBtn loading={pwLoading} />
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono tracking-widest mb-1" style={{ color: "var(--red-accent)" }}>ADMIN PANEL</p>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => { loadStats(); if (showUsers) { setShowUsers(false); } }}
            className="px-3 py-1.5 text-xs font-mono transition-all"
            style={{ border: "1px solid var(--line)", borderRadius: "6px", color: "var(--text-muted)", background: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red-accent)"; e.currentTarget.style.color = "var(--red-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            ↻ REFRESH
          </button>
          <button
            onClick={() => { sessionStorage.removeItem("weyn-admin"); sessionStorage.removeItem("weyn-admin-pw"); setAuthed(false); }}
            className="px-3 py-1.5 text-xs font-mono transition-all"
            style={{ border: "1px solid var(--line)", borderRadius: "6px", color: "var(--text-muted)", background: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">

        {/* Total Visits */}
        <div className="p-5 space-y-1"
          style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)" }}>
          <p className="text-4xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>
            {visits === null ? "—" : visits.toLocaleString()}
          </p>
          <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>TOTAL VISITS</p>
        </div>

        {/* Total Users — clickable */}
        <button
          type="button"
          onClick={toggleUsers}
          disabled={loadingUsers}
          className="p-5 space-y-1 text-left transition-all duration-150"
          style={{
            border: `1px solid ${showUsers ? "var(--red-accent)" : "var(--line)"}`,
            borderRadius: "10px",
            background: "var(--surface-2)",
            cursor: "pointer",
            outline: "none",
          }}
          onMouseEnter={(e) => { if (!showUsers) e.currentTarget.style.borderColor = "var(--red-accent)44"; }}
          onMouseLeave={(e) => { if (!showUsers) e.currentTarget.style.borderColor = "var(--line)"; }}
        >
          <p className="text-4xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>
            {loadingUsers ? "…" : userCount === null ? "—" : userCount.toLocaleString()}
          </p>
          <p className="text-xs font-mono tracking-widest flex items-center gap-1.5" style={{ color: showUsers ? "var(--red-accent)" : "var(--text-muted)" }}>
            TOTAL USERS
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: showUsers ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </p>
        </button>
      </div>

      {/* User list (toggled) */}
      {showUsers && (
        <div style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)", overflow: "hidden" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>
              REGISTERED USERS ({userList.length})
            </p>
          </div>
          {userList.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No users yet</p>
          ) : (
            <div>
              {userList.slice().reverse().map((u, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < userList.length - 1 ? "1px solid var(--line)" : "none" }}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{u.name}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{fmtDate(u.registeredAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoginBtn({ loading }: { loading: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="submit" disabled={loading}
      className="w-full py-2.5 text-sm font-semibold transition-all duration-200"
      style={{ borderRadius: "8px", border: "1.5px solid var(--red-accent)", background: hov && !loading ? "var(--red-accent)" : "transparent", color: loading ? "var(--text-muted)" : hov ? "#fff" : "var(--red-accent)", cursor: loading ? "not-allowed" : "pointer" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {loading ? "Verifying..." : "Login"}
    </button>
  );
}
