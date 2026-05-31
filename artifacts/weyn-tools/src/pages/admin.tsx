import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_TOKEN_KEY = "weyn_admin_token";

function getToken() { return localStorage.getItem(ADMIN_TOKEN_KEY); }
function setToken(t: string) { localStorage.setItem(ADMIN_TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(ADMIN_TOKEN_KEY); }

type KeyStatus = "pending" | "approved" | "used" | "expired";

interface AccessKey {
  id: string;
  name: string;
  key: string;
  status: KeyStatus;
  expiresAt: number | null;
  createdAt: number;
  approvedAt: number | null;
  usedAt: number | null;
}

const EXPIRY_OPTIONS = [
  { label: "1 Hour", hours: 1 },
  { label: "6 Hours", hours: 6 },
  { label: "12 Hours", hours: 12 },
  { label: "24 Hours", hours: 24 },
  { label: "3 Days", hours: 72 },
  { label: "7 Days", hours: 168 },
  { label: "30 Days", hours: 720 },
];

const STATUS_COLOR: Record<KeyStatus, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  used: "var(--text-muted)",
  expired: "var(--text-muted)",
};

export default function Admin() {
  const [token, setTokenState] = useState<string | null>(getToken);
  if (!token) return <AdminLogin onLogin={(t) => { setToken(t); setTokenState(t); }} />;
  return <AdminPanel token={token} onLogout={() => { clearToken(); setTokenState(null); }} />;
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.token) {
        onLogin(data.token);
      } else {
        toast({ title: "Access denied", description: "Wrong password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-up">
        <div className="text-center space-y-1">
          <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>ADMIN PANEL</p>
          <h1 className="text-2xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>WEYN / ADMIN</h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4"
          style={{ border: "1px solid var(--line)", borderRadius: "8px", background: "var(--surface)" }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              className="w-full px-3 py-2.5 text-sm font-mono transition-all duration-200"
              style={{ border: "1px solid var(--line)", borderRadius: "6px", background: "var(--surface-2)", color: "var(--text-primary)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--red-glow)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold transition-all duration-200"
            style={{
              borderRadius: "6px",
              border: "1px solid var(--red-accent)",
              background: hovered && !loading ? "var(--red-accent)" : "transparent",
              color: hovered && !loading ? "#fff" : loading ? "var(--text-muted)" : "var(--red-accent)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminPanel({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [filter, setFilter] = useState<KeyStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<AccessKey | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/keys", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      toast({ title: "Error", description: "Failed to load keys", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, onLogout, toast]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleDelete(id: string) {
    await fetch(`/api/admin/keys/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    toast({ title: "Deleted", description: "Key removed" });
    fetchKeys();
  }

  async function handleApprove(id: string, hours: number) {
    const res = await fetch(`/api/admin/keys/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ expiresInHours: hours }),
    });
    if (res.ok) {
      toast({ title: "Approved", description: `Key approved, expires in ${hours}h` });
      setApproveTarget(null);
      fetchKeys();
    } else {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    }
  }

  const filtered = filter === "all" ? keys : keys.filter((k) => k.status === filter);
  const counts = {
    all: keys.length,
    pending: keys.filter((k) => k.status === "pending").length,
    approved: keys.filter((k) => k.status === "approved").length,
    used: keys.filter((k) => k.status === "used").length,
    expired: keys.filter((k) => k.status === "expired").length,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {approveTarget && (
        <ApproveModal
          target={approveTarget}
          onApprove={(hours) => handleApprove(approveTarget.id, hours)}
          onClose={() => setApproveTarget(null)}
        />
      )}

      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>ADMIN PANEL</p>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Access Keys</h1>
        </div>
        <button
          onClick={onLogout}
          className="text-xs font-mono px-3 py-1.5 transition-colors"
          style={{ border: "1px solid var(--line)", borderRadius: "4px", color: "var(--text-muted)", background: "transparent", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red-accent)"; e.currentTarget.style.color = "var(--red-accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          LOGOUT
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up">
        {(["pending", "approved", "used", "expired"] as KeyStatus[]).map((s) => (
          <div key={s} className="p-4 space-y-1" style={{ border: "1px solid var(--line)", borderRadius: "8px", background: "var(--surface)" }}>
            <p className="text-2xl font-bold font-mono" style={{ color: STATUS_COLOR[s] }}>{counts[s]}</p>
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{s}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4 animate-fade-up">
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "used", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 text-xs font-mono uppercase tracking-widest rounded transition-all"
              style={{
                border: `1px solid ${filter === f ? "var(--red-accent)" : "var(--line)"}`,
                background: filter === f ? "var(--red-accent)" : "transparent",
                color: filter === f ? "#fff" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {f} {f !== "all" && `(${counts[f]})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>No keys found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((k) => (
              <KeyCard
                key={k.id}
                accessKey={k}
                onApprove={() => setApproveTarget(k)}
                onDelete={() => handleDelete(k.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyCard({ accessKey: k, onApprove, onDelete }: { accessKey: AccessKey; onApprove: () => void; onDelete: () => void }) {
  const now = Date.now();
  const expiryLabel = k.expiresAt
    ? k.expiresAt < now
      ? "Expired"
      : `Expires ${new Date(k.expiresAt).toLocaleString()}`
    : "—";

  return (
    <div
      className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ border: "1px solid var(--line)", borderRadius: "8px", background: "var(--surface)" }}
    >
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{k.name}</span>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{ background: "var(--surface-2)", color: STATUS_COLOR[k.status], border: `1px solid ${STATUS_COLOR[k.status]}` }}
          >
            {k.status.toUpperCase()}
          </span>
        </div>
        <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>{k.key}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Created {new Date(k.createdAt).toLocaleString()} · {expiryLabel}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {k.status === "pending" && (
          <ActionBtn label="APPROVE" accent onClick={onApprove} />
        )}
        <ActionBtn label="DELETE" onClick={onDelete} />
      </div>
    </div>
  );
}

function ActionBtn({ label, accent, onClick }: { label: string; accent?: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-mono transition-all duration-200"
      style={{
        border: `1px solid ${accent ? "var(--red-accent)" : "var(--line)"}`,
        borderRadius: "4px",
        background: hovered ? (accent ? "var(--red-accent)" : "var(--surface-2)") : "transparent",
        color: hovered ? (accent ? "#fff" : "var(--text-primary)") : accent ? "var(--red-accent)" : "var(--text-muted)",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

function ApproveModal({ target, onApprove, onClose }: { target: AccessKey; onApprove: (hours: number) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<number>(24);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  function confirm() {
    const hours = useCustom ? parseFloat(custom) : selected;
    if (!hours || hours <= 0) return;
    onApprove(hours);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6 space-y-5"
        style={{ border: "1px solid var(--red-accent)", borderRadius: "10px", background: "var(--surface)", boxShadow: "0 0 32px var(--red-glow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>APPROVE KEY</p>
          <p className="text-base font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{target.name}</p>
          <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{target.key}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Expires after</p>
          <div className="grid grid-cols-3 gap-2">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                onClick={() => { setSelected(opt.hours); setUseCustom(false); }}
                className="py-2 text-xs font-mono rounded transition-all"
                style={{
                  border: `1px solid ${!useCustom && selected === opt.hours ? "var(--red-accent)" : "var(--line)"}`,
                  background: !useCustom && selected === opt.hours ? "var(--red-accent)" : "transparent",
                  color: !useCustom && selected === opt.hours ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className="py-2 text-xs font-mono rounded transition-all"
              style={{
                border: `1px solid ${useCustom ? "var(--red-accent)" : "var(--line)"}`,
                background: useCustom ? "var(--red-accent)" : "transparent",
                color: useCustom ? "#fff" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Custom
            </button>
          </div>
          {useCustom && (
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Hours (e.g. 48)"
              autoFocus
              className="w-full px-3 py-2 text-sm font-mono"
              style={{ border: "1px solid var(--red-accent)", borderRadius: "6px", background: "var(--surface-2)", color: "var(--text-primary)" }}
            />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-mono transition-colors"
            style={{ border: "1px solid var(--line)", borderRadius: "6px", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={{ border: "1px solid var(--red-accent)", borderRadius: "6px", background: "var(--red-accent)", color: "#fff", cursor: "pointer" }}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
