import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

function isAccessValid() {
  if (localStorage.getItem("weyn-access") !== "1") return false;
  const expiry = localStorage.getItem("weyn-key-expiry");
  if (expiry && new Date() > new Date(expiry)) {
    localStorage.removeItem("weyn-access");
    localStorage.removeItem("weyn-key-expiry");
    return false;
  }
  return true;
}

export default function Access() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAccessValid()) setLocation("/");
  }, [setLocation]);

  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        localStorage.setItem("weyn-access", "1");
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
            Enter the access key provided by the admin.
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

        {/* Enter key card */}
        <div
          className="p-5 space-y-4"
          style={{ border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface-2)" }}
        >
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
            <ActionBtn loading={loading} />
          </form>
        </div>

      </div>
    </div>
  );
}

function ActionBtn({ loading }: { loading: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 text-sm font-semibold transition-all duration-200"
      style={{
        borderRadius: "8px",
        border: "1.5px solid var(--red-accent)",
        background: loading ? "transparent" : hovered ? "var(--red-accent)" : "transparent",
        color: loading ? "var(--text-muted)" : hovered ? "#ffffff" : "var(--red-accent)",
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
          Validating...
        </span>
      ) : "Validate Key"}
    </button>
  );
}
