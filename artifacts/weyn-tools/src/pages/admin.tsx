import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Key {
  id: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
  used: boolean;
  usedAt: string | null;
}

const EXPIRY_PRESETS = [
  { label: "1 Hour", hours: 1 },
  { label: "6 Hours", hours: 6 },
  { label: "24 Hours", hours: 24 },
  { label: "7 Days", hours: 168 },
  { label: "30 Days", hours: 720 },
  { label: "No Expiry", hours: null },
];

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-password": "yuennix",
  };
}

function keyStatus(k: Key): { label: string; color: string } {
  if (k.used) return { label: "USED", color: "#888" };
  if (k.expiresAt && new Date() > new Date(k.expiresAt))
    return { label: "EXPIRED", color: "#ef4444" };
  return { label: "ACTIVE", color: "#22c55e" };
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function Admin() {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("weyn-admin") === "1");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [keys, setKeys] = useState<Key[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  const [genLoading, setGenLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch("/api/admin/keys", { headers: adminHeaders() });
      const data = await res.json();
      setKeys((data.keys ?? []).slice().reverse());
    } catch {
      toast({ title: "Error", description: "Failed to load keys", variant: "destructive" });
    } finally {
      setKeysLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authed) loadKeys();
  }, [authed, loadKeys]);

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

  async function generateKey() {
    let expiresAt: string | null = null;

    if (selectedPreset !== null) {
      const preset = EXPIRY_PRESETS[selectedPreset];
      if (preset.hours !== null) {
        expiresAt = new Date(Date.now() + preset.hours * 3600 * 1000).toISOString();
      }
    } else if (customDate) {
      expiresAt = new Date(customDate).toISOString();
    }

    setGenLoading(true);
    setNewKey(null);
    try {
      const res = await fetch("/api/admin/keys/generate", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ expiresAt }),
      });
      const data = await res.json();
      setNewKey(data.key.key);
      await loadKeys();
    } catch {
      toast({ title: "Error", description: "Failed to generate key", variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  }

  async function deleteKey(id: string) {
    try {
      await fetch(`/api/admin/keys/${id}`, { method: "DELETE", headers: adminHeaders() });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: "Deleted", description: "Key removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }

  function copyKey(k: string) {
    navigator.clipboard.writeText(k).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--surface)" }}>
        <div className="w-full max-w-xs space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-mono text-2xl font-bold tracking-widest animate-red-breathe">ADMIN</h1>
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>WEYN TOOLS — RESTRICTED</p>
          </div>
          <div className="p-6 space-y-4" style={{ border: "1px solid var(--line)", borderRadius: "8px" }}>
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Password</label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setPwError(""); }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm font-mono transition-all duration-200"
                  style={{
                    border: pwError ? "1px solid #ef4444" : "1px solid var(--line)",
                    borderRadius: "6px",
                    background: "var(--surface-2)",
                    color: "var(--text-primary)",
                  }}
                />
                {pwError && <p className="text-xs" style={{ color: "#ef4444" }}>✗ {pwError}</p>}
              </div>
              <LoginBtn loading={pwLoading} />
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono tracking-widest" style={{ color: "var(--red-accent)" }}>ADMIN PANEL</p>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Key Management</h1>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem("weyn-admin"); setAuthed(false); }}
          className="text-xs font-mono px-3 py-1.5 border transition-colors"
          style={{ border: "1px solid var(--line)", color: "var(--text-muted)", borderRadius: "4px" }}
        >
          LOGOUT
        </button>
      </div>

      {/* Generate key */}
      <div className="p-6 space-y-4" style={{ border: "1px solid var(--line)", borderRadius: "8px", background: "var(--surface)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Generate New Key</p>

        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Expiration</p>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setSelectedPreset(i); setCustomDate(""); }}
                className="px-3 py-1 text-xs font-mono transition-all duration-150"
                style={{
                  border: `1px solid ${selectedPreset === i ? "var(--red-accent)" : "var(--line)"}`,
                  borderRadius: "4px",
                  background: selectedPreset === i ? "var(--red-glow)" : "transparent",
                  color: selectedPreset === i ? "var(--red-accent)" : "var(--text-secondary)",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or custom date:</span>
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => { setCustomDate(e.target.value); setSelectedPreset(null); }}
              className="px-2 py-1 text-xs font-mono transition-all"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "4px",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>

        <GenBtn loading={genLoading} onClick={generateKey} disabled={selectedPreset === null && !customDate} />

        {newKey && (
          <div
            className="flex items-center justify-between p-3 mt-2"
            style={{ border: "1px solid var(--red-accent)", borderRadius: "6px", background: "var(--red-glow)" }}
          >
            <span className="font-mono text-sm tracking-widest" style={{ color: "var(--red-accent)" }}>{newKey}</span>
            <button
              onClick={() => copyKey(newKey)}
              className="text-xs font-mono px-2 py-1 transition-all"
              style={{
                border: "1px solid var(--red-accent)",
                borderRadius: "4px",
                color: "var(--red-accent)",
                background: "transparent",
              }}
            >
              {copied ? "COPIED!" : "COPY"}
            </button>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            All Keys <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>({keys.length})</span>
          </p>
          <button onClick={loadKeys} className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {keysLoading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {keys.length === 0 && !keysLoading && (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No keys generated yet</p>
        )}

        <div className="space-y-2">
          {keys.map((k) => {
            const status = keyStatus(k);
            return (
              <div
                key={k.id}
                className="flex items-center gap-3 p-3"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  opacity: k.used ? 0.5 : 1,
                }}
              >
                <span
                  className="text-xs font-mono shrink-0"
                  style={{ color: status.color }}
                >
                  ●
                </span>
                <span className="font-mono text-xs tracking-wider flex-1 min-w-0 truncate" style={{ color: "var(--text-primary)" }}>
                  {k.key}
                </span>
                <div className="hidden sm:flex flex-col items-end text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: status.color }} className="font-mono">{status.label}</span>
                  <span>{k.expiresAt ? `Exp: ${fmt(k.expiresAt)}` : "No expiry"}</span>
                </div>
                <button
                  onClick={() => copyKey(k.key)}
                  className="text-xs font-mono px-2 py-0.5 shrink-0 transition-all"
                  style={{ border: "1px solid var(--line)", borderRadius: "3px", color: "var(--text-muted)" }}
                >
                  COPY
                </button>
                <button
                  onClick={() => deleteKey(k.id)}
                  className="text-xs font-mono px-2 py-0.5 shrink-0 transition-all"
                  style={{ border: "1px solid #ef444433", borderRadius: "3px", color: "#ef4444" }}
                >
                  DEL
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoginBtn({ loading }: { loading: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "6px",
        border: "1px solid var(--red-accent)",
        background: loading ? "transparent" : hovered ? "var(--red-accent)" : "transparent",
        color: loading ? "var(--text-muted)" : hovered ? "#fff" : "var(--red-accent)",
        cursor: loading ? "not-allowed" : "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? "Verifying..." : "Login"}
    </button>
  );
}

function GenBtn({ loading, onClick, disabled }: { loading: boolean; onClick: () => void; disabled: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={onClick}
      className="px-5 py-2 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "6px",
        border: "1px solid var(--red-accent)",
        background: disabled ? "transparent" : loading ? "transparent" : hovered ? "var(--red-accent)" : "transparent",
        color: disabled ? "var(--text-muted)" : loading ? "var(--text-muted)" : hovered ? "#fff" : "var(--red-accent)",
        cursor: loading || disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? "Generating..." : "Generate Key"}
    </button>
  );
}
