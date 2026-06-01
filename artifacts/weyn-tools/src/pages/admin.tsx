import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Key {
  id: string;
  name: string | null;
  key: string;
  createdAt: string;
  expiresAt: string | null;
  used: boolean;
  usedAt: string | null;
}

interface KeyRequest {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  key: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

type Filter = "all" | "pending" | "approved" | "used" | "expired";

function adminHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-admin-password": sessionStorage.getItem("weyn-admin-pw") ?? "",
  };
}

function keyCategory(k: Key): "approved" | "used" | "expired" {
  if (k.used) return "used";
  if (k.expiresAt && new Date() > new Date(k.expiresAt)) return "expired";
  return "approved";
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function fmtShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    ", " + new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export default function Admin() {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("weyn-admin") === "1");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [keys, setKeys] = useState<Key[]>([]);
  const [requests, setRequests] = useState<KeyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, reqsRes] = await Promise.all([
        fetch("/api/admin/keys", { headers: adminHeaders() }),
        fetch("/api/admin/requests", { headers: adminHeaders() }),
      ]);
      const keysData = await keysRes.json();
      const reqsData = await reqsRes.json();
      setKeys((keysData.keys ?? []).slice().reverse());
      setRequests(reqsData.requests ?? []);
    } catch {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, loadAll]);

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

  async function approveRequest(id: string) {
    try {
      const res = await fetch(`/api/admin/requests/${id}/approve`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ expiresAt: null }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Approved", description: "Key generated and sent to user" });
      loadAll();
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    }
  }

  async function rejectRequest(id: string) {
    try {
      await fetch(`/api/admin/requests/${id}/reject`, { method: "POST", headers: adminHeaders() });
      toast({ title: "Rejected", description: "Request declined" });
      loadAll();
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    }
  }

  async function deleteKey(id: string) {
    try {
      await fetch(`/api/admin/keys/${id}`, { method: "DELETE", headers: adminHeaders() });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }

  async function deleteRequest(id: string) {
    try {
      await fetch(`/api/admin/requests/${id}`, { method: "DELETE", headers: adminHeaders() });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }

  function copyKey(id: string, keyStr: string) {
    navigator.clipboard.writeText(keyStr).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--surface)" }}>
        <div className="w-full max-w-xs space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>ADMIN PANEL</p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Access Keys</h1>
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

  const pendingReqs = requests.filter((r) => r.status === "pending");
  const approvedKeys = keys.filter((k) => keyCategory(k) === "approved");
  const usedKeys = keys.filter((k) => keyCategory(k) === "used");
  const expiredKeys = keys.filter((k) => keyCategory(k) === "expired");

  const stats = [
    { label: "PENDING", value: pendingReqs.length, color: "#f59e0b" },
    { label: "APPROVED", value: approvedKeys.length, color: "#22c55e" },
    { label: "USED", value: usedKeys.length, color: "var(--text-muted)" },
    { label: "EXPIRED", value: expiredKeys.length, color: "var(--text-muted)" },
  ];

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "ALL", count: pendingReqs.length + keys.length },
    { key: "pending", label: "PENDING", count: pendingReqs.length },
    { key: "approved", label: "APPROVED", count: approvedKeys.length },
    { key: "used", label: "USED", count: usedKeys.length },
    { key: "expired", label: "EXPIRED", count: expiredKeys.length },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono tracking-widest mb-1" style={{ color: "var(--red-accent)" }}>ADMIN PANEL</p>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Access Keys</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Link
            href="/access"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all"
            style={{ border: "1px solid var(--line)", borderRadius: "6px", color: "var(--text-muted)", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red-accent)"; e.currentTarget.style.color = "var(--red-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ACCESS PAGE
          </Link>
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
        {stats.map((s) => (
          <div
            key={s.label}
            className="p-4 space-y-1"
            style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)" }}
          >
            <p className="text-3xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 text-xs font-mono transition-all duration-150"
            style={{
              border: `1px solid ${filter === f.key ? "var(--red-accent)" : "var(--line)"}`,
              borderRadius: "6px",
              background: filter === f.key ? "var(--red-accent)" : "transparent",
              color: filter === f.key ? "#fff" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {f.key === "all" ? "ALL" : `${f.label} (${f.count})`}
          </button>
        ))}
        <button
          type="button"
          onClick={loadAll}
          className="ml-auto px-3 py-1.5 text-xs font-mono transition-all"
          style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {/* Pending requests */}
        {(filter === "all" || filter === "pending") && pendingReqs.map((r) => (
          <div
            key={r.id}
            className="p-4 space-y-3"
            style={{ border: "1px solid #f59e0b44", borderRadius: "10px", background: "var(--surface-2)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                <StatusBadge label="PENDING" color="#f59e0b" />
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Requested {fmtShort(r.createdAt)}
            </p>
            <div className="flex items-center gap-2">
              <ActionButton
                label="APPROVE"
                color="#22c55e"
                onClick={() => approveRequest(r.id)}
              />
              <ActionButton
                label="REJECT"
                color="#ef4444"
                onClick={() => rejectRequest(r.id)}
              />
              <ActionButton
                label="DELETE"
                color="var(--text-muted)"
                onClick={() => deleteRequest(r.id)}
              />
            </div>
          </div>
        ))}

        {/* Keys */}
        {keys
          .filter((k) => {
            if (filter === "all") return true;
            if (filter === "pending") return false;
            return keyCategory(k) === filter;
          })
          .map((k) => {
            const cat = keyCategory(k);
            const badgeMap = {
              approved: { label: "ACTIVE", color: "#22c55e" },
              used: { label: "USED", color: "var(--text-muted)" },
              expired: { label: "EXPIRED", color: "#ef4444" },
            };
            const badge = badgeMap[cat];
            return (
              <div
                key={k.id}
                className="p-4 space-y-2"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  background: "var(--surface-2)",
                  opacity: k.used ? 0.65 : 1,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {k.name ?? "—"}
                  </span>
                  <StatusBadge label={badge.label} color={badge.color} />
                </div>
                <p className="font-mono text-xs tracking-widest" style={{ color: "var(--text-secondary)" }}>
                  {k.key}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Created {fmtShort(k.createdAt)}
                  {k.expiresAt
                    ? ` · ${new Date() > new Date(k.expiresAt) ? "Expired" : "Expires"} ${fmtShort(k.expiresAt)}`
                    : " · No expiry"}
                </p>
                <div className="flex items-center gap-2">
                  {cat === "approved" && (
                    <ActionButton
                      label={copiedId === k.id ? "COPIED!" : "COPY"}
                      color="var(--text-secondary)"
                      onClick={() => copyKey(k.id, k.key)}
                    />
                  )}
                  <ActionButton
                    label="DELETE"
                    color="var(--text-muted)"
                    onClick={() => deleteKey(k.id)}
                  />
                </div>
              </div>
            );
          })}

        {/* Empty state */}
        {(filter === "pending" && pendingReqs.length === 0) && (
          <EmptyState label="No pending requests" />
        )}
        {(filter === "approved" && approvedKeys.length === 0) && (
          <EmptyState label="No active keys" />
        )}
        {(filter === "used" && usedKeys.length === 0) && (
          <EmptyState label="No used keys" />
        )}
        {(filter === "expired" && expiredKeys.length === 0) && (
          <EmptyState label="No expired keys" />
        )}
        {(filter === "all" && pendingReqs.length === 0 && keys.length === 0) && (
          <EmptyState label="No keys yet" />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-xs font-mono px-1.5 py-0.5"
      style={{ border: `1px solid ${color}44`, borderRadius: "4px", color, background: `${color}11` }}
    >
      {label}
    </span>
  );
}

function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 text-xs font-mono transition-all duration-150"
      style={{
        border: `1px solid ${hov ? color : "var(--line)"}`,
        borderRadius: "5px",
        color: hov ? color : "var(--text-muted)",
        background: "none",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>{label}</p>
  );
}

function LoginBtn({ loading }: { loading: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "8px",
        border: "1.5px solid var(--red-accent)",
        background: hov && !loading ? "var(--red-accent)" : "transparent",
        color: loading ? "var(--text-muted)" : hov ? "#fff" : "var(--red-accent)",
        cursor: loading ? "not-allowed" : "pointer",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {loading ? "Verifying..." : "Login"}
    </button>
  );
}
