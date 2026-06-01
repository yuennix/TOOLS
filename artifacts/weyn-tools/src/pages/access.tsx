import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Tab = "enter" | "generate";

export default function Access() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("generate");

  // Enter tab
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate tab
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedName, setGeneratedName] = useState("");
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
        if (data.expiresAt) {
          localStorage.setItem("weyn-key-expiry", data.expiresAt);
        } else {
          localStorage.removeItem("weyn-key-expiry");
        }
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
    if (!name.trim()) { setNameError("Name is required"); return; }
    setGenLoading(true);
    setNameError("");
    try {
      const res = await fetch("/api/auth/request-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setGeneratedKey(data.key);
        setGeneratedName(data.name);
        setCopied(false);
      } else {
        setNameError(data.error ?? "Failed to generate key");
      }
    } catch {
      setNameError("Connection error. Try again.");
    } finally {
      setGenLoading(false);
    }
  }

  function copyKey() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function resetGenerate() {
    setGeneratedKey(null);
    setGeneratedName("");
    setName("");
    setNameError("");
    setCopied(false);
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
          style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}
        >
          {(["enter", "generate"] as Tab[]).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-3 text-xs font-mono tracking-[0.15em] uppercase font-semibold transition-all duration-150"
              style={{
                background: tab === t ? "var(--red-accent)" : "transparent",
                color: tab === t ? "#fff" : "var(--text-muted)",
                border: "none",
                borderLeft: i === 1 ? "1px solid var(--line)" : "none",
                cursor: "pointer",
              }}
            >
              {t === "enter" ? "ENTER KEY" : "GENERATE KEY"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div
          className="p-5 space-y-4"
          style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)" }}
        >
          {/* ── ENTER KEY tab ── */}
          {tab === "enter" && (
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
                {error && <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {error}</p>}
              </div>
              <ActionBtn loading={loading} label="Validate Key" />
            </form>
          )}

          {/* ── GENERATE KEY tab ── */}
          {tab === "generate" && !generatedKey && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 text-sm transition-all duration-200"
                  style={{
                    border: nameError ? "1px solid #ef4444" : "1px solid var(--line)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => { if (!nameError) e.target.style.borderColor = "var(--red-accent)"; }}
                  onBlur={(e) => { if (!nameError) e.target.style.borderColor = "var(--line)"; }}
                  autoComplete="off"
                />
                {nameError && <p className="text-xs font-mono" style={{ color: "#ef4444" }}>✗ {nameError}</p>}
              </div>
              <ActionBtn loading={genLoading} label="Generate Key" />
            </form>
          )}

          {/* ── Generated key result ── */}
          {tab === "generate" && generatedKey && (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Key generated for{" "}
                  <span style={{ color: "var(--red-accent)" }}>{generatedName}</span>
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Save this key — you'll need it to access the tools once approved.
                </p>
              </div>

              {/* Key box */}
              <div
                className="flex items-center gap-2 px-3 py-3"
                style={{ border: "1.5px solid var(--red-accent)", borderRadius: "8px", background: "var(--surface)" }}
              >
                <span
                  className="font-mono text-sm tracking-widest flex-1 select-all break-all"
                  style={{ color: "var(--red-accent)" }}
                >
                  {generatedKey}
                </span>
                <button
                  type="button"
                  onClick={copyKey}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-mono font-semibold transition-all"
                  style={{
                    border: "1px solid var(--red-accent)",
                    borderRadius: "5px",
                    background: copied ? "var(--red-accent)" : "transparent",
                    color: copied ? "#fff" : "var(--red-accent)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copied ? "✓" : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                  {copied ? "COPIED" : "COPY"}
                </button>
              </div>

              {/* Pending notice */}
              <div
                className="p-3 space-y-1"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  background: "var(--surface)",
                }}
              >
                <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--red-accent)" }}>!</span>{" "}
                  Your key is pending admin approval. Once approved, enter it in the "Enter Key" tab to access the tools. Each key works once only.
                </p>
              </div>

              {/* Generate another */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={resetGenerate}
                  className="text-sm transition-colors duration-150"
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  Generate another key
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ActionBtn({ loading, label }: { loading: boolean; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "8px",
        border: "1.5px solid var(--red-accent)",
        background: "transparent",
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
