import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Tab = "enter" | "generate";

export default function Access() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("enter");

  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [genPw, setGenPw] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleEnter(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem("weyn-access", "1");
        toast({ title: "Access Granted", description: "Welcome to WEYN Tools" });
        setLocation("/");
      } else {
        setError(data.error ?? "Invalid key");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genPw.trim()) return;
    setGenLoading(true);
    setGenError("");
    setGeneratedKey(null);
    try {
      const res = await fetch("/api/admin/keys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": genPw,
        },
        body: JSON.stringify({ expiresAt: null }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setGeneratedKey(data.key.key);
        setCopied(false);
      } else {
        setGenError(data.error ?? "Wrong password");
      }
    } catch {
      setGenError("Connection error. Try again.");
    } finally {
      setGenLoading(false);
    }
  }

  function copyGenerated() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--surface)" }}
    >
      <div className="w-full max-w-sm space-y-6">

        {/* Hero */}
        <div className="text-center space-y-2">
          <p className="text-xs font-mono tracking-[0.25em] uppercase" style={{ color: "var(--red-accent)" }}>
            ACCESS REQUIRED
          </p>
          <h1
            className="font-sans text-5xl font-bold tracking-widest"
            style={{ color: "var(--text-primary)", letterSpacing: "0.15em" }}
          >
            WEYN
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Enter your access key or generate a new one below.
          </p>
        </div>

        {/* Admin panel link */}
        <div className="text-center">
          <Link
            href="/admin"
            className="text-xs font-mono tracking-[0.2em] uppercase transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            ADMIN PANEL →
          </Link>
        </div>

        {/* Tab switcher */}
        <div
          className="flex"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "8px",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <button
            type="button"
            onClick={() => { setTab("enter"); setError(""); }}
            className="flex-1 py-3 text-xs font-mono tracking-[0.15em] uppercase font-semibold transition-all duration-150"
            style={{
              background: tab === "enter" ? "var(--red-accent)" : "transparent",
              color: tab === "enter" ? "#fff" : "var(--text-muted)",
              border: "none",
              borderRadius: 0,
              cursor: "pointer",
            }}
          >
            ENTER KEY
          </button>
          <button
            type="button"
            onClick={() => { setTab("generate"); setGenError(""); setGeneratedKey(null); }}
            className="flex-1 py-3 text-xs font-mono tracking-[0.15em] uppercase font-semibold transition-all duration-150"
            style={{
              background: tab === "generate" ? "var(--red-accent)" : "transparent",
              color: tab === "generate" ? "#fff" : "var(--text-muted)",
              border: "none",
              borderLeft: "1px solid var(--line)",
              borderRadius: 0,
              cursor: "pointer",
            }}
          >
            GENERATE KEY
          </button>
        </div>

        {/* Card */}
        <div
          className="p-5 space-y-4"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "10px",
            background: "var(--surface-2)",
          }}
        >
          {tab === "enter" ? (
            <form onSubmit={handleEnter} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Access Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => { setKey(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="WEYN-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 font-mono text-sm tracking-widest transition-all duration-200"
                  style={{
                    border: error ? "1px solid #ef4444" : "1px solid var(--line)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => { if (!error) e.target.style.borderColor = "var(--red-accent)"; }}
                  onBlur={(e) => { if (!error) e.target.style.borderColor = "var(--line)"; }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {error && (
                  <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {error}</p>
                )}
              </div>

              <ValidateBtn loading={loading} label="Validate Key" />
            </form>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Admin Password
                </label>
                <input
                  type="password"
                  value={genPw}
                  onChange={(e) => { setGenPw(e.target.value); setGenError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 text-sm transition-all duration-200"
                  style={{
                    border: genError ? "1px solid #ef4444" : "1px solid var(--line)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => { if (!genError) e.target.style.borderColor = "var(--red-accent)"; }}
                  onBlur={(e) => { if (!genError) e.target.style.borderColor = "var(--line)"; }}
                  autoComplete="off"
                />
                {genError && (
                  <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {genError}</p>
                )}
              </div>

              <ValidateBtn loading={genLoading} label="Generate Key" />

              {generatedKey && (
                <div
                  className="flex items-center justify-between p-3 mt-1"
                  style={{ border: "1px solid var(--red-accent)", borderRadius: "8px", background: "var(--red-glow)" }}
                >
                  <span className="font-mono text-xs tracking-widest flex-1 mr-2 select-all" style={{ color: "var(--red-accent)" }}>
                    {generatedKey}
                  </span>
                  <button
                    type="button"
                    onClick={copyGenerated}
                    className="text-xs font-mono px-2 py-1 shrink-0"
                    style={{ border: "1px solid var(--red-accent)", borderRadius: "4px", color: "var(--red-accent)", background: "transparent" }}
                  >
                    {copied ? "COPIED!" : "COPY"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  );
}

function ValidateBtn({ loading, label }: { loading: boolean; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "8px",
        border: "1.5px solid var(--red-accent)",
        background: loading ? "transparent" : hovered ? "transparent" : "transparent",
        color: loading ? "var(--text-muted)" : "var(--red-accent)",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: hovered && !loading ? "0 0 10px var(--red-glow-strong)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--red-accent)", borderTopColor: "transparent" }} />
          {label === "Validate Key" ? "Validating..." : "Generating..."}
        </span>
      ) : label}
    </button>
  );
}
