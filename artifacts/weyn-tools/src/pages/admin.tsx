import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Key {
  id: string;
  name: string | null;
  key: string;
  createdAt: string;
  expiresAt: string | null;
  active: boolean;
  used: boolean;
  usedAt: string | null;
}

type Filter = "all" | "pending" | "approved" | "used" | "expired";
type ExpiryPreset = "1h" | "24h" | "72h" | "custom";
type CustomUnit = "minutes" | "hours";

function adminHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-admin-password": sessionStorage.getItem("weyn-admin-pw") ?? "",
  };
}

function keyCategory(k: Key): "pending" | "approved" | "used" | "expired" {
  if (!k.active) return "pending";
  if (k.expiresAt && new Date() > new Date(k.expiresAt)) return "expired";
  if (k.used) return "used";
  return "approved";
}

function fmtShort(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function computeExpiry(preset: ExpiryPreset, customVal: string, customUnit: CustomUnit): string | null {
  const now = new Date();
  if (preset === "1h")  { now.setHours(now.getHours() + 1);   return now.toISOString(); }
  if (preset === "24h") { now.setHours(now.getHours() + 24);  return now.toISOString(); }
  if (preset === "72h") { now.setHours(now.getHours() + 72);  return now.toISOString(); }
  if (preset === "custom") {
    const n = parseFloat(customVal);
    if (!n || n <= 0) return null;
    const ms = customUnit === "hours" ? n * 3600000 : n * 60000;
    return new Date(now.getTime() + ms).toISOString();
  }
  return null;
}

export default function Admin() {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("weyn-admin") === "1");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Expiry picker state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>("24h");
  const [customVal, setCustomVal] = useState("");
  const [customUnit, setCustomUnit] = useState<CustomUnit>("hours");
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Generate key panel
  const [genOpen, setGenOpen] = useState(false);
  const [genName, setGenName] = useState("");
  const [genPreset, setGenPreset] = useState<ExpiryPreset>("24h");
  const [genCustomVal, setGenCustomVal] = useState("");
  const [genCustomUnit, setGenCustomUnit] = useState<CustomUnit>("hours");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<{ key: string; expiresAt: string | null } | null>(null);
  const [genCopied, setGenCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/keys", { headers: adminHeaders() });
      const data = await res.json();
      setKeys((data.keys ?? []).slice().reverse());
    } catch {
      toast({ title: "Error", description: "Failed to load keys", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (authed) loadKeys(); }, [authed, loadKeys]);

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

  function openApprover(id: string) {
    setApprovingId(id);
    setExpiryPreset("24h");
    setCustomVal("");
    setCustomUnit("hours");
  }

  async function generateKey() {
    const expiresAt = computeExpiry(genPreset, genCustomVal, genCustomUnit);
    if (genPreset === "custom" && !expiresAt) {
      toast({ title: "Invalid duration", description: "Enter a positive number", variant: "destructive" });
      return;
    }
    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/admin/keys/generate", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ name: genName.trim() || null, expiresAt }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGenResult({ key: data.key.key, expiresAt: data.key.expiresAt });
      setGenCopied(false);
      loadKeys();
    } catch {
      toast({ title: "Error", description: "Failed to generate key", variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  }

  async function confirmApprove(id: string) {
    const expiresAt = computeExpiry(expiryPreset, customVal, customUnit);
    if (expiryPreset === "custom" && !expiresAt) {
      toast({ title: "Invalid duration", description: "Enter a positive number", variant: "destructive" });
      return;
    }
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/admin/keys/${id}/activate`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ expiresAt }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Approved", description: "Key is now active" });
      setApprovingId(null);
      loadKeys();
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    } finally {
      setConfirmLoading(false);
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

  const pending  = keys.filter((k) => keyCategory(k) === "pending");
  const approved = keys.filter((k) => keyCategory(k) === "approved");
  const used     = keys.filter((k) => keyCategory(k) === "used");
  const expired  = keys.filter((k) => keyCategory(k) === "expired");

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all",      label: "ALL",      count: keys.length },
    { key: "pending",  label: "PENDING",  count: pending.length },
    { key: "approved", label: "APPROVED", count: approved.length },
    { key: "used",     label: "USED",     count: used.length },
    { key: "expired",  label: "EXPIRED",  count: expired.length },
  ];

  const visible = filter === "all" ? keys : keys.filter((k) => keyCategory(k) === filter);

  const presets: { key: ExpiryPreset; label: string }[] = [
    { key: "1h",     label: "1 HOUR" },
    { key: "24h",    label: "24 HOURS" },
    { key: "72h",    label: "72 HOURS" },
    { key: "custom", label: "CUSTOM" },
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

      {/* Stats */}
      <div className="p-4 space-y-1"
        style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)" }}>
        <p className="text-3xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>{keys.length}</p>
        <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>TOTAL USERS</p>
      </div>

      {/* Generate Key panel */}
      <div style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)", overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => { setGenOpen((o) => !o); setGenResult(null); }}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>+ Generate New Key</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--text-muted)", transform: genOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {genOpen && (
          <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid var(--line)" }}>
            {/* Name input */}
            <div className="space-y-1.5 pt-3">
              <label className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>
                LABEL / USER NAME <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                placeholder="e.g. John"
                className="w-full px-3 py-2 text-sm transition-all"
                style={{ border: "1px solid var(--line)", borderRadius: "6px", background: "var(--surface)", color: "var(--text-primary)", outline: "none" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--red-accent)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--line)"; }}
              />
            </div>

            {/* Expiry presets */}
            <div className="space-y-2">
              <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>EXPIRY</p>
              <div className="flex flex-wrap gap-2">
                {(["1h", "24h", "72h", "custom"] as ExpiryPreset[]).map((p) => (
                  <button key={p} type="button" onClick={() => setGenPreset(p)}
                    className="px-3 py-1 text-xs font-mono transition-all duration-150"
                    style={{
                      border: `1px solid ${genPreset === p ? "var(--red-accent)" : "var(--line)"}`,
                      borderRadius: "5px",
                      background: genPreset === p ? "var(--red-accent)" : "transparent",
                      color: genPreset === p ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                    }}>
                    {p === "1h" ? "1 HOUR" : p === "24h" ? "24 HOURS" : p === "72h" ? "72 HOURS" : "CUSTOM"}
                  </button>
                ))}
              </div>

              {genPreset === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" value={genCustomVal}
                    onChange={(e) => setGenCustomVal(e.target.value)}
                    placeholder="e.g. 90"
                    className="w-28 px-3 py-1.5 text-xs font-mono transition-all"
                    style={{ border: "1px solid var(--line)", borderRadius: "6px", background: "var(--surface)", color: "var(--text-primary)", outline: "none" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--red-accent)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--line)"; }}
                  />
                  <div className="flex" style={{ border: "1px solid var(--line)", borderRadius: "6px", overflow: "hidden" }}>
                    {(["minutes", "hours"] as CustomUnit[]).map((u, i) => (
                      <button key={u} type="button" onClick={() => setGenCustomUnit(u)}
                        className="px-3 py-1.5 text-xs font-mono transition-all duration-150"
                        style={{
                          background: genCustomUnit === u ? "var(--red-accent)" : "transparent",
                          color: genCustomUnit === u ? "#fff" : "var(--text-muted)",
                          border: "none", borderLeft: i === 1 ? "1px solid var(--line)" : "none", cursor: "pointer",
                        }}>
                        {u === "minutes" ? "MINS" : "HRS"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={generateKey}
              disabled={genLoading || (genPreset === "custom" && (!genCustomVal || parseFloat(genCustomVal) <= 0))}
              className="px-4 py-2 text-xs font-mono font-semibold transition-all duration-150"
              style={{
                border: "1px solid var(--red-accent)",
                borderRadius: "6px",
                background: "var(--red-accent)",
                color: "#fff",
                cursor: genLoading ? "not-allowed" : "pointer",
                opacity: (genPreset === "custom" && (!genCustomVal || parseFloat(genCustomVal) <= 0)) ? 0.4 : 1,
              }}>
              {genLoading ? "Generating..." : "Generate Key"}
            </button>

            {/* Result */}
            {genResult && (
              <div className="space-y-2 p-3" style={{ border: "1.5px solid var(--red-accent)", borderRadius: "8px", background: "var(--surface)" }}>
                <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>KEY GENERATED</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm tracking-widest flex-1 break-all" style={{ color: "var(--red-accent)" }}>
                    {genResult.key}
                  </span>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(genResult.key); setGenCopied(true); setTimeout(() => setGenCopied(false), 2000); }}
                    className="shrink-0 px-2 py-1 text-xs font-mono transition-all"
                    style={{ border: "1px solid var(--red-accent)", borderRadius: "5px", background: genCopied ? "var(--red-accent)" : "transparent", color: genCopied ? "#fff" : "var(--red-accent)", cursor: "pointer" }}>
                    {genCopied ? "✓ COPIED" : "COPY"}
                  </button>
                </div>
                {genResult.expiresAt && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Expires: {fmtShort(genResult.expiresAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {filters.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 text-xs font-mono transition-all duration-150"
            style={{
              border: `1px solid ${filter === f.key ? "var(--red-accent)" : "var(--line)"}`,
              borderRadius: "6px",
              background: filter === f.key ? "var(--red-accent)" : "transparent",
              color: filter === f.key ? "#fff" : "var(--text-muted)",
              cursor: "pointer",
            }}>
            {f.key === "all" ? "ALL" : `${f.label} (${f.count})`}
          </button>
        ))}
        <button type="button" onClick={loadKeys}
          className="ml-auto text-xs font-mono transition-all"
          style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {/* Key list */}
      <div className="space-y-3">
        {visible.map((k) => {
          const cat = keyCategory(k);
          const badgeMap = {
            pending:  { label: "PENDING",  color: "#f59e0b" },
            approved: { label: "ACTIVE",   color: "#22c55e" },
            used:     { label: "USED",     color: "var(--text-muted)" },
            expired:  { label: "EXPIRED",  color: "#ef4444" },
          };
          const badge = badgeMap[cat];
          const isApproving = approvingId === k.id;

          return (
            <div key={k.id} className="p-4 space-y-2"
              style={{
                border: `1px solid ${cat === "pending" ? "#f59e0b33" : isApproving ? "var(--red-accent)44" : "var(--line)"}`,
                borderRadius: "10px",
                background: "var(--surface-2)",
                opacity: k.used ? 0.65 : 1,
                transition: "border-color 0.15s",
              }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {k.name ?? "—"}
                </span>
                <span className="text-xs font-mono px-1.5 py-0.5"
                  style={{ border: `1px solid ${badge.color}44`, borderRadius: "4px", color: badge.color, background: `${badge.color}11` }}>
                  {badge.label}
                </span>
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

              {/* Inline expiry picker */}
              {cat === "pending" && isApproving && (
                <div className="mt-1 pt-3 space-y-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>SET EXPIRY</p>

                  {/* Preset buttons */}
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button key={p.key} type="button"
                        onClick={() => setExpiryPreset(p.key)}
                        className="px-3 py-1 text-xs font-mono transition-all duration-150"
                        style={{
                          border: `1px solid ${expiryPreset === p.key ? "var(--red-accent)" : "var(--line)"}`,
                          borderRadius: "5px",
                          background: expiryPreset === p.key ? "var(--red-accent)" : "transparent",
                          color: expiryPreset === p.key ? "#fff" : "var(--text-muted)",
                          cursor: "pointer",
                        }}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom duration input */}
                  {expiryPreset === "custom" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                        placeholder="e.g. 90"
                        className="w-28 px-3 py-1.5 text-xs font-mono transition-all"
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "6px",
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "var(--red-accent)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--line)"; }}
                      />
                      <div className="flex" style={{ border: "1px solid var(--line)", borderRadius: "6px", overflow: "hidden" }}>
                        {(["minutes", "hours"] as CustomUnit[]).map((u, i) => (
                          <button key={u} type="button"
                            onClick={() => setCustomUnit(u)}
                            className="px-3 py-1.5 text-xs font-mono transition-all duration-150"
                            style={{
                              background: customUnit === u ? "var(--red-accent)" : "transparent",
                              color: customUnit === u ? "#fff" : "var(--text-muted)",
                              border: "none",
                              borderLeft: i === 1 ? "1px solid var(--line)" : "none",
                              cursor: "pointer",
                            }}>
                            {u === "minutes" ? "MINS" : "HRS"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm / Cancel */}
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => confirmApprove(k.id)}
                      disabled={confirmLoading || (expiryPreset === "custom" && (!customVal || parseFloat(customVal) <= 0))}
                      className="px-3 py-1 text-xs font-mono transition-all duration-150"
                      style={{
                        border: "1px solid #22c55e",
                        borderRadius: "5px",
                        color: "#22c55e",
                        background: "none",
                        cursor: confirmLoading ? "not-allowed" : "pointer",
                        opacity: (expiryPreset === "custom" && (!customVal || parseFloat(customVal) <= 0)) ? 0.4 : 1,
                      }}>
                      {confirmLoading ? "..." : "CONFIRM"}
                    </button>
                    <button type="button"
                      onClick={() => setApprovingId(null)}
                      className="px-3 py-1 text-xs font-mono transition-all duration-150"
                      style={{ border: "1px solid var(--line)", borderRadius: "5px", color: "var(--text-muted)", background: "none", cursor: "pointer" }}>
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons row */}
              <div className="flex items-center gap-2">
                {cat === "pending" && !isApproving && (
                  <Btn label="APPROVE" color="#22c55e" onClick={() => openApprover(k.id)} />
                )}
                {cat === "approved" && (
                  <Btn label={copiedId === k.id ? "COPIED!" : "COPY"} color="var(--text-secondary)" onClick={() => copyKey(k.id, k.key)} />
                )}
                <Btn label="DELETE" color="var(--text-muted)" onClick={() => deleteKey(k.id)} />
              </div>
            </div>
          );
        })}

        {visible.length === 0 && !loading && (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
            {filter === "pending" ? "No pending requests" :
             filter === "approved" ? "No active keys" :
             filter === "used" ? "No used keys" :
             filter === "expired" ? "No expired keys" : "No keys yet"}
          </p>
        )}
      </div>
    </div>
  );
}

function Btn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      className="px-3 py-1 text-xs font-mono transition-all duration-150"
      style={{ border: `1px solid ${hov ? color : "var(--line)"}`, borderRadius: "5px", color: hov ? color : "var(--text-muted)", background: "none", cursor: "pointer" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {label}
    </button>
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
